ALTER TABLE public.support_messages REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='support_messages') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages';
  END IF;
END $$;