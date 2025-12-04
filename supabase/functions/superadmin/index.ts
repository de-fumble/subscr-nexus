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

async function getAllOrganizations(supabase: any) {
  const { data: organizations, error } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Get subscriber counts and revenue for each org
  const orgsWithStats = await Promise.all(organizations.map(async (org: any) => {
    const { data: plans } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('org_id', org.id);

    const planIds = plans?.map((p: any) => p.id) || [];

    let activeSubscribers = 0;
    let totalRevenue = 0;

    if (planIds.length > 0) {
      const { count } = await supabase
        .from('subscribers')
        .select('*', { count: 'exact', head: true })
        .in('plan_id', planIds)
        .not('status', 'in', '(cancelled,canceled,expired)');
      
      activeSubscribers = count || 0;

      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount')
        .in('subscriber_id', (await supabase.from('subscribers').select('id').in('plan_id', planIds)).data?.map((s: any) => s.id) || [])
        .eq('status', 'success');

      totalRevenue = transactions?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;
    }

    return {
      ...org,
      active_subscribers: activeSubscribers,
      total_revenue: totalRevenue,
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

  // Get subscribers
  const planIds = plans?.map((p: any) => p.id) || [];
  let subscribers: any[] = [];
  
  if (planIds.length > 0) {
    const { data } = await supabase
      .from('subscribers')
      .select('*, subscription_plans(name, price, interval)')
      .in('plan_id', planIds);
    subscribers = data || [];
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
    subscribers: subscribers,
    payout_requests: payoutRequests || [],
    deletion_requests: deletionRequests || [],
  };
}

async function getOrganizationAnalytics(supabase: any, orgId: string) {
  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('org_id', orgId);

  const planIds = plans?.map((p: any) => p.id) || [];
  
  if (planIds.length === 0) {
    return {
      total_revenue: 0,
      recurring_revenue: 0,
      platform_fee: 0,
      active_subscribers: 0,
      churned_subscribers: 0,
      defaulted_subscribers: 0,
      new_subscribers_this_month: 0,
      subscriber_growth_rate: 0,
      churn_rate: 0,
      arpu: 0,
      revenue_by_plan: [],
      monthly_revenue_trend: [],
      subscribers_by_plan: [],
      plan_distribution: [],
    };
  }

  // Get all subscribers
  const { data: allSubscribers } = await supabase
    .from('subscribers')
    .select('*, subscription_plans(name, price)')
    .in('plan_id', planIds);

  const subscribers = allSubscribers || [];
  
  const activeStatuses = ['active'];
  const churnedStatuses = ['cancelled', 'canceled', 'expired'];
  const defaultedStatuses = ['attention', 'paused', 'non-renewing'];

  const activeSubscribers = subscribers.filter((s: any) => activeStatuses.includes(s.status));
  const churnedSubscribers = subscribers.filter((s: any) => churnedStatuses.includes(s.status));
  const defaultedSubscribers = subscribers.filter((s: any) => defaultedStatuses.includes(s.status));

  // New subscribers this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const newSubscribers = subscribers.filter((s: any) => new Date(s.created_at) >= startOfMonth);

  // Get transactions for revenue calculation
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

  // Platform fee calculation: ₦1,500 flat per transaction
  const platformFee = transactionCount * PLATFORM_FEE_PER_TRANSACTION;
  const recurringRevenue = Math.max(0, totalRevenue - platformFee);

  // Revenue by plan
  const revenueByPlan = plans?.map((plan: any) => {
    const planSubscribers = subscribers.filter((s: any) => s.plan_id === plan.id);
    const planSubscriberIds = planSubscribers.map((s: any) => s.id);
    const planTransactions = transactions.filter((t: any) => planSubscriberIds.includes(t.subscriber_id));
    const planRevenue = planTransactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
    const planFee = planTransactions.length * PLATFORM_FEE_PER_TRANSACTION;
    
    return {
      name: plan.name,
      revenue: planRevenue,
      platform_fee: planFee,
      net_revenue: Math.max(0, planRevenue - planFee),
      active_subscribers: planSubscribers.filter((s: any) => activeStatuses.includes(s.status)).length,
    };
  }) || [];

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
      monthlyRevenue[key].revenue += t.amount || 0;
      monthlyRevenue[key].transactions += 1;
    }
  });

  const monthlyRevenueTrend = Object.entries(monthlyRevenue).map(([month, data]) => ({
    month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    revenue: data.revenue,
    platform_fee: data.transactions * PLATFORM_FEE_PER_TRANSACTION,
    net_revenue: Math.max(0, data.revenue - (data.transactions * PLATFORM_FEE_PER_TRANSACTION)),
  }));

  // Subscribers by plan
  const subscribersByPlan = plans?.map((plan: any) => {
    const planSubscribers = subscribers.filter((s: any) => s.plan_id === plan.id);
    return {
      name: plan.name,
      active: planSubscribers.filter((s: any) => activeStatuses.includes(s.status)).length,
      defaulted: planSubscribers.filter((s: any) => defaultedStatuses.includes(s.status)).length,
      churned: planSubscribers.filter((s: any) => churnedStatuses.includes(s.status)).length,
    };
  }) || [];

  // Plan distribution
  const totalActive = activeSubscribers.length;
  const planDistribution = plans?.map((plan: any) => {
    const planActive = subscribers.filter((s: any) => s.plan_id === plan.id && activeStatuses.includes(s.status)).length;
    return {
      name: plan.name,
      count: planActive,
      percentage: totalActive > 0 ? Math.round((planActive / totalActive) * 100) : 0,
    };
  }) || [];

  // Churn rate
  const totalSubscribersAtStart = subscribers.length;
  const churnRate = totalSubscribersAtStart > 0 
    ? Math.round((churnedSubscribers.length / totalSubscribersAtStart) * 100 * 10) / 10 
    : 0;

  // ARPU
  const arpu = activeSubscribers.length > 0 
    ? Math.round(totalRevenue / activeSubscribers.length) 
    : 0;

  // Subscriber growth rate (compare to last month)
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const subscribersLastMonth = subscribers.filter((s: any) => new Date(s.created_at) < lastMonth).length;
  const subscriberGrowthRate = subscribersLastMonth > 0
    ? Math.round(((subscribers.length - subscribersLastMonth) / subscribersLastMonth) * 100 * 10) / 10
    : 0;

  return {
    total_revenue: totalRevenue,
    recurring_revenue: recurringRevenue,
    platform_fee: platformFee,
    transaction_count: transactionCount,
    active_subscribers: activeSubscribers.length,
    churned_subscribers: churnedSubscribers.length,
    defaulted_subscribers: defaultedSubscribers.length,
    new_subscribers_this_month: newSubscribers.length,
    subscriber_growth_rate: subscriberGrowthRate,
    churn_rate: churnRate,
    arpu,
    revenue_by_plan: revenueByPlan,
    monthly_revenue_trend: monthlyRevenueTrend,
    subscribers_by_plan: subscribersByPlan,
    plan_distribution: planDistribution,
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

  // Log audit
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

  // Actually delete the organization
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
    .select('*, organizations(org_name, email)')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return { payout_requests: data };
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
  // Total organizations
  const { count: totalOrgs } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true });

  // Active organizations (not suspended)
  const { count: activeOrgs } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true })
    .eq('is_suspended', false);

  // Suspended organizations
  const { count: suspendedOrgs } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true })
    .eq('is_suspended', true);

  // Total subscribers
  const { count: totalSubscribers } = await supabase
    .from('subscribers')
    .select('*', { count: 'exact', head: true });

  // Active subscribers
  const { count: activeSubscribers } = await supabase
    .from('subscribers')
    .select('*', { count: 'exact', head: true })
    .not('status', 'in', '(cancelled,canceled,expired)');

  // Total transactions
  const { data: transactions, count: transactionCount } = await supabase
    .from('transactions')
    .select('amount', { count: 'exact' })
    .eq('status', 'success');

  const totalRevenue = transactions?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;

  // Platform earnings: ₦1,500 flat per transaction
  const platformEarnings = (transactionCount || 0) * PLATFORM_FEE_PER_TRANSACTION;

  // Pending payouts
  const { count: pendingPayouts } = await supabase
    .from('payout_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  // Pending deletions
  const { count: pendingDeletions } = await supabase
    .from('deletion_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  // Pending appeals
  const { count: pendingAppeals } = await supabase
    .from('suspension_appeals')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  return {
    total_organizations: totalOrgs || 0,
    active_organizations: activeOrgs || 0,
    suspended_organizations: suspendedOrgs || 0,
    total_subscribers: totalSubscribers || 0,
    active_subscribers: activeSubscribers || 0,
    total_revenue: totalRevenue,
    platform_earnings: platformEarnings,
    transaction_count: transactionCount || 0,
    pending_payouts: pendingPayouts || 0,
    pending_deletions: pendingDeletions || 0,
    pending_appeals: pendingAppeals || 0,
  };
}

async function getDefaultedSubscribers(supabase: any, orgId?: string) {
  let query = supabase
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
      query = query.in('plan_id', planIds);
    } else {
      return { defaulted_subscribers: [] };
    }
  }

  const { data, error } = await query.order('payment_failed_at', { ascending: false });
  if (error) throw error;

  return { defaulted_subscribers: data || [] };
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
  // Get the appeal to find the org_id
  const { data: appeal, error: fetchError } = await supabase
    .from('suspension_appeals')
    .select('org_id')
    .eq('id', appealId)
    .single();

  if (fetchError) throw fetchError;

  // Update the appeal
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

  // Restore the organization
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

  // Log audit
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

  // Log audit
  await supabase.from('audit_logs').insert({
    actor_id: actorId,
    action: 'reject_suspension_appeal',
    entity_type: 'suspension_appeal',
    entity_id: appealId,
    details: { org_id: appeal.org_id, admin_notes: adminNotes },
  });

  return { success: true };
}