-- Create a policy for public viewing of organization basic info for user search
-- First check if policy exists and drop if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Public can view organization basics' 
    AND tablename = 'organizations'
  ) THEN
    DROP POLICY "Public can view organization basics" ON public.organizations;
  END IF;
END $$;

CREATE POLICY "Public can view organization basics"
ON public.organizations
FOR SELECT
USING (true);