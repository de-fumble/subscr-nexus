-- Create billing_profiles table to track universal payer identity
CREATE TABLE public.billing_profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    phone_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index on email for fast lookups
CREATE UNIQUE INDEX billing_profiles_email_idx ON public.billing_profiles (email);

-- Create junction table to link billing profiles to organizations
CREATE TABLE public.billing_profile_organizations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    billing_profile_id UUID NOT NULL REFERENCES public.billing_profiles(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    first_interaction_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    total_paid NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(billing_profile_id, org_id)
);

-- Enable RLS on both tables
ALTER TABLE public.billing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_profile_organizations ENABLE ROW LEVEL SECURITY;

-- RLS for billing_profiles: only visible to orgs that have a link
CREATE POLICY "Organizations can view linked billing profiles"
ON public.billing_profiles
FOR SELECT
USING (
    id IN (
        SELECT bpo.billing_profile_id 
        FROM public.billing_profile_organizations bpo
        JOIN public.organizations o ON bpo.org_id = o.id
        WHERE o.user_id = auth.uid()
    )
    OR
    id IN (
        SELECT bpo.billing_profile_id 
        FROM public.billing_profile_organizations bpo
        JOIN public.organization_members om ON bpo.org_id = om.org_id
        WHERE om.user_id = auth.uid()
    )
);

-- Organizations can update billing profiles they're linked to (name, phone only)
CREATE POLICY "Organizations can update linked billing profiles"
ON public.billing_profiles
FOR UPDATE
USING (
    id IN (
        SELECT bpo.billing_profile_id 
        FROM public.billing_profile_organizations bpo
        JOIN public.organizations o ON bpo.org_id = o.id
        WHERE o.user_id = auth.uid()
    )
    OR
    id IN (
        SELECT bpo.billing_profile_id 
        FROM public.billing_profile_organizations bpo
        JOIN public.organization_members om ON bpo.org_id = om.org_id
        WHERE om.user_id = auth.uid()
    )
);

-- RLS for billing_profile_organizations
CREATE POLICY "Organization owners can view their billing profile links"
ON public.billing_profile_organizations
FOR SELECT
USING (
    org_id IN (SELECT id FROM public.organizations WHERE user_id = auth.uid())
);

CREATE POLICY "Organization members can view their billing profile links"
ON public.billing_profile_organizations
FOR SELECT
USING (
    org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
);

CREATE POLICY "Organization owners can update their billing profile links"
ON public.billing_profile_organizations
FOR UPDATE
USING (
    org_id IN (SELECT id FROM public.organizations WHERE user_id = auth.uid())
);

-- Superadmins can view all
CREATE POLICY "Superadmins can view all billing profiles"
ON public.billing_profiles
FOR SELECT
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins can view all billing profile organizations"
ON public.billing_profile_organizations
FOR SELECT
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_billing_profiles_updated_at
BEFORE UPDATE ON public.billing_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_billing_profile_organizations_updated_at
BEFORE UPDATE ON public.billing_profile_organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();