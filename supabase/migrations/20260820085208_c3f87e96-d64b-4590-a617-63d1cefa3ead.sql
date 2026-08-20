ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;