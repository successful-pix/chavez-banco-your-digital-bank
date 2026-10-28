-- Reserve funds for outgoing transfers while they await admin approval.
-- The balance debit and transaction insert run in the same database transaction.
CREATE OR REPLACE FUNCTION public.reserve_pending_outgoing_transfer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric(14,2);
  v_blocked boolean;
  v_kyc_status text;
BEGIN
  IF NEW.direction <> 'out' OR NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  IF NEW.amount IS NULL OR NEW.amount <= 0 OR NEW.amount <> round(NEW.amount, 2) THEN
    RAISE EXCEPTION 'Transfer amount must be a positive amount with at most two decimal places';
  END IF;

  SELECT balance, COALESCE(blocked, false), COALESCE(kyc_status, 'pending')
    INTO v_balance, v_blocked, v_kyc_status
    FROM public.profiles
   WHERE id = NEW.user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account profile not found';
  END IF;
  IF v_blocked THEN
    RAISE EXCEPTION 'This account is blocked';
  END IF;
  IF v_kyc_status <> 'approved' THEN
    RAISE EXCEPTION 'KYC approval is required before transferring';
  END IF;
  IF v_balance < NEW.amount THEN
    RAISE EXCEPTION 'Insufficient available balance';
  END IF;

  UPDATE public.profiles
     SET balance = balance - NEW.amount
   WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS transactions_reserve_pending_outgoing ON public.transactions;
CREATE TRIGGER transactions_reserve_pending_outgoing
BEFORE INSERT ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.reserve_pending_outgoing_transfer();

-- Users can submit only pending outgoing transfer requests themselves.
-- Admins retain the ability to create other transaction records from the admin panel.
DROP POLICY IF EXISTS "insert own transactions" ON public.transactions;
CREATE POLICY "submit pending outgoing transfers or admin transactions"
ON public.transactions
FOR INSERT TO authenticated
WITH CHECK (
  (auth.uid() = user_id AND direction = 'out' AND status = 'pending')
  OR public.has_role(auth.uid(), 'admin')
);

-- Resolve a pending transfer exactly once. Approving keeps the reserved debit;
-- rejecting restores the reserved amount in the same transaction.
CREATE OR REPLACE FUNCTION public.admin_resolve_pending_transfer(
  p_transaction_id uuid,
  p_status text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx public.transactions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  IF p_status NOT IN ('completed', 'rejected') THEN
    RAISE EXCEPTION 'Invalid transfer status';
  END IF;

  SELECT * INTO v_tx
    FROM public.transactions
   WHERE id = p_transaction_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found';
  END IF;
  IF v_tx.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending transfers can be resolved';
  END IF;

  UPDATE public.transactions
     SET status = p_status,
         approved_by = auth.uid(),
         approved_at = now(),
         rejection_reason = CASE WHEN p_status = 'rejected' THEN NULLIF(left(COALESCE(p_reason, ''), 300), '') ELSE NULL END
   WHERE id = p_transaction_id;

  IF p_status = 'rejected' AND v_tx.direction = 'out' THEN
    UPDATE public.profiles
       SET balance = balance + v_tx.amount
     WHERE id = v_tx.user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Account profile not found while refunding transfer';
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'status', p_status, 'refunded', (p_status = 'rejected' AND v_tx.direction = 'out'));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_resolve_pending_transfer(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_resolve_pending_transfer(uuid, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.reserve_pending_outgoing_transfer() FROM PUBLIC, anon, authenticated;
