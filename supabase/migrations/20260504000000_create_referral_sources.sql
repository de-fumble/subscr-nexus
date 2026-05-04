-- Create referral_sources table
CREATE TABLE IF NOT EXISTS public.referral_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  org_name TEXT,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_sources ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own record
CREATE POLICY "Users can insert their own referral source"
  ON public.referral_sources
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow superadmin service role full access (reads handled via service key in edge functions)
CREATE POLICY "Service role full access"
  ON public.referral_sources
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS referral_sources_user_id_idx ON public.referral_sources(user_id);
CREATE INDEX IF NOT EXISTS referral_sources_created_at_idx ON public.referral_sources(created_at DESC);
CREATE INDEX IF NOT EXISTS referral_sources_source_idx ON public.referral_sources(source);
