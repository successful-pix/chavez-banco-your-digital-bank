CREATE OR REPLACE FUNCTION public.admin_assert_role()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS SETOF public.profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN PERFORM public.admin_assert_role(); RETURN QUERY SELECT * FROM public.profiles ORDER BY created_at DESC; END; $$;
CREATE OR REPLACE FUNCTION public.admin_list_roles()
RETURNS SETOF public.user_roles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN PERFORM public.admin_assert_role(); RETURN QUERY SELECT * FROM public.user_roles ORDER BY created_at DESC; END; $$;
CREATE OR REPLACE FUNCTION public.admin_list_kyc()
RETURNS SETOF public.kyc_documents LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN PERFORM public.admin_assert_role(); RETURN QUERY SELECT * FROM public.kyc_documents ORDER BY created_at DESC; END; $$;
CREATE OR REPLACE FUNCTION public.admin_list_transactions()
RETURNS SETOF public.transactions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN PERFORM public.admin_assert_role(); RETURN QUERY SELECT * FROM public.transactions ORDER BY created_at DESC LIMIT 1000; END; $$;
CREATE OR REPLACE FUNCTION public.admin_list_notifications()
RETURNS SETOF public.notifications LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN PERFORM public.admin_assert_role(); RETURN QUERY SELECT * FROM public.notifications ORDER BY created_at DESC LIMIT 500; END; $$;
CREATE OR REPLACE FUNCTION public.admin_list_support()
RETURNS SETOF public.support_messages LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN PERFORM public.admin_assert_role(); RETURN QUERY SELECT * FROM public.support_messages ORDER BY created_at DESC LIMIT 500; END; $$;
CREATE OR REPLACE FUNCTION public.admin_list_support_profiles()
RETURNS SETOF public.profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN PERFORM public.admin_assert_role(); RETURN QUERY SELECT * FROM public.profiles; END; $$;
CREATE OR REPLACE FUNCTION public.admin_list_pending_transfers()
RETURNS SETOF public.transactions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN PERFORM public.admin_assert_role(); RETURN QUERY SELECT * FROM public.transactions WHERE status = 'pending' ORDER BY created_at DESC; END; $$;

GRANT EXECUTE ON FUNCTION public.admin_assert_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_kyc() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_transactions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_support() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_support_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_pending_transfers() TO authenticated;
