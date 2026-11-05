-- Keep has_role unavailable to public/anon while allowing trusted server-side
-- service-role operations that may invoke protected profile triggers.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
