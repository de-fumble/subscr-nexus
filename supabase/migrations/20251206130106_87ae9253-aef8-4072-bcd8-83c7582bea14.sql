-- Create organization role enum
CREATE TYPE public.org_role AS ENUM ('admin', 'staff');

-- Create organization_members table for staff management
CREATE TABLE public.organization_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'staff',
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- Enable RLS on organization_members
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Create function to check organization role
CREATE OR REPLACE FUNCTION public.has_org_role(_user_id uuid, _org_id uuid, _role org_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND org_id = _org_id
      AND role = _role
  )
$$;

-- Create function to check if user is org owner (from organizations table)
CREATE OR REPLACE FUNCTION public.is_org_owner(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizations
    WHERE user_id = _user_id
      AND id = _org_id
  )
$$;

-- Create function to check if user has any access to org (owner, admin, or staff)
CREATE OR REPLACE FUNCTION public.has_org_access(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    public.is_org_owner(_user_id, _org_id) OR
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = _user_id AND org_id = _org_id
    )
  )
$$;

-- Create function to check if user can write to org (owner or admin only)
CREATE OR REPLACE FUNCTION public.can_write_to_org(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    public.is_org_owner(_user_id, _org_id) OR
    public.has_org_role(_user_id, _org_id, 'admin')
  )
$$;

-- RLS policies for organization_members
CREATE POLICY "Org owners can manage members"
ON public.organization_members
FOR ALL
USING (public.is_org_owner(auth.uid(), org_id));

CREATE POLICY "Org admins can view members"
ON public.organization_members
FOR SELECT
USING (public.has_org_role(auth.uid(), org_id, 'admin'));

CREATE POLICY "Staff can view their own membership"
ON public.organization_members
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can manage all members"
ON public.organization_members
FOR ALL
USING (public.has_role(auth.uid(), 'superadmin'));

-- Add module column to audit_logs for filtering
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS module TEXT;

-- Make audit_logs truly immutable - only INSERT allowed
DROP POLICY IF EXISTS "Superadmins can view all audit logs" ON public.audit_logs;

CREATE POLICY "Superadmins can view all audit logs"
ON public.audit_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Org members can view their org logs"
ON public.audit_logs
FOR SELECT
USING (
  entity_type = 'organization' AND
  public.has_org_access(auth.uid(), entity_id)
);

CREATE POLICY "Anyone can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- Create trigger to update updated_at on organization_members
CREATE TRIGGER update_organization_members_updated_at
BEFORE UPDATE ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();