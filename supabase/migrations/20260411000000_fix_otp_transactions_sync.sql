-- Add unique constraint on paystack_reference so upsert works correctly
-- (upsert requires a unique constraint, not just an index)
ALTER TABLE public.one_time_payment_transactions
  ADD CONSTRAINT otp_transactions_paystack_reference_key UNIQUE (paystack_reference);
