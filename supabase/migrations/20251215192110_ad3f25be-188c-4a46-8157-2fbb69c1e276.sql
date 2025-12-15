-- Add KYC fields to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS business_nature text,
ADD COLUMN IF NOT EXISTS business_name text,
ADD COLUMN IF NOT EXISTS staff_count text,
ADD COLUMN IF NOT EXISTS business_type text,
ADD COLUMN IF NOT EXISTS is_registered boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS registration_document_url text,
ADD COLUMN IF NOT EXISTS monthly_revenue text,
ADD COLUMN IF NOT EXISTS kyc_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS kyc_submitted_at timestamp with time zone;

-- Create name change requests table
CREATE TABLE IF NOT EXISTS public.name_change_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  current_name text NOT NULL,
  requested_name text NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  processed_at timestamp with time zone,
  processed_by uuid,
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on name_change_requests
ALTER TABLE public.name_change_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for name_change_requests
CREATE POLICY "Organizations can create their own name change requests" 
ON public.name_change_requests 
FOR INSERT 
WITH CHECK (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

CREATE POLICY "Organizations can view their own name change requests" 
ON public.name_change_requests 
FOR SELECT 
USING (org_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

CREATE POLICY "Superadmins can manage all name change requests" 
ON public.name_change_requests 
FOR ALL 
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_name_change_requests_updated_at
BEFORE UPDATE ON public.name_change_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for business documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('business-documents', 'business-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for business documents
CREATE POLICY "Users can upload their own business documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'business-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own business documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'business-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own business documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'business-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own business documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'business-documents' AND auth.uid()::text = (storage.foldername(name))[1]);