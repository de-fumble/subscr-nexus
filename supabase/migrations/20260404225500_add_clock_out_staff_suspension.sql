-- Migration: Add is_clocked_out to organizations and is_suspended to organization_members

-- Alter organizations table to add is_clocked_out
ALTER TABLE public.organizations 
ADD COLUMN is_clocked_out BOOLEAN DEFAULT FALSE;

-- Alter organization_members table to add is_suspended
ALTER TABLE public.organization_members 
ADD COLUMN is_suspended BOOLEAN DEFAULT FALSE;
