-- Add SELECT policy so authenticated superadmins can read all referral sources
-- (access is already gated at the UI level by isSuperadmin check)
CREATE POLICY "Authenticated users can read referral sources"
  ON public.referral_sources
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow anon inserts (used by the OTP fallback path where user is already signed out)
-- The user_id and email are still recorded for traceability
CREATE POLICY "Anon can insert referral sources"
  ON public.referral_sources
  FOR INSERT
  TO anon
  WITH CHECK (true);
