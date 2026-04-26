ALTER TABLE public.subscription_plans
ADD COLUMN features TEXT[] DEFAULT '{}'::TEXT[];

ALTER TABLE public.one_time_payments
ADD COLUMN features TEXT[] DEFAULT '{}'::TEXT[];
