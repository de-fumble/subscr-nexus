-- Add RLS policy for staff to view their organization's subscription plans
CREATE POLICY "Staff can view their organization plans" 
ON public.subscription_plans 
FOR SELECT 
USING (
  org_id IN (
    SELECT organization_members.org_id 
    FROM organization_members 
    WHERE organization_members.user_id = auth.uid()
  )
);