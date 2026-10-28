-- Restrict new outgoing transfers to Chavez Banco users and credit the recipient on approval.
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS recipient_user_id uuid REFERENCES public.profiles(id);

CREATE OR REPLACE FUNCTION public.reserve_pending_outgoing_transfer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric(14,2);
  v_blocked boolean;
  v_recipient public.profiles%ROWTYPE;
BEGIN
  IF NEW.direction <> 'out' OR NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  IF NEW.amount IS NULL OR NEW.amount <= 0 OR NEW.amount <> round(NEW.amount, 2) THEN
    RAISE EXCEPTION 'Transfer amount must be a positive amount with at most two decimal places';
  END IF;

  IF NEW.type <> 'internal' THEN
    RAISE EXCEPTION 'Transfers are available only between Chavez Banco accounts';
  END IF;
  IF NULLIF(trim(NEW.recipient_account), '') IS NULL THEN
    RAISE EXCEPTION 'Enter the recipient Chavez Banco account number';
  END IF;

  SELECT * INTO v_recipient
    FROM public.profiles
   WHERE account_number = trim(NEW.recipient_account)
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recipient account not found at Chavez Banco';
  END IF;
  IF v_recipient.id = NEW.user_id THEN
    RAISE EXCEPTION 'You cannot transfer money to your own account';
  END IF;
  IF COALESCE(v_recipient.blocked, false) THEN
    RAISE EXCEPTION 'Recipient account is blocked and cannot receive transfers';
  END IF;

  NEW.recipient_user_id := v_recipient.id;
  NEW.recipient_account := v_recipient.account_number;
  NEW.recipient_name := v_recipient.full_name;
  NEW.recipient_bank := 'Chavez Banco';

  SELECT balance, COALESCE(blocked, false)
    INTO v_balance, v_blocked
    FROM public.profiles
   WHERE id = NEW.user_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sender account profile not found';
  END IF;
  IF v_blocked THEN
    RAISE EXCEPTION 'This account is blocked';
  END IF;
  IF v_balance < NEW.amount THEN
    RAISE EXCEPTION 'Insufficient available balance';
  END IF;

  UPDATE public.profiles SET balance = balance - NEW.amount WHERE id = NEW.user_id;
  NEW.balance_reserved := true;
  RETURN NEW;
END;
$$;

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

  SELECT * INTO v_tx FROM public.transactions WHERE id = p_transaction_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transfer not found'; END IF;
  IF v_tx.status <> 'pending' THEN RAISE EXCEPTION 'Only pending transfers can be resolved'; END IF;

  IF p_status = 'completed' AND v_tx.direction = 'out' THEN
    IF NOT v_tx.balance_reserved OR v_tx.type <> 'internal' OR v_tx.recipient_user_id IS NULL THEN
      RAISE EXCEPTION 'This transfer is not a valid reserved Chavez Banco internal transfer';
    END IF;
    IF v_tx.recipient_user_id = v_tx.user_id THEN
      RAISE EXCEPTION 'Sender and recipient accounts must be different';
    END IF;
    UPDATE public.profiles
       SET balance = balance + v_tx.amount
     WHERE id = v_tx.recipient_user_id AND COALESCE(blocked, false) = false;
    IF NOT FOUND THEN RAISE EXCEPTION 'Recipient Chavez Banco account is unavailable'; END IF;
  END IF;

  UPDATE public.transactions
     SET status = p_status,
         approved_by = auth.uid(),
         approved_at = now(),
         rejection_reason = CASE WHEN p_status = 'rejected' THEN NULLIF(left(COALESCE(p_reason, ''), 300), '') ELSE NULL END,
         balance_reserved = false
   WHERE id = p_transaction_id;

  IF p_status = 'rejected' AND v_tx.direction = 'out' AND v_tx.balance_reserved THEN
    UPDATE public.profiles SET balance = balance + v_tx.amount WHERE id = v_tx.user_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Account profile not found while refunding transfer'; END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'status', p_status,
    'refunded', (p_status = 'rejected' AND v_tx.direction = 'out' AND v_tx.balance_reserved),
    'recipient_credited', (p_status = 'completed' AND v_tx.direction = 'out' AND v_tx.recipient_user_id IS NOT NULL)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_resolve_pending_transfer(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_resolve_pending_transfer(uuid, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.reserve_pending_outgoing_transfer() FROM PUBLIC, anon, authenticated;
