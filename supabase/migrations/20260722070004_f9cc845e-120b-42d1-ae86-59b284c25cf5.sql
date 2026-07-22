
ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS read_by_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS read_by_user boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Support: user reads own" ON storage.objects;
CREATE POLICY "Support: user reads own" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'support' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));

DROP POLICY IF EXISTS "Support: user uploads own" ON storage.objects;
CREATE POLICY "Support: user uploads own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'support' AND auth.uid()::text = (storage.foldername(name))[1]);
