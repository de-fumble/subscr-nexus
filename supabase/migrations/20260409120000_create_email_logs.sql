-- Email logs table: tracks every outbound email sent through the platform
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  email_type TEXT NOT NULL, -- e.g. 'login', 'logout', 'signup', 'password_reset', 'otp', 'kyc_approved', 'superadmin_message'
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent' | 'failed'
  resend_id TEXT, -- Resend API email ID for tracking
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Index for fast superadmin queries
CREATE INDEX IF NOT EXISTS email_logs_sent_at_idx ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS email_logs_org_id_idx ON email_logs(org_id);
CREATE INDEX IF NOT EXISTS email_logs_email_type_idx ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS email_logs_recipient_email_idx ON email_logs(recipient_email);

-- RLS: only superadmins can read email logs; service role can write
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can view all email logs"
  ON email_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'superadmin'
    )
  );

-- Service role (edge functions) can insert logs without restrictions
CREATE POLICY "Service role can insert email logs"
  ON email_logs FOR INSERT
  WITH CHECK (true);
