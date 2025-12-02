-- Add retry tracking columns to subscribers table
ALTER TABLE public.subscribers 
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_retry_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_failed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS paystack_authorization_code text;

-- Create index for efficient querying of failed payments
CREATE INDEX IF NOT EXISTS idx_subscribers_payment_failed 
ON public.subscribers (payment_failed_at) 
WHERE payment_failed_at IS NOT NULL AND retry_count < 3;