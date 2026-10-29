-- Remove obsolete "PIX test transfer" wording from historical notifications.
-- Preserve the actual completed status of the historical transactions.
UPDATE public.notifications
SET title = CASE
  WHEN title = 'PIX test transfer completed' THEN 'PIX transfer completed'
  WHEN title = 'PIX test transfer received' THEN 'PIX transfer received'
  ELSE title
END
WHERE title IN ('PIX test transfer completed', 'PIX test transfer received');
