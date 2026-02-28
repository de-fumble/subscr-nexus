
-- Add OTP and rate limiting columns to email_verifications
ALTER TABLE public.email_verifications 
ADD COLUMN IF NOT EXISTS otp_code TEXT,
ADD COLUMN IF NOT EXISTS otp_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS request_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_requested_at TIMESTAMP WITH TIME ZONE DEFAULT now();
