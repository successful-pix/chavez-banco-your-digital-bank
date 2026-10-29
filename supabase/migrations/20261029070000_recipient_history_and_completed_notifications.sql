-- Keep the recipient's ledger and notifications in sync with admin-approved transfers.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS notifications_transaction_id_idx
  ON public.notifications(transaction_id);

CREATE OR REPLACE FUNCTION public.execute_test_pix_transfer(
 p_lookup_type text,
 p_lookup_value text,
 p_amount numeric,
 p_description text default null
)
RETURNS TABLE(transaction_id uuid,recipient_name text,sender_balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=''
AS $$
DECLARE
 v_sender uuid:=auth.uid();
 v_s public.profiles%rowtype;
 v_r public.profiles%rowtype;
 v_amount numeric(14,2);
 v_tx uuid;
BEGIN
 IF v_sender IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF p_lookup_type NOT IN ('email','cpf') THEN RAISE EXCEPTION 'Unsupported PIX key type'; END IF;
 v_amount:=round(coalesce(p_amount,0),2);
 IF v_amount<=0 THEN RAISE EXCEPTION 'Enter a valid amount'; END IF;
 SELECT * INTO v_s FROM public.profiles WHERE id=v_sender FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Sender profile not found'; END IF;
 IF coalesce(v_s.blocked,false) THEN RAISE EXCEPTION 'Your account is blocked'; END IF;
 IF coalesce(v_s.kyc_status,'pending')<>'approved' THEN RAISE EXCEPTION 'KYC approval is required'; END IF;
 IF coalesce(v_s.balance,0)<v_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
 IF p_lookup_type='email' THEN
  SELECT * INTO v_r FROM public.profiles WHERE lower(email)=lower(btrim(p_lookup_value)) AND id<>v_sender LIMIT 1;
 ELSE
  SELECT * INTO v_r FROM public.profiles WHERE regexp_replace(coalesce(cpf,''),'[^0-9]','','g')=regexp_replace(btrim(p_lookup_value),'[^0-9]','','g') AND id<>v_sender LIMIT 1;
 END IF;
 IF NOT FOUND THEN RAISE EXCEPTION 'No matching Chavez Banco recipient was found'; END IF;
 IF coalesce(v_r.blocked,false) THEN RAISE EXCEPTION 'Recipient account is unavailable'; END IF;

 INSERT INTO public.transactions(
   user_id,type,direction,amount,status,description,
   recipient_name,recipient_account,recipient_bank,pix_key,
   recipient_user_id,balance_reserved
 )
 VALUES(
   v_sender,'pix','out',v_amount,'pending',
   nullif(btrim(coalesce(p_description,'')),''),
   v_r.full_name,v_r.account_number,'Chavez Banco',btrim(p_lookup_value),
   v_r.id,false
 ) RETURNING id INTO v_tx;

 INSERT INTO public.notifications(user_id,title,body,transaction_id) VALUES
 (v_sender,'Transfer pending approval','Your PIX transfer of '||v_amount::text||' BRL to '||coalesce(v_r.full_name,'Chavez Banco')||' is pending approval. No transfer has been completed.',v_tx),
 (v_r.id,'Incoming transfer pending approval','A PIX transfer of '||v_amount::text||' BRL is awaiting approval. It has not been credited to your balance.',v_tx);

 RETURN QUERY SELECT v_tx,v_r.full_name,
   (SELECT p.balance FROM public.profiles p WHERE p.id=v_sender);
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
  v_sender public.profiles%ROWTYPE;
  v_recipient public.profiles%ROWTYPE;
  v_incoming_tx uuid;
  v_body text;
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
    IF NOT v_tx.balance_reserved OR v_tx.type NOT IN ('internal', 'pix') OR v_tx.recipient_user_id IS NULL THEN
      RAISE EXCEPTION 'This transfer is not a valid reserved Chavez Banco transfer';
    END IF;
    IF v_tx.recipient_user_id = v_tx.user_id THEN
      RAISE EXCEPTION 'Sender and recipient accounts must be different';
    END IF;

    SELECT * INTO v_sender FROM public.profiles WHERE id = v_tx.user_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Sender account profile not found'; END IF;

    UPDATE public.profiles
       SET balance = balance + v_tx.amount
     WHERE id = v_tx.recipient_user_id AND COALESCE(blocked, false) = false
     RETURNING * INTO v_recipient;
    IF NOT FOUND THEN RAISE EXCEPTION 'Recipient Chavez Banco account is unavailable'; END IF;
  END IF;

  UPDATE public.transactions
     SET status = p_status,
         approved_by = auth.uid(),
         approved_at = now(),
         rejection_reason = CASE WHEN p_status = 'rejected' THEN NULLIF(left(COALESCE(p_reason, ''), 300), '') ELSE NULL END,
         balance_reserved = false
   WHERE id = p_transaction_id;

  IF p_status = 'completed' AND v_tx.direction = 'out' THEN
    -- The sender's row remains an outgoing entry; create a paired incoming entry
    -- owned by the recipient so it appears in their own account history.
    INSERT INTO public.transactions(
      user_id, type, direction, amount, status, description,
      sender_name, sender_account, sender_bank,
      recipient_name, recipient_account, recipient_bank, recipient_agencia,
      pix_key, recipient_user_id
    ) VALUES (
      v_tx.recipient_user_id, v_tx.type, 'in', v_tx.amount, 'completed',
      COALESCE(NULLIF(v_tx.description, ''), 'Transfer received from ' || COALESCE(v_sender.full_name, 'Chavez Banco')),
      v_sender.full_name, v_sender.account_number, 'Chavez Banco',
      v_recipient.full_name, v_recipient.account_number, 'Chavez Banco', v_recipient.agencia,
      v_tx.pix_key, NULL
    ) RETURNING id INTO v_incoming_tx;

    v_body := 'Your transfer of ' || v_tx.amount::text || ' BRL from ' ||
      COALESCE(v_sender.full_name, 'Chavez Banco') || ' has been approved and completed. The amount is now available in your balance.';
    UPDATE public.notifications
       SET title = 'Transfer completed',
           body = v_body,
           transaction_id = COALESCE(transaction_id, v_tx.id)
     WHERE user_id = v_tx.recipient_user_id
       AND (
         transaction_id = v_tx.id
         OR (transaction_id IS NULL
             AND title ILIKE '%incoming transfer pending approval%'
             AND created_at BETWEEN v_tx.created_at - interval '2 minutes' AND now()
             AND body ILIKE '%' || v_tx.amount::text || '%')
       );
    IF NOT FOUND THEN
      INSERT INTO public.notifications(user_id, title, body, transaction_id)
      VALUES (v_tx.recipient_user_id, 'Transfer completed', v_body, v_incoming_tx);
    END IF;

    UPDATE public.notifications
       SET title = 'Transfer completed',
           body = 'Your PIX transfer of ' || v_tx.amount::text || ' BRL to ' ||
             COALESCE(v_tx.recipient_name, 'Chavez Banco') ||
             ' has been approved and completed.',
           transaction_id = COALESCE(transaction_id, v_tx.id)
     WHERE user_id = v_tx.user_id
       AND (
         transaction_id = v_tx.id
         OR (transaction_id IS NULL
             AND title ILIKE '%transfer pending approval%'
             AND created_at BETWEEN v_tx.created_at - interval '2 minutes' AND now()
             AND body ILIKE '%' || v_tx.amount::text || '%')
       );
    IF NOT FOUND THEN
      INSERT INTO public.notifications(user_id, title, body, transaction_id)
      VALUES (v_tx.user_id, 'Transfer completed',
        'Your PIX transfer of ' || v_tx.amount::text || ' BRL to ' ||
        COALESCE(v_tx.recipient_name, 'Chavez Banco') || ' has been approved and completed.',
        v_tx.id);
    END IF;
  ELSIF p_status = 'rejected' THEN
    IF v_tx.direction = 'out' AND v_tx.balance_reserved THEN
      UPDATE public.profiles SET balance = balance + v_tx.amount WHERE id = v_tx.user_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Account profile not found while refunding transfer'; END IF;
    END IF;
    UPDATE public.notifications
       SET title = 'Transfer rejected',
           body = 'Your transfer of ' || v_tx.amount::text || ' BRL was rejected. ' ||
             CASE WHEN v_tx.direction = 'out' AND v_tx.balance_reserved THEN 'The reserved amount has been returned to your balance.' ELSE COALESCE(p_reason, '') END,
           transaction_id = COALESCE(transaction_id, v_tx.id)
     WHERE user_id = v_tx.user_id
       AND (transaction_id = v_tx.id OR
         (transaction_id IS NULL AND title ILIKE '%transfer pending approval%'
          AND created_at BETWEEN v_tx.created_at - interval '2 minutes' AND now()
          AND body ILIKE '%' || v_tx.amount::text || '%'));
    UPDATE public.notifications
       SET title = 'Transfer rejected',
           body = 'A transfer of ' || v_tx.amount::text || ' BRL was rejected and was not credited to your balance.',
           transaction_id = COALESCE(transaction_id, v_tx.id)
     WHERE user_id = v_tx.recipient_user_id
       AND (transaction_id = v_tx.id OR
         (transaction_id IS NULL AND title ILIKE '%incoming transfer pending approval%'
          AND created_at BETWEEN v_tx.created_at - interval '2 minutes' AND now()
          AND body ILIKE '%' || v_tx.amount::text || '%'));
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'status', p_status,
    'refunded', (p_status = 'rejected' AND v_tx.direction = 'out' AND v_tx.balance_reserved),
    'recipient_credited', (p_status = 'completed' AND v_tx.direction = 'out' AND v_tx.recipient_user_id IS NOT NULL),
    'recipient_transaction_id', v_incoming_tx
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_resolve_pending_transfer(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_resolve_pending_transfer(uuid, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.execute_test_pix_transfer(text,text,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_test_pix_transfer(text,text,numeric,text) TO authenticated;
