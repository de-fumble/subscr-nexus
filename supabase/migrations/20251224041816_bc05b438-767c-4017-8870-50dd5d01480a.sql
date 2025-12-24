-- Create table for one-time payments
CREATE TABLE public.one_time_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMP WITH TIME ZONE,
  paid_by_email TEXT,
  paid_by_name TEXT,
  paystack_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.one_time_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for organization access
CREATE POLICY "Organization owners can manage one-time payments"
ON public.one_time_payments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = one_time_payments.org_id
    AND organizations.user_id = auth.uid()
  )
);

CREATE POLICY "Organization members can view one-time payments"
ON public.one_time_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_members.org_id = one_time_payments.org_id
    AND organization_members.user_id = auth.uid()
  )
);

CREATE POLICY "Organization admins can create one-time payments"
ON public.one_time_payments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_members.org_id = one_time_payments.org_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role = 'admin'
  )
);