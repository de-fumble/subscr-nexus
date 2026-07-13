-- Add flag for admin-managed keys (set by superadmin when configuring keys for a Recurra-handling org)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS recurra_keys_managed BOOLEAN DEFAULT false;
