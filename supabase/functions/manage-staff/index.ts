import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { action, ...params } = await req.json();
    console.log(`Staff management action: ${action}`, params);

    let result;

    switch (action) {
      case 'create_staff':
        result = await createStaff(supabase, user.id, params);
        break;
      
      case 'update_staff_role':
        result = await updateStaffRole(supabase, user.id, params);
        break;
      
      case 'remove_staff':
        result = await removeStaff(supabase, user.id, params);
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
    console.error('Staff management error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function createStaff(supabase: any, actorId: string, params: { org_id: string; email: string; password: string; role: string }) {
  const { org_id, email, password, role } = params;

  // Verify the actor is the org owner
  const { data: org } = await supabase
    .from('organizations')
    .select('id, user_id')
    .eq('id', org_id)
    .single();

  if (!org || org.user_id !== actorId) {
    throw new Error('Only organization owners can add staff');
  }

  // Create the new user account
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email for staff
    user_metadata: {
      is_staff: true,
      org_id: org_id,
    },
  });

  if (authError) {
    console.error('Error creating user:', authError);
    throw new Error(authError.message || 'Failed to create user account');
  }

  // Add the user to organization_members
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      org_id,
      user_id: authData.user.id,
      role: role,
      invited_by: actorId,
    });

  if (memberError) {
    // Cleanup: delete the created user if membership fails
    await supabase.auth.admin.deleteUser(authData.user.id);
    console.error('Error adding member:', memberError);
    throw new Error('Failed to add staff member');
  }

  // Log the action
  await supabase.from('audit_logs').insert({
    actor_id: actorId,
    action: 'create_staff',
    entity_type: 'organization',
    entity_id: org_id,
    module: 'staff',
    details: { staff_email: email, role },
  });

  return { 
    success: true, 
    user_id: authData.user.id 
  };
}

async function updateStaffRole(supabase: any, actorId: string, params: { member_id: string; new_role: string }) {
  const { member_id, new_role } = params;

  // Get the member to verify org ownership
  const { data: member } = await supabase
    .from('organization_members')
    .select('*, organizations(*)')
    .eq('id', member_id)
    .single();

  if (!member) {
    throw new Error('Member not found');
  }

  // Verify actor is org owner
  const { data: org } = await supabase
    .from('organizations')
    .select('user_id')
    .eq('id', member.org_id)
    .single();

  if (!org || org.user_id !== actorId) {
    throw new Error('Only organization owners can change staff roles');
  }

  const { error } = await supabase
    .from('organization_members')
    .update({ role: new_role })
    .eq('id', member_id);

  if (error) throw error;

  // Log the action
  await supabase.from('audit_logs').insert({
    actor_id: actorId,
    action: 'update_staff_role',
    entity_type: 'organization',
    entity_id: member.org_id,
    module: 'staff',
    details: { member_id, old_role: member.role, new_role },
  });

  return { success: true };
}

async function removeStaff(supabase: any, actorId: string, params: { member_id: string }) {
  const { member_id } = params;

  // Get the member
  const { data: member } = await supabase
    .from('organization_members')
    .select('*')
    .eq('id', member_id)
    .single();

  if (!member) {
    throw new Error('Member not found');
  }

  // Verify actor is org owner
  const { data: org } = await supabase
    .from('organizations')
    .select('user_id')
    .eq('id', member.org_id)
    .single();

  if (!org || org.user_id !== actorId) {
    throw new Error('Only organization owners can remove staff');
  }

  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('id', member_id);

  if (error) throw error;

  // Log the action
  await supabase.from('audit_logs').insert({
    actor_id: actorId,
    action: 'remove_staff',
    entity_type: 'organization',
    entity_id: member.org_id,
    module: 'staff',
    details: { member_id, user_id: member.user_id },
  });

  return { success: true };
}
