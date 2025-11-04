-- Create organizations table for user profile data
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  org_name TEXT NOT NULL,
  email TEXT NOT NULL,
  paystack_secret_key TEXT,
  paystack_public_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can view their own organization"
ON public.organizations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own organization"
ON public.organizations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own organization"
ON public.organizations FOR UPDATE
USING (auth.uid() = user_id);

-- Create subscription_plans table
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  paystack_plan_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price BIGINT NOT NULL,
  interval TEXT NOT NULL CHECK (interval IN ('daily', 'weekly', 'monthly', 'annually')),
  currency TEXT NOT NULL DEFAULT 'NGN',
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations can view their own plans"
ON public.subscription_plans FOR SELECT
USING (org_id IN (SELECT id FROM public.organizations WHERE user_id = auth.uid()));

CREATE POLICY "Organizations can create their own plans"
ON public.subscription_plans FOR INSERT
WITH CHECK (org_id IN (SELECT id FROM public.organizations WHERE user_id = auth.uid()));

CREATE POLICY "Organizations can update their own plans"
ON public.subscription_plans FOR UPDATE
USING (org_id IN (SELECT id FROM public.organizations WHERE user_id = auth.uid()));

CREATE POLICY "Organizations can delete their own plans"
ON public.subscription_plans FOR DELETE
USING (org_id IN (SELECT id FROM public.organizations WHERE user_id = auth.uid()));

-- Create subscribers table
CREATE TABLE public.subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  paystack_customer_code TEXT,
  paystack_subscription_code TEXT,
  email TEXT NOT NULL,
  customer_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'paused', 'expired')),
  amount BIGINT NOT NULL,
  next_payment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations can view subscribers for their plans"
ON public.subscribers FOR SELECT
USING (plan_id IN (
  SELECT id FROM public.subscription_plans 
  WHERE org_id IN (SELECT id FROM public.organizations WHERE user_id = auth.uid())
));

CREATE POLICY "Organizations can create subscribers for their plans"
ON public.subscribers FOR INSERT
WITH CHECK (plan_id IN (
  SELECT id FROM public.subscription_plans 
  WHERE org_id IN (SELECT id FROM public.organizations WHERE user_id = auth.uid())
));

CREATE POLICY "Organizations can update subscribers for their plans"
ON public.subscribers FOR UPDATE
USING (plan_id IN (
  SELECT id FROM public.subscription_plans 
  WHERE org_id IN (SELECT id FROM public.organizations WHERE user_id = auth.uid())
));

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  paystack_reference TEXT NOT NULL UNIQUE,
  amount BIGINT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations can view transactions for their subscribers"
ON public.transactions FOR SELECT
USING (subscriber_id IN (
  SELECT s.id FROM public.subscribers s
  JOIN public.subscription_plans p ON s.plan_id = p.id
  WHERE p.org_id IN (SELECT id FROM public.organizations WHERE user_id = auth.uid())
));

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscribers_updated_at
BEFORE UPDATE ON public.subscribers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.organizations (user_id, org_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'org_name', 'My Organization'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Trigger to create organization profile on user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();