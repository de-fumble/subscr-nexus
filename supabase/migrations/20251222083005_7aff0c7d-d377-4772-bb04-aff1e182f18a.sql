-- Drop the security definer view and create a regular view with proper security
DROP VIEW IF EXISTS public.organization_balances;

-- Create the view with SECURITY INVOKER (default, respects caller's RLS)
CREATE VIEW public.organization_balances WITH (security_invoker = true) AS
SELECT 
  p.org_id,
  COALESCE(SUM(t.amount), 0) as total_collected,
  COALESCE(SUM(CASE WHEN t.status = 'success' THEN t.amount ELSE 0 END), 0) as available_balance,
  COALESCE(SUM(CASE WHEN pr.status = 'approved' THEN pr.amount ELSE 0 END), 0) as total_paid_out
FROM subscription_plans p
LEFT JOIN subscribers s ON s.plan_id = p.id
LEFT JOIN transactions t ON t.subscriber_id = s.id
LEFT JOIN payout_requests pr ON pr.org_id = p.org_id
GROUP BY p.org_id;