-- Add RLS policy to allow staff members to view their organization
CREATE POLICY "Staff can view their organization" 
ON public.organizations 
FOR SELECT 
USING (
  id IN (
    SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);