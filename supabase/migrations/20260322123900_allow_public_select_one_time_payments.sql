-- Allow public access to view one-time payment details (for rendering the payment page)
CREATE POLICY "Public can view one-time payments"
ON public.one_time_payments
FOR SELECT
USING (true);
