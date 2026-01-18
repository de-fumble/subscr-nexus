-- Create notifications table for superadmin messages to organizations
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Organizations can view their own notifications
CREATE POLICY "Organizations can view their own notifications"
ON public.notifications
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

-- Organizations can update their own notifications (mark as read)
CREATE POLICY "Organizations can update their own notifications"
ON public.notifications
FOR UPDATE
USING (
  org_id IN (
    SELECT id FROM public.organizations WHERE user_id = auth.uid()
  )
  OR
  org_id IN (
    SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

-- Superadmins can create notifications for any organization
CREATE POLICY "Superadmins can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- Superadmins can view all notifications
CREATE POLICY "Superadmins can view all notifications"
ON public.notifications
FOR SELECT
USING (public.has_role(auth.uid(), 'superadmin'));

-- Add index for faster lookups
CREATE INDEX idx_notifications_org_id ON public.notifications(org_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
