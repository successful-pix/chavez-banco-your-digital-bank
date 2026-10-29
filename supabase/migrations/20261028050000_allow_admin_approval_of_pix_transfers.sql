-- Allow admins to approve reserved PIX requests as well as internal account transfers.
-- Both types reserve the sender's balance at submission and identify the recipient by profile ID.
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

  IF p_status = 'completed' AND v_tx.direction = 'out' THEN
    IF NOT v_tx.balance_reserved
       OR v_tx.type NOT IN ('internal', 'pix')
       OR v_tx.recipient_user_id IS NULL THEN
      RAISE EXCEPTION 'This transfer is not a valid reserved Chavez Banco transfer';
    END IF;
    IF v_tx.recipient_user_id = v_tx.user_id THEN
      RAISE EXCEPTION 'Sender and recipient accounts must be different';
    END IF;

    UPDATE public.profiles
       SET balance = balance + v_tx.amount
     WHERE id = v_tx.recipient_user_id
       AND COALESCE(blocked, false) = false;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Recipient Chavez Banco account is unavailable';
    END IF;
  END IF;

  UPDATE public.transactions
     SET status = p_status,
         approved_by = auth.uid(),
         approved_at = now(),
         rejection_reason = CASE WHEN p_status = 'rejected' THEN NULLIF(left(COALESCE(p_reason, ''), 300), '') ELSE NULL END,
         balance_reserved = false
   WHERE id = p_transaction_id;

  IF p_status = 'rejected' AND v_tx.direction = 'out' AND v_tx.balance_reserved THEN
    UPDATE public.profiles
       SET balance = balance + v_tx.amount
     WHERE id = v_tx.user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Account profile not found while refunding transfer';
    END IF;
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
