ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS features TEXT[] DEFAULT '{}'::TEXT[];

ALTER TABLE public.one_time_payments
ADD COLUMN IF NOT EXISTS features TEXT[] DEFAULT '{}'::TEXT[];
