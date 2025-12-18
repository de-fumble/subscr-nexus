-- Add failure_reason column to subscribers table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'subscribers' 
    AND column_name = 'failure_reason'
  ) THEN
    ALTER TABLE public.subscribers ADD COLUMN failure_reason text;
  END IF;
END $$;

-- Create refund_requests table for user refund requests
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  user_name text NOT NULL,
  phone_number text NOT NULL,
  transaction_reference text,
  refund_reason text NOT NULL,
  custom_complaint text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  processed_at timestamp with time zone,
  processed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

-- Users can create their own refund requests
CREATE POLICY "Users can create their own refund requests" 
ON public.refund_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can view their own refund requests
CREATE POLICY "Users can view their own refund requests" 
ON public.refund_requests 
FOR SELECT 
USING (auth.uid() = user_id);

-- Superadmins can manage all refund requests
CREATE POLICY "Superadmins can manage all refund requests" 
ON public.refund_requests 
FOR ALL 
USING (has_role(auth.uid(), 'superadmin'::app_role));