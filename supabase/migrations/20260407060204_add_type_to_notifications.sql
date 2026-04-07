-- Add type column to notifications table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type TEXT;

-- Update existing notifications to have a default type if needed
-- UPDATE public.notifications SET type = 'system' WHERE type IS NULL;
