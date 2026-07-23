
-- Add blocked flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked BOOLEAN NOT NULL DEFAULT FALSE;

-- Track approval on transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Change default so new user-initiated transfers land as pending
ALTER TABLE public.transactions ALTER COLUMN status SET DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS transactions_status_idx ON public.transactions(status);
