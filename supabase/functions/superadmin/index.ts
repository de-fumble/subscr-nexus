import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLATFORM_FEE_PER_TRANSACTION = 1500; // ₦1,500 flat fee per transaction

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is superadmin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'superadmin')
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Access denied. Superadmin role required.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, ...params } = await req.json();
    console.log(`Superadmin action: ${action}`, params);

    let result;

    switch (action) {
      case 'get_all_organizations':
        result = await getAllOrganizations(supabase);
        break;
      
      case 'get_organization_details':
        result = await getOrganizationDetails(supabase, params.org_id);
        break;
      
      case 'get_organization_analytics':
        result = await getOrganizationAnalytics(supabase, params.org_id);
        break;
      
      case 'suspend_organization':
        result = await suspendOrganization(supabase, user.id, params.org_id, params.reason);
        break;
      
      case 'restore_organization':
        result = await restoreOrganization(supabase, user.id, params.org_id);
        break;
      
      case 'approve_deletion':
        result = await approveDeletion(supabase, user.id, params.request_id);
        break;
      
      case 'reject_deletion':
        result = await rejectDeletion(supabase, user.id, params.request_id);
        break;
      
      case 'approve_payout':
        result = await approvePayout(supabase, user.id, params.request_id);
        break;
      
      case 'reject_payout':
        result = await rejectPayout(supabase, user.id, params.request_id, params.reason);
        break;
      
      case 'complete_payout':
        result = await completePayout(supabase, user.id, params.request_id);
        break;
      
      case 'get_payout_requests':
        result = await getPayoutRequests(supabase, params.status);
        break;
      
      case 'get_deletion_requests':
        result = await getDeletionRequests(supabase, params.status);
        break;
      
      case 'get_audit_logs':
        result = await getAuditLogs(supabase, params.entity_type, params.entity_id, params.limit);
        break;
      
      case 'get_platform_stats':
        result = await getPlatformStats(supabase);
        break;
      
      case 'get_defaulted_subscribers':
        result = await getDefaultedSubscribers(supabase, params.org_id);
        break;
      
      case 'mark_payment_resolved':
        result = await markPaymentResolved(supabase, user.id, params.subscriber_id);
        break;

      case 'get_suspension_appeals':
        result = await getSuspensionAppeals(supabase, params.status);
        break;

      case 'approve_appeal':
        result = await approveAppeal(supabase, user.id, params.appeal_id, params.admin_notes);
        break;

      case 'reject_appeal':
        result = await rejectAppeal(supabase, user.id, params.appeal_id, params.admin_notes);
        break;

      case 'get_eligible_payouts':
        result = await getEligiblePayouts(supabase);
        break;

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Superadmin error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to fetch Paystack data for an organization
async function fetchPaystackData(paystackKey: string) {
  let subscriptions: any[] = [];
  let transactions: any[] = [];

  try {
    // Fetch subscriptions
    const subsResponse = await fetch('https://api.paystack.co/subscription?perPage=1000', {
      headers: {
        'Authorization': `Bearer ${paystackKey}`,
        'Content-Type': 'application/json',
      },
    });
    if (subsResponse.ok) {
      const subsData = await subsResponse.json();
      subscriptions = subsData.data || [];
    }

    // Fetch transactions
    const txResponse = await fetch('https://api.paystack.co/transaction?status=success&perPage=1000', {
      headers: {
        'Authorization': `Bearer ${paystackKey}`,
        'Content-Type': 'application/json',
      },
    });
    if (txResponse.ok) {
      const txData = await txResponse.json();
      transactions = txData.data || [];
    }
  } catch (error) {
    console.error('Error fetching Paystack data:', error);
  }

  return { subscriptions, transactions };
}

// Calculate MRR from subscriptions - normalize all intervals to monthly
function calculateMRR(subscriptions: any[]) {
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  
  return activeSubscriptions.reduce((sum, sub) => {
    const amount = (sub.amount || 0) / 100; // Convert kobo to naira
    const interval = sub.plan?.interval || 'monthly';
    
    // Normalize to monthly
    switch (interval) {
      case 'daily': return sum + (amount * 30);
      case 'weekly': return sum + (amount * 4);
      case 'monthly': return sum + amount;
      case 'quarterly': return sum + (amount / 3);
      case 'biannually': return sum + (amount / 6);
      case 'annually': return sum + (amount / 12);
      default: return sum + amount;
    }
  }, 0);
}

async function getAllOrganizations(supabase: any) {
  const { data: organizations, error } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Get plan counts for each organization
  const { data: allPlans } = await supabase
    .from('subscription_plans')
    .select('org_id, is_active');

  const planCountByOrg: { [key: string]: number } = {};
  const activePlanCountByOrg: { [key: string]: number } = {};
  
  (allPlans || []).forEach((plan: any) => {
    planCountByOrg[plan.org_id] = (planCountByOrg[plan.org_id] || 0) + 1;
    if (plan.is_active) {
      activePlanCountByOrg[plan.org_id] = (activePlanCountByOrg[plan.org_id] || 0) + 1;
    }
  });

  // Get detailed stats for each org from Paystack
  const orgsWithStats = await Promise.all(organizations.map(async (org: any) => {
    let activeSubscribers = 0;
    let totalSubscribers = 0;
    let totalRevenue = 0;
    let transactionCount = 0;
    let mrr = 0;
    let defaultedSubscribers = 0;

    // Check if org has connected their own Paystack keys
    const paystackConnected = !!(org.paystack_secret_key && org.paystack_public_key);

    if (org.paystack_secret_key) {
      const { subscriptions, transactions } = await fetchPaystackData(org.paystack_secret_key);
      
      totalSubscribers = subscriptions.length;
      activeSubscribers = subscriptions.filter((s: any) => s.status === 'active').length;
      defaultedSubscribers = subscriptions.filter((s: any) => 
        ['attention', 'non-renewing', 'cancelled'].includes(s.status)
      ).length;
      
      totalRevenue = transactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) / 100;
      transactionCount = transactions.length;
      mrr = calculateMRR(subscriptions);
    }

    return {
      ...org,
      paystack_connected: paystackConnected,
      total_plans: planCountByOrg[org.id] || 0,
      active_plans: activePlanCountByOrg[org.id] || 0,
      active_subscribers: activeSubscribers,
      total_subscribers: totalSubscribers,
      total_revenue: totalRevenue,
      transaction_count: transactionCount,
      mrr: mrr,
      arr: mrr * 12,
      defaulted_subscribers: defaultedSubscribers,
    };
  }));

  return { organizations: orgsWithStats };
}

async function getOrganizationDetails(supabase: any, orgId: string) {
  const { data: org, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();

  if (error) throw error;

  // Get plans
  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('org_id', orgId);

  // Get local subscribers
  const planIds = plans?.map((p: any) => p.id) || [];
  let localSubscribers: any[] = [];
  
  if (planIds.length > 0) {
    const { data } = await supabase
      .from('subscribers')
      .select('*, subscription_plans(name, price, interval)')
      .in('plan_id', planIds);
    localSubscribers = data || [];
  }

  // Get live Paystack data if available
  let liveSubscribers: any[] = [];
  let liveTransactions: any[] = [];
  
  if (org.paystack_secret_key) {
    const { subscriptions, transactions } = await fetchPaystackData(org.paystack_secret_key);
    liveSubscribers = subscriptions;
    liveTransactions = transactions;
  }

  // Get payout requests
  const { data: payoutRequests } = await supabase
    .from('payout_requests')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  // Get deletion requests
  const { data: deletionRequests } = await supabase
    .from('deletion_requests')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  return {
    organization: org,
    plans: plans || [],
    subscribers: localSubscribers,
    live_subscribers: liveSubscribers,
    live_transactions: liveTransactions,
    payout_requests: payoutRequests || [],
    deletion_requests: deletionRequests || [],
  };
}

async function getOrganizationAnalytics(supabase: any, orgId: string) {
  const { data: org } = await supabase
    .from('organizations')
    .select('paystack_secret_key')
    .eq('id', orgId)
    .single();

  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('org_id', orgId);

  if (!org?.paystack_secret_key) {
    // Fallback to local data
    return getLocalOrganizationAnalytics(supabase, orgId, plans || []);
  }

  // Fetch live data from Paystack
  const { subscriptions, transactions } = await fetchPaystackData(org.paystack_secret_key);

  const activeSubscribers = subscriptions.filter((s: any) => s.status === 'active');
  const defaultedSubscribers = subscriptions.filter((s: any) => 
    ['attention', 'non-renewing'].includes(s.status)
  );
  const churnedSubscribers = subscriptions.filter((s: any) => 
    ['cancelled', 'canceled', 'expired'].includes(s.status)
  );

  const totalRevenue = transactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) / 100;
  const transactionCount = transactions.length;
  const platformFee = transactionCount * PLATFORM_FEE_PER_TRANSACTION;
  const recurringRevenue = Math.max(0, totalRevenue - platformFee);

  const mrr = calculateMRR(subscriptions);
  const arr = mrr * 12;

  // Monthly revenue trend (last 12 months)
  const monthlyRevenue: { [key: string]: { revenue: number; transactions: number } } = {};
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = date.toISOString().slice(0, 7);
    monthlyRevenue[key] = { revenue: 0, transactions: 0 };
  }

  transactions.forEach((t: any) => {
    const date = new Date(t.paid_at || t.created_at);
    const key = date.toISOString().slice(0, 7);
    if (monthlyRevenue.hasOwnProperty(key)) {
      monthlyRevenue[key].revenue += (t.amount || 0) / 100;
      monthlyRevenue[key].transactions += 1;
    }
  });

  const monthlyRevenueTrend = Object.entries(monthlyRevenue).map(([month, data]) => ({
    month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    revenue: data.revenue,
    platform_fee: data.transactions * PLATFORM_FEE_PER_TRANSACTION,
    net_revenue: Math.max(0, data.revenue - (data.transactions * PLATFORM_FEE_PER_TRANSACTION)),
  }));

  // Subscriber growth over time
  const subscriberGrowth: { [key: string]: number } = {};
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = date.toISOString().slice(0, 7);
    subscriberGrowth[key] = 0;
  }

  subscriptions.forEach((s: any) => {
    const date = new Date(s.createdAt || s.created_at);
    const key = date.toISOString().slice(0, 7);
    if (subscriberGrowth.hasOwnProperty(key)) {
      subscriberGrowth[key] += 1;
    }
  });

  const subscriberGrowthTrend = Object.entries(subscriberGrowth).map(([month, count]) => ({
    month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    subscribers: count,
  }));

  // Plan distribution
  const planCounts: { [key: string]: number } = {};
  activeSubscribers.forEach((s: any) => {
    const planName = s.plan?.name || 'Unknown';
    planCounts[planName] = (planCounts[planName] || 0) + 1;
  });

  const totalActive = activeSubscribers.length;
  const planDistribution = Object.entries(planCounts).map(([name, count]) => ({
    name,
    count,
    percentage: totalActive > 0 ? Math.round((count / totalActive) * 100) : 0,
  }));

  // Revenue by plan
  const revenueByPlan = (plans || []).map((plan: any) => {
    const planSubs = subscriptions.filter((s: any) => s.plan?.plan_code === plan.paystack_plan_code);
    const planActiveSubs = planSubs.filter((s: any) => s.status === 'active');
    // Estimate revenue based on plan price and active subscribers
    const planRevenue = planActiveSubs.length * plan.price;
    
    return {
      name: plan.name,
      revenue: planRevenue,
      active_subscribers: planActiveSubs.length,
      platform_fee: planActiveSubs.length * PLATFORM_FEE_PER_TRANSACTION,
      net_revenue: Math.max(0, planRevenue - (planActiveSubs.length * PLATFORM_FEE_PER_TRANSACTION)),
    };
  });

  // Subscribers by plan
  const subscribersByPlan = (plans || []).map((plan: any) => {
    const planSubs = subscriptions.filter((s: any) => s.plan?.plan_code === plan.paystack_plan_code);
    return {
      name: plan.name,
      active: planSubs.filter((s: any) => s.status === 'active').length,
      defaulted: planSubs.filter((s: any) => ['attention', 'non-renewing'].includes(s.status)).length,
      churned: planSubs.filter((s: any) => ['cancelled', 'canceled', 'expired'].includes(s.status)).length,
    };
  });

  // Defaulted subscribers with details
  const defaultedList = defaultedSubscribers.map((s: any) => ({
    id: s.subscription_code,
    email: s.customer?.email || 'Unknown',
    customer_name: `${s.customer?.first_name || ''} ${s.customer?.last_name || ''}`.trim() || 'Unknown',
    plan: s.plan?.name || 'Unknown',
    amount: (s.amount || 0) / 100,
    status: s.status,
    date: s.updatedAt || s.createdAt,
    reason: s.status === 'attention' ? 'Payment Failed' : s.status === 'non-renewing' ? 'Non-Renewing' : 'Unknown',
  }));

  const churnRate = subscriptions.length > 0 
    ? Math.round((churnedSubscribers.length / subscriptions.length) * 100 * 10) / 10 
    : 0;

  const arpu = activeSubscribers.length > 0 
    ? Math.round(totalRevenue / activeSubscribers.length) 
    : 0;

  return {
    total_revenue: totalRevenue,
    recurring_revenue: recurringRevenue,
    platform_fee: platformFee,
    transaction_count: transactionCount,
    mrr: mrr,
    arr: arr,
    active_subscribers: activeSubscribers.length,
    churned_subscribers: churnedSubscribers.length,
    defaulted_subscribers: defaultedSubscribers.length,
    total_subscribers: subscriptions.length,
    churn_rate: churnRate,
    arpu,
    revenue_by_plan: revenueByPlan,
    monthly_revenue_trend: monthlyRevenueTrend,
    subscriber_growth: subscriberGrowthTrend,
    subscribers_by_plan: subscribersByPlan,
    plan_distribution: planDistribution,
    defaulted_list: defaultedList,
  };
}

async function getLocalOrganizationAnalytics(supabase: any, orgId: string, plans: any[]) {
  const planIds = plans?.map((p: any) => p.id) || [];
  
  if (planIds.length === 0) {
    return {
      total_revenue: 0,
      recurring_revenue: 0,
      platform_fee: 0,
      mrr: 0,
      arr: 0,
      active_subscribers: 0,
      churned_subscribers: 0,
      defaulted_subscribers: 0,
      churn_rate: 0,
      arpu: 0,
      revenue_by_plan: [],
      monthly_revenue_trend: [],
      subscriber_growth: [],
      subscribers_by_plan: [],
      plan_distribution: [],
      defaulted_list: [],
    };
  }

  const { data: allSubscribers } = await supabase
    .from('subscribers')
    .select('*, subscription_plans(name, price, interval)')
    .in('plan_id', planIds);

  const subscribers = allSubscribers || [];
  
  const activeStatuses = ['active'];
  const churnedStatuses = ['cancelled', 'canceled', 'expired'];
  const defaultedStatuses = ['attention', 'paused', 'non-renewing'];

  const activeSubscribers = subscribers.filter((s: any) => activeStatuses.includes(s.status));
  const churnedSubscribers = subscribers.filter((s: any) => churnedStatuses.includes(s.status));
  const defaultedSubscribers = subscribers.filter((s: any) => defaultedStatuses.includes(s.status));

  const subscriberIds = subscribers.map((s: any) => s.id);
  let transactions: any[] = [];
  
  if (subscriberIds.length > 0) {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .in('subscriber_id', subscriberIds)
      .eq('status', 'success');
    transactions = data || [];
  }

  const totalRevenue = transactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
  const transactionCount = transactions.length;
  const platformFee = transactionCount * PLATFORM_FEE_PER_TRANSACTION;
  const recurringRevenue = Math.max(0, totalRevenue - platformFee);

  // Calculate MRR from active subscribers
  const mrr = activeSubscribers.reduce((sum: number, s: any) => {
    const price = s.subscription_plans?.price || 0;
    const interval = s.subscription_plans?.interval || 'monthly';
    
    switch (interval) {
      case 'daily': return sum + (price * 30);
      case 'weekly': return sum + (price * 4);
      case 'monthly': return sum + price;
      case 'quarterly': return sum + (price / 3);
      case 'biannually': return sum + (price / 6);
      case 'annually': return sum + (price / 12);
      default: return sum + price;
    }
  }, 0);

  const arr = mrr * 12;

  return {
    total_revenue: totalRevenue,
    recurring_revenue: recurringRevenue,
    platform_fee: platformFee,
    transaction_count: transactionCount,
    mrr: mrr,
    arr: arr,
    active_subscribers: activeSubscribers.length,
    churned_subscribers: churnedSubscribers.length,
    defaulted_subscribers: defaultedSubscribers.length,
    total_subscribers: subscribers.length,
    churn_rate: subscribers.length > 0 ? Math.round((churnedSubscribers.length / subscribers.length) * 100 * 10) / 10 : 0,
    arpu: activeSubscribers.length > 0 ? Math.round(totalRevenue / activeSubscribers.length) : 0,
    revenue_by_plan: [],
    monthly_revenue_trend: [],
    subscriber_growth: [],
    subscribers_by_plan: [],
    plan_distribution: [],
    defaulted_list: defaultedSubscribers.map((s: any) => ({
      id: s.id,
      email: s.email,
      customer_name: s.customer_name || 'Unknown',
      plan: s.subscription_plans?.name || 'Unknown',
      amount: s.amount,
      status: s.status,
      date: s.payment_failed_at,
      reason: s.status === 'attention' ? 'Payment Failed' : s.status,
      retry_count: s.retry_count || 0,
      last_retry_at: s.last_retry_at,
    })),
  };
}

async function suspendOrganization(supabase: any, actorId: string, orgId: string, reason: string) {
  const { error } = await supabase
    .from('organizations')
    .update({
      is_suspended: true,
      suspended_at: new Date().toISOString(),
      suspended_by: actorId,
      suspension_reason: reason,
    })
    .eq('id', orgId);

  if (error) throw error;

  await supabase.from('audit_logs').insert({
    actor_id: actorId,
    action: 'suspend_organization',
    entity_type: 'organization',
    entity_id: orgId,
    details: { reason },
  });

  return { success: true };
}

async function restoreOrganization(supabase: any, actorId: string, orgId: string) {
  const { error } = await supabase
    .from('organizations')
    .update({
      is_suspended: false,
      suspended_at: null,
      suspended_by: null,
      suspension_reason: null,
    })
    .eq('id', orgId);

  if (error) throw error;

  await supabase.from('audit_logs').insert({
    actor_id: actorId,
    action: 'restore_organization',
    entity_type: 'organization',
    entity_id: orgId,
  });

  return { success: true };
}

async function approveDeletion(supabase: any, actorId: string, requestId: string) {
  const { data: request, error: fetchError } = await supabase
    .from('deletion_requests')
    .select('org_id')
    .eq('id', requestId)
    .single();

  if (fetchError) throw fetchError;

  const { error } = await supabase
    .from('deletion_requests')
    .update({
      status: 'approved',
      processed_at: new Date().toISOString(),
      processed_by: actorId,
    })
    .eq('id', requestId);

  if (error) throw error;

  await supabase.from('organizations').delete().eq('id', request.org_id);

  await supabase.from('audit_logs').insert({
    actor_id: actorId,
    action: 'approve_deletion',
    entity_type: 'deletion_request',
    entity_id: requestId,
    details: { org_id: request.org_id },
  });

  return { success: true };
}

async function rejectDeletion(supabase: any, actorId: string, requestId: string) {
  const { error } = await supabase
    .from('deletion_requests')
    .update({
      status: 'rejected',
      processed_at: new Date().toISOString(),
      processed_by: actorId,
    })
    .eq('id', requestId);

  if (error) throw error;

  await supabase.from('audit_logs').insert({
    actor_id: actorId,
    action: 'reject_deletion',
    entity_type: 'deletion_request',
    entity_id: requestId,
  });

  return { success: true };
}

async function approvePayout(supabase: any, actorId: string, requestId: string) {
  const { error } = await supabase
    .from('payout_requests')
    .update({
      status: 'approved',
      processed_at: new Date().toISOString(),
      processed_by: actorId,
    })
    .eq('id', requestId);

  if (error) throw error;

  await supabase.from('audit_logs').insert({
    actor_id: actorId,
    action: 'approve_payout',
    entity_type: 'payout_request',
    entity_id: requestId,
  });

  return { success: true };
}

async function rejectPayout(supabase: any, actorId: string, requestId: string, reason: string) {
  const { error } = await supabase
    .from('payout_requests')
    .update({
      status: 'rejected',
      processed_at: new Date().toISOString(),
      processed_by: actorId,
      notes: reason,
    })
    .eq('id', requestId);

  if (error) throw error;

  await supabase.from('audit_logs').insert({
    actor_id: actorId,
    action: 'reject_payout',
    entity_type: 'payout_request',
    entity_id: requestId,
    details: { reason },
  });

  return { success: true };
}

async function completePayout(supabase: any, actorId: string, requestId: string) {
  const { error } = await supabase
    .from('payout_requests')
    .update({
      status: 'completed',
      processed_at: new Date().toISOString(),
      processed_by: actorId,
    })
    .eq('id', requestId);

  if (error) throw error;

  await supabase.from('audit_logs').insert({
    actor_id: actorId,
    action: 'complete_payout',
    entity_type: 'payout_request',
    entity_id: requestId,
  });

  return { success: true };
}

async function getPayoutRequests(supabase: any, status?: string) {
  let query = supabase
    .from('payout_requests')
    .select('*, organizations(org_name, email, account_number, account_name, bank_name)')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return { payout_requests: data };
}

async function getEligiblePayouts(supabase: any) {
  // Get all organizations with their revenue data
  const { data: organizations } = await supabase
    .from('organizations')
    .select('*')
    .not('paystack_secret_key', 'is', null);

  const eligiblePayouts = await Promise.all((organizations || []).map(async (org: any) => {
    const { transactions } = await fetchPaystackData(org.paystack_secret_key);
    const totalRevenue = transactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) / 100;
    const platformFee = transactions.length * PLATFORM_FEE_PER_TRANSACTION;
    const amountOwed = Math.max(0, totalRevenue - platformFee);

    // Get completed payouts
    const { data: completedPayouts } = await supabase
      .from('payout_requests')
      .select('amount')
      .eq('org_id', org.id)
      .eq('status', 'completed');

    const totalPaidOut = (completedPayouts || []).reduce((sum: number, p: any) => sum + p.amount, 0);
    const eligibleAmount = Math.max(0, amountOwed - totalPaidOut);

    return {
      org_id: org.id,
      org_name: org.org_name,
      email: org.email,
      total_revenue: totalRevenue,
      platform_fee: platformFee,
      amount_owed: amountOwed,
      total_paid_out: totalPaidOut,
      eligible_amount: eligibleAmount,
      bank_name: org.bank_name,
      account_number: org.account_number,
      account_name: org.account_name,
    };
  }));

  return { eligible_payouts: eligiblePayouts.filter(p => p.eligible_amount > 0) };
}

async function getDeletionRequests(supabase: any, status?: string) {
  let query = supabase
    .from('deletion_requests')
    .select('*, organizations(org_name, email)')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return { deletion_requests: data };
}

async function getAuditLogs(supabase: any, entityType?: string, entityId?: string, limit: number = 100) {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (entityType) {
    query = query.eq('entity_type', entityType);
  }
  if (entityId) {
    query = query.eq('entity_id', entityId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return { audit_logs: data };
}

async function getPlatformStats(supabase: any) {
  console.log('Fetching platform stats with live Paystack data...');
  
  // Organization counts
  const { count: totalOrgs } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true });

  const { count: activeOrgs } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true })
    .eq('is_suspended', false);

  const { count: suspendedOrgs } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true })
    .eq('is_suspended', true);

  // Get all organizations with Paystack keys
  const { data: orgsWithKeys } = await supabase
    .from('organizations')
    .select('id, org_name, paystack_secret_key')
    .not('paystack_secret_key', 'is', null);

  let totalSubscribers = 0;
  let activeSubscribers = 0;
  let defaultedSubscribers = 0;
  let totalRevenue = 0;
  let totalTransactions = 0;
  let totalMRR = 0;
  let failedPayments = 0;

  // Fetch live data from Paystack for each organization
  for (const org of orgsWithKeys || []) {
    if (!org.paystack_secret_key) continue;

    try {
      const { subscriptions, transactions } = await fetchPaystackData(org.paystack_secret_key);
      
      totalSubscribers += subscriptions.length;
      activeSubscribers += subscriptions.filter((s: any) => s.status === 'active').length;
      defaultedSubscribers += subscriptions.filter((s: any) => 
        ['attention', 'non-renewing'].includes(s.status)
      ).length;
      
      totalRevenue += transactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) / 100;
      totalTransactions += transactions.length;
      totalMRR += calculateMRR(subscriptions);

      // Count failed transactions
      const failedResponse = await fetch('https://api.paystack.co/transaction?status=failed&perPage=1000', {
        headers: {
          'Authorization': `Bearer ${org.paystack_secret_key}`,
          'Content-Type': 'application/json',
        },
      });
      if (failedResponse.ok) {
        const failedData = await failedResponse.json();
        failedPayments += (failedData.data || []).length;
      }

      console.log(`Org ${org.org_name}: ${subscriptions.length} subs, ₦${transactions.reduce((s: number, t: any) => s + (t.amount || 0), 0) / 100} revenue`);
    } catch (error) {
      console.error(`Error fetching Paystack data for org ${org.org_name}:`, error);
    }
  }

  const platformEarnings = totalTransactions * PLATFORM_FEE_PER_TRANSACTION;
  const roundedMRR = Math.round(totalMRR);
  const totalARR = roundedMRR * 12;

  // Pending counts
  const { count: pendingPayouts } = await supabase
    .from('payout_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const { count: pendingDeletions } = await supabase
    .from('deletion_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const { count: pendingAppeals } = await supabase
    .from('suspension_appeals')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  console.log(`Platform totals: ${totalSubscribers} subscribers, ${activeSubscribers} active, ₦${totalRevenue.toLocaleString()} revenue, ${totalTransactions} transactions`);

  return {
    total_organizations: totalOrgs || 0,
    active_organizations: activeOrgs || 0,
    suspended_organizations: suspendedOrgs || 0,
    total_subscribers: totalSubscribers,
    active_subscribers: activeSubscribers,
    defaulted_subscribers: defaultedSubscribers,
    total_revenue: totalRevenue,
    platform_earnings: platformEarnings,
    transaction_count: totalTransactions,
    mrr: totalMRR,
    arr: totalARR,
    failed_payments: failedPayments,
    pending_payouts: pendingPayouts || 0,
    pending_deletions: pendingDeletions || 0,
    pending_appeals: pendingAppeals || 0,
  };
}

async function getDefaultedSubscribers(supabase: any, orgId?: string) {
  // Get all organizations with Paystack keys
  const { data: organizations } = await supabase
    .from('organizations')
    .select('id, org_name, paystack_secret_key')
    .not('paystack_secret_key', 'is', null);

  let allDefaulters: any[] = [];

  for (const org of organizations || []) {
    if (orgId && org.id !== orgId) continue;
    if (!org.paystack_secret_key) continue;

    try {
      const { subscriptions } = await fetchPaystackData(org.paystack_secret_key);
      
      const defaulted = subscriptions
        .filter((s: any) => ['attention', 'non-renewing', 'cancelled'].includes(s.status))
        .map((s: any) => ({
          id: s.subscription_code,
          organization: org.org_name,
          org_id: org.id,
          email: s.customer?.email || 'Unknown',
          customer_name: `${s.customer?.first_name || ''} ${s.customer?.last_name || ''}`.trim() || 'Unknown',
          plan: s.plan?.name || 'Unknown',
          amount: (s.amount || 0) / 100,
          status: s.status,
          failure_reason: s.status === 'attention' ? 'Payment Failed' : 
                         s.status === 'non-renewing' ? 'Non-Renewing' : 
                         s.status === 'cancelled' ? 'Cancelled' : 'Unknown',
          next_payment_date: s.next_payment_date,
          created_at: s.createdAt,
        }));

      allDefaulters = [...allDefaulters, ...defaulted];
    } catch (error) {
      console.error(`Error fetching defaulters for org ${org.org_name}:`, error);
    }
  }

  // Also include local defaulters
  let localQuery = supabase
    .from('subscribers')
    .select('*, subscription_plans(name, price, interval, org_id, organizations(org_name))')
    .in('status', ['attention', 'paused', 'non-renewing']);

  if (orgId) {
    const { data: plans } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('org_id', orgId);
    
    const planIds = plans?.map((p: any) => p.id) || [];
    if (planIds.length > 0) {
      localQuery = localQuery.in('plan_id', planIds);
    }
  }

  const { data: localDefaulters } = await localQuery.order('payment_failed_at', { ascending: false });

  const mappedLocalDefaulters = (localDefaulters || []).map((d: any) => ({
    id: d.id,
    organization: d.subscription_plans?.organizations?.org_name || 'Unknown',
    org_id: d.subscription_plans?.org_id,
    email: d.email,
    customer_name: d.customer_name || 'Unknown',
    plan: d.subscription_plans?.name || 'Unknown',
    amount: d.amount,
    status: d.status,
    failure_reason: d.status === 'attention' ? 'Payment Failed' : d.status,
    retry_count: d.retry_count || 0,
    last_retry_at: d.last_retry_at,
    payment_failed_at: d.payment_failed_at,
    next_payment_date: d.next_payment_date,
  }));

  // Merge and deduplicate
  const allDefaultersMap = new Map();
  [...allDefaulters, ...mappedLocalDefaulters].forEach(d => {
    allDefaultersMap.set(d.email + d.plan, d);
  });

  return { defaulted_subscribers: Array.from(allDefaultersMap.values()) };
}

async function markPaymentResolved(supabase: any, actorId: string, subscriberId: string) {
  const { error } = await supabase
    .from('subscribers')
    .update({
      status: 'active',
      retry_count: 0,
      payment_failed_at: null,
      last_retry_at: null,
    })
    .eq('id', subscriberId);

  if (error) throw error;

  await supabase.from('audit_logs').insert({
    actor_id: actorId,
    action: 'mark_payment_resolved',
    entity_type: 'subscriber',
    entity_id: subscriberId,
  });

  return { success: true };
}

async function getSuspensionAppeals(supabase: any, status?: string) {
  let query = supabase
    .from('suspension_appeals')
    .select('*, organizations(org_name, email, suspension_reason)')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return { appeals: data || [] };
}

async function approveAppeal(supabase: any, actorId: string, appealId: string, adminNotes?: string) {
  const { data: appeal, error: fetchError } = await supabase
    .from('suspension_appeals')
    .select('org_id')
    .eq('id', appealId)
    .single();

  if (fetchError) throw fetchError;

  const { error: appealError } = await supabase
    .from('suspension_appeals')
    .update({
      status: 'approved',
      processed_at: new Date().toISOString(),
      processed_by: actorId,
      admin_notes: adminNotes,
    })
    .eq('id', appealId);

  if (appealError) throw appealError;

  const { error: orgError } = await supabase
    .from('organizations')
    .update({
      is_suspended: false,
      suspended_at: null,
      suspended_by: null,
      suspension_reason: null,
    })
    .eq('id', appeal.org_id);

  if (orgError) throw orgError;

  await supabase.from('audit_logs').insert({
    actor_id: actorId,
    action: 'approve_suspension_appeal',
    entity_type: 'suspension_appeal',
    entity_id: appealId,
    details: { org_id: appeal.org_id, admin_notes: adminNotes },
  });

  return { success: true };
}

async function rejectAppeal(supabase: any, actorId: string, appealId: string, adminNotes: string) {
  const { data: appeal, error: fetchError } = await supabase
    .from('suspension_appeals')
    .select('org_id')
    .eq('id', appealId)
    .single();

  if (fetchError) throw fetchError;

  const { error } = await supabase
    .from('suspension_appeals')
    .update({
      status: 'rejected',
      processed_at: new Date().toISOString(),
      processed_by: actorId,
      admin_notes: adminNotes,
    })
    .eq('id', appealId);

  if (error) throw error;

  await supabase.from('audit_logs').insert({
    actor_id: actorId,
    action: 'reject_suspension_appeal',
    entity_type: 'suspension_appeal',
    entity_id: appealId,
    details: { org_id: appeal.org_id, admin_notes: adminNotes },
  });

  return { success: true };
}
