-- Allow pending PIX requests to pass the outgoing-transfer trigger.
-- PIX requests already resolve a recipient via lookup_pix_recipient and carry
-- recipient_user_id; keep the existing internal-transfer checks scoped to internal.
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

  IF NEW.type = 'pix' THEN
    IF NEW.recipient_user_id IS NULL THEN
      RAISE EXCEPTION 'PIX recipient must be verified before submission';
    END IF;
    SELECT * INTO v_recipient
      FROM public.profiles
     WHERE id = NEW.recipient_user_id
     FOR UPDATE;
    IF NOT FOUND OR v_recipient.id = NEW.user_id THEN
      RAISE EXCEPTION 'PIX recipient account is unavailable';
    END IF;
    IF COALESCE(v_recipient.blocked, false) THEN
      RAISE EXCEPTION 'PIX recipient account is unavailable';
    END IF;
    UPDATE public.profiles SET balance = balance - NEW.amount WHERE id = NEW.user_id;
    NEW.balance_reserved := true;
    RETURN NEW;
  END IF;

  IF NEW.type <> 'internal' THEN
    RAISE EXCEPTION 'Unsupported transfer type for this approval flow';
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

  UPDATE public.profiles SET balance = balance - NEW.amount WHERE id = NEW.user_id;
  NEW.balance_reserved := true;
  RETURN NEW;
END;
$$;
