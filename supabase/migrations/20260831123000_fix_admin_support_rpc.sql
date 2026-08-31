DROP FUNCTION IF EXISTS public.admin_list_support();
CREATE FUNCTION public.admin_list_support()
RETURNS SETOF public.support_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  PERFORM public.admin_assert_role();
  RETURN QUERY SELECT * FROM public.support_messages ORDER BY created_at DESC LIMIT 500;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_support() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_support() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_support_profiles()
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  PERFORM public.admin_assert_role();
  RETURN QUERY SELECT * FROM public.profiles;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_support_profiles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_support_profiles() TO authenticated;