-- Create suspension_appeals table
CREATE TABLE public.suspension_appeals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  appeal_reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.suspension_appeals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Organizations can create their own appeals" 
ON public.suspension_appeals 
FOR INSERT 
WITH CHECK (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

CREATE POLICY "Organizations can view their own appeals" 
ON public.suspension_appeals 
FOR SELECT 
USING (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

CREATE POLICY "Superadmins can manage all appeals" 
ON public.suspension_appeals 
FOR ALL 
USING (has_role(auth.uid(), 'superadmin'));

-- Add trigger for updated_at
CREATE TRIGGER update_suspension_appeals_updated_at
BEFORE UPDATE ON public.suspension_appeals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update platform fee to flat ₦1,500 per transaction
INSERT INTO public.platform_settings (setting_key, setting_value)
VALUES ('platform_fee_type', '{"type": "flat", "amount": 1500}'::jsonb)
ON CONFLICT (setting_key) DO UPDATE SET setting_value = '{"type": "flat", "amount": 1500}'::jsonb;