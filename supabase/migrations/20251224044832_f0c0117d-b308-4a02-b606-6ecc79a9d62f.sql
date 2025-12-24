-- Create a table to track individual one-time payment transactions
CREATE TABLE public.one_time_payment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID NOT NULL REFERENCES public.one_time_payments(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  payer_email TEXT NOT NULL,
  payer_name TEXT NOT NULL,
  paystack_reference TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.one_time_payment_transactions ENABLE ROW LEVEL SECURITY;

-- Organization owners can view transactions for their payments
CREATE POLICY "Organization owners can view payment transactions"
ON public.one_time_payment_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM one_time_payments otp
    JOIN organizations o ON otp.org_id = o.id
    WHERE otp.id = one_time_payment_transactions.payment_id
    AND o.user_id = auth.uid()
  )
);

-- Organization members can view transactions for their org's payments
CREATE POLICY "Organization members can view payment transactions"
ON public.one_time_payment_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM one_time_payments otp
    JOIN organization_members om ON otp.org_id = om.org_id
    WHERE otp.id = one_time_payment_transactions.payment_id
    AND om.user_id = auth.uid()
  )
);

-- Add index for faster lookups
CREATE INDEX idx_otp_transactions_payment_id ON public.one_time_payment_transactions(payment_id);
CREATE INDEX idx_otp_transactions_paystack_ref ON public.one_time_payment_transactions(paystack_reference);