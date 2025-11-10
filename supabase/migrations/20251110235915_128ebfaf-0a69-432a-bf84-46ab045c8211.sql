-- Allow public access to view active subscription plans
-- This enables the subscription page to work for non-authenticated users
CREATE POLICY "Anyone can view active subscription plans"
ON subscription_plans
FOR SELECT
USING (is_active = true);