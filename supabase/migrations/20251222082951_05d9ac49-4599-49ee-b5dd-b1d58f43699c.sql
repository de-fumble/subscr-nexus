-- Create licenses table for organization license management
CREATE TABLE public.licenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('3_months', '6_months', '1_year', '2_years')),
  amount BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  paystack_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on licenses
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- RLS policies for licenses
CREATE POLICY "Organizations can view their own licenses"
ON public.licenses FOR SELECT
USING (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

CREATE POLICY "Superadmins can manage all licenses"
ON public.licenses FOR ALL
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Create email_verifications table
CREATE TABLE public.email_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  verified_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on email_verifications
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_verifications
CREATE POLICY "Users can view their own verifications"
ON public.email_verifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert verifications"
ON public.email_verifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own verifications"
ON public.email_verifications FOR UPDATE
USING (auth.uid() = user_id);

-- Add email_verified column to organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;

-- Create api_key_logs table for tracking key regeneration
CREATE TABLE public.api_key_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('regenerate', 'revoke', 'create')),
  key_type TEXT NOT NULL CHECK (key_type IN ('public', 'secret')),
  masked_key TEXT,
  actor_id UUID NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on api_key_logs
ALTER TABLE public.api_key_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for api_key_logs
CREATE POLICY "Organizations can view their own logs"
ON public.api_key_logs FOR SELECT
USING (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

CREATE POLICY "Organizations can insert their own logs"
ON public.api_key_logs FOR INSERT
WITH CHECK (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

CREATE POLICY "Superadmins can view all logs"
ON public.api_key_logs FOR SELECT
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Create available_balance tracking view (from transactions)
CREATE OR REPLACE VIEW public.organization_balances AS
SELECT 
  p.org_id,
  COALESCE(SUM(t.amount), 0) as total_collected,
  COALESCE(SUM(CASE WHEN t.status = 'success' THEN t.amount ELSE 0 END), 0) as available_balance,
  COALESCE(SUM(CASE WHEN pr.status = 'approved' THEN pr.amount ELSE 0 END), 0) as total_paid_out
FROM subscription_plans p
LEFT JOIN subscribers s ON s.plan_id = p.id
LEFT JOIN transactions t ON t.subscriber_id = s.id
LEFT JOIN payout_requests pr ON pr.org_id = p.org_id
GROUP BY p.org_id;

-- Add triggers for updated_at
CREATE TRIGGER update_licenses_updated_at
BEFORE UPDATE ON public.licenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster license lookups
CREATE INDEX idx_licenses_org_id ON public.licenses(org_id);
CREATE INDEX idx_licenses_status ON public.licenses(status);
CREATE INDEX idx_licenses_expires_at ON public.licenses(expires_at);