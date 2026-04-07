-- Create kyc_edit_requests table
CREATE TABLE IF NOT EXISTS public.kyc_edit_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies
ALTER TABLE public.kyc_edit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations can view their own kyc_edit_requests"
ON public.kyc_edit_requests
FOR SELECT
USING (
    org_id IN (
        SELECT id FROM public.organizations WHERE user_id = auth.uid()
    )
    OR
    org_id IN (
        SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Organizations can insert their own kyc_edit_requests"
ON public.kyc_edit_requests
FOR INSERT
WITH CHECK (
    org_id IN (
        SELECT id FROM public.organizations WHERE user_id = auth.uid()
    )
    OR
    org_id IN (
        SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Superadmins can view all kyc_edit_requests"
ON public.kyc_edit_requests
FOR SELECT
USING (
    public.has_role(auth.uid(), 'superadmin')
    OR
    auth.jwt() ->> 'email' IN ('superadmin@recurra.com', 'admin@recurra.com') -- Fallback for dev
);

CREATE POLICY "Superadmins can update kyc_edit_requests"
ON public.kyc_edit_requests
FOR UPDATE
USING (
    public.has_role(auth.uid(), 'superadmin')
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_kyc_edit_requests_updated_at
    BEFORE UPDATE ON public.kyc_edit_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
