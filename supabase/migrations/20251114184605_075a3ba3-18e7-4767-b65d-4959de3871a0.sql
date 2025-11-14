-- Add bank account details to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS account_number text,
ADD COLUMN IF NOT EXISTS account_name text,
ADD COLUMN IF NOT EXISTS bank_name text;