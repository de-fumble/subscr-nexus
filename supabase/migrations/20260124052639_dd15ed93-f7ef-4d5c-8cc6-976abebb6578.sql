-- Create notifications table for organization notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for organization access
CREATE POLICY "Users can view their organization's notifications"
ON public.notifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.organization_members om WHERE om.org_id = notifications.org_id AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their organization's notifications"
ON public.notifications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.organization_members om WHERE om.org_id = notifications.org_id AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert notifications for their organization"
ON public.notifications
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.organization_members om WHERE om.org_id = notifications.org_id AND om.user_id = auth.uid()
  )
);

-- Create index for faster queries
CREATE INDEX idx_notifications_org_id ON public.notifications(org_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;