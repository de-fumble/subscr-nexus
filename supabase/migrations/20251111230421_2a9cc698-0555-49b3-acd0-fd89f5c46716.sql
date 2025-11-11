-- Update the check constraint on subscription_plans to allow quarterly interval
ALTER TABLE subscription_plans 
DROP CONSTRAINT IF EXISTS subscription_plans_interval_check;

ALTER TABLE subscription_plans 
ADD CONSTRAINT subscription_plans_interval_check 
CHECK (interval IN ('daily', 'weekly', 'monthly', 'quarterly', 'biannually', 'annually'));