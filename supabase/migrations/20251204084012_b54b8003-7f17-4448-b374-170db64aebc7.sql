-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('superadmin', 'admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Superadmins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Create payout_requests table
CREATE TABLE public.payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    amount BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'failed', 'rejected')),
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage all payout requests"
ON public.payout_requests
FOR ALL
USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Organizations can view their own payout requests"
ON public.payout_requests
FOR SELECT
USING (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

CREATE POLICY "Organizations can create payout requests"
ON public.payout_requests
FOR INSERT
WITH CHECK (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

-- Create deletion_requests table
CREATE TABLE public.deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage all deletion requests"
ON public.deletion_requests
FOR ALL
USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Organizations can view their own deletion requests"
ON public.deletion_requests
FOR SELECT
USING (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

CREATE POLICY "Organizations can create deletion requests"
ON public.deletion_requests
FOR INSERT
WITH CHECK (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

-- Add suspension fields to organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS suspended_by UUID,
ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- Create audit_logs table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can view all audit logs"
ON public.audit_logs
FOR ALL
USING (public.has_role(auth.uid(), 'superadmin'));

-- Create platform_settings table for fee configuration
CREATE TABLE public.platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_by UUID
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage platform settings"
ON public.platform_settings
FOR ALL
USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Anyone can read platform settings"
ON public.platform_settings
FOR SELECT
USING (true);

-- Insert default platform fee setting (5%)
INSERT INTO public.platform_settings (setting_key, setting_value)
VALUES ('platform_fee', '{"type": "percentage", "value": 5}');

-- Add RLS policy for superadmins to view all organizations
CREATE POLICY "Superadmins can view all organizations"
ON public.organizations
FOR SELECT
USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can update all organizations"
ON public.organizations
FOR UPDATE
USING (public.has_role(auth.uid(), 'superadmin'));

-- Add RLS policy for superadmins to view all subscribers
CREATE POLICY "Superadmins can view all subscribers"
ON public.subscribers
FOR SELECT
USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can update all subscribers"
ON public.subscribers
FOR UPDATE
USING (public.has_role(auth.uid(), 'superadmin'));

-- Add RLS policy for superadmins to view all subscription plans
CREATE POLICY "Superadmins can view all subscription plans"
ON public.subscription_plans
FOR SELECT
USING (public.has_role(auth.uid(), 'superadmin'));

-- Add RLS policy for superadmins to view all transactions
CREATE POLICY "Superadmins can view all transactions"
ON public.transactions
FOR SELECT
USING (public.has_role(auth.uid(), 'superadmin'));

-- Create triggers for updated_at
CREATE TRIGGER update_payout_requests_updated_at
BEFORE UPDATE ON public.payout_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();