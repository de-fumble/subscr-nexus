-- Create storage bucket for organization logos/profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('org-logos', 'org-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for public read access
CREATE POLICY "Organization logos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'org-logos');

-- Create policy for organization owners to upload their logo
CREATE POLICY "Organization owners can upload their logo"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'org-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy for organization owners to update their logo
CREATE POLICY "Organization owners can update their logo"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'org-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy for organization owners to delete their logo
CREATE POLICY "Organization owners can delete their logo"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'org-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add logo_url column to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS logo_url TEXT;