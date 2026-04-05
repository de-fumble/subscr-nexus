import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrgRole } from "@/hooks/useOrgRole";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Loader2, Shield, User, UserPlus, Trash2, Users, ChevronDown, ChevronUp, Mail, Calendar, Hash, Clock, UserX, UserCheck } from "lucide-react";
import { FloatingSupport } from "@/components/FloatingSupport";


interface Organization {
  id: string;
  org_name: string;
  email: string;
  logo_url?: string | null;
  is_clocked_out?: boolean;
}

interface StaffMember {
  id: string;
  user_id: string;
  role: 'admin' | 'staff';
  created_at: string;
  email?: string;
  is_suspended?: boolean;
}

interface StaffMemberCardProps {
  member: StaffMember;
  onUpdateRole: (memberId: string, newRole: 'admin' | 'staff') => void;
  onRemove: (memberId: string) => void;
  onToggleSuspend: (memberId: string, currentStatus: boolean) => void;
}

function StaffMemberCard({ member, onUpdateRole, onRemove, onToggleSuspend }: StaffMemberCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={`border rounded-lg bg-card overflow-hidden transition-opacity ${member.is_suspended ? 'opacity-80' : ''}`}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${member.is_suspended ? 'bg-amber-500/10' : 'bg-accent/10'}`}>
              {member.is_suspended ? (
                <UserX className="h-5 w-5 text-amber-500" />
              ) : member.role === 'admin' ? (
                <Shield className="h-5 w-5 text-accent" />
              ) : (
                <User className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-medium text-sm flex items-center gap-2">
                {member.email || `User ${member.user_id.slice(0, 8)}...`}
                {member.is_suspended && <Badge variant="outline" className="text-amber-500 border-amber-500/30">Suspended</Badge>}
              </p>
              <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="mt-1">
                {member.role === 'admin' ? 'Admin' : 'Staff'}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1">
                {isOpen ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Details
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Staff Member</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove the staff member's access to your organization. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onRemove(member.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        
        <CollapsibleContent>
          <div className="border-t px-4 py-4 bg-muted/30 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  Email
                </div>
                <p className="text-sm font-medium">{member.email || "N/A"}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Hash className="h-3 w-3" />
                  Member ID
                </div>
                <p className="text-sm font-mono text-muted-foreground">{member.id.slice(0, 8)}...</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Added On
                </div>
                <p className="text-sm font-medium">
                  {new Date(member.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  Role
                </div>
                <Select
                  value={member.role}
                  onValueChange={(value: 'admin' | 'staff') => onUpdateRole(member.id, value)}
                >
                  <SelectTrigger className="w-full h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        Staff (Read-only)
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-3 w-3" />
                        Admin (Full access)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium text-amber-600 dark:text-amber-500">Suspend Account</Label>
                <p className="text-xs text-muted-foreground">
                  Temporarily revoke this member's access to the workspace.
                </p>
              </div>
              <Button 
                variant={member.is_suspended ? "outline" : "destructive"} 
                size="sm"
                onClick={() => onToggleSuspend(member.id, !!member.is_suspended)}
                className="gap-2"
              >
                {member.is_suspended ? (
                  <>
                    <UserCheck className="h-4 w-4" />
                    Restore Access
                  </>
                ) : (
                  <>
                    <UserX className="h-4 w-4" />
                    Suspend Access
                  </>
                )}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default function DashboardStaff() {
  const navigate = useNavigate();
  const { role, canManageStaff, loading: roleLoading } = useOrgRole();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isClockedOut, setIsClockedOut] = useState(false);
  const [clockOutLoading, setClockOutLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "staff" as 'admin' | 'staff',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get organization
      const { data: orgData } = await supabase
        .from("organizations")
        .select("id, org_name, email, is_clocked_out")
        .eq("user_id", user.id)
        .single();

      if (orgData) {
        setOrganization(orgData);
        setIsClockedOut(orgData.is_clocked_out || false);
        
        // Fetch staff members using edge function to get emails
        const { data, error } = await supabase.functions.invoke('manage-staff', {
          body: {
            action: 'list_staff',
            org_id: orgData.id,
          },
        });

        if (!error && data?.members) {
          setMembers(data.members);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-staff', {
        body: {
          action: 'create_staff',
          org_id: organization.id,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('Staff member created successfully');
      setFormData({ email: "", password: "", role: "staff" });
      setShowAddForm(false);
      fetchData();
    } catch (error: any) {
      console.error('Error creating staff:', error);
      toast.error(error.message || 'Failed to create staff member');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: 'admin' | 'staff') => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;
      toast.success('Role updated successfully');
      fetchData();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const handleToggleSuspend = async (memberId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ is_suspended: !currentStatus })
        .eq('id', memberId);

      if (error) throw error;
      toast.success(currentStatus ? 'Staff access restored' : 'Staff access suspended');
      fetchData();
    } catch (error: any) {
      console.error('Error suspending member:', error);
      toast.error('Failed to update member status');
    }
  };

  const handleToggleClockOut = async (checked: boolean) => {
    if (!organization) return;
    setClockOutLoading(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ is_clocked_out: checked })
        .eq('id', organization.id);

      if (error) throw error;
      setIsClockedOut(checked);
      toast.success(checked ? 'Workspace clocked out. Staff can no longer login.' : 'Workspace accessible. Staff can now login.');
    } catch (error: any) {
      console.error('Error toggling clock out:', error);
      toast.error('Failed to update workspace status');
    } finally {
      setClockOutLoading(false);
    }
  };

  const handleRemoveStaff = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      toast.success('Staff member removed');
      fetchData();
    } catch (error: any) {
      console.error('Error removing staff:', error);
      toast.error('Failed to remove staff member');
    }
  };

  if (loading || roleLoading) {
    return (
      <SidebarInset className="flex-1">
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 glass-card px-4">
          <SidebarTrigger />
          <h1 className="text-xl font-bold text-foreground">Staff Management</h1>
        </header>
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4">
            <div className="h-48 bg-muted animate-pulse rounded-xl" />
            <div className="h-32 bg-muted animate-pulse rounded-xl" />
          </div>
        </main>
      </SidebarInset>
    );
  }

  if (!canManageStaff) {
    return (
      <SidebarInset className="flex-1">
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 glass-card px-4">
          <SidebarTrigger />
          <h1 className="text-xl font-bold text-foreground">Staff Management</h1>
        </header>
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
                <p className="text-muted-foreground text-center">
                  Only organization owners can manage staff members.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    );
  }

  return (
    <SidebarInset className="flex-1">
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 glass-card px-4">
        <SidebarTrigger />
        <div className="flex-1">
          <h1 className="text-lg sm:text-xl font-bold text-foreground">Staff Management</h1>
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

          <div className="bg-card border border-border/80 shadow-sm rounded-lg p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Clock Out Workspace
              </Label>
              <p className="text-sm text-muted-foreground max-w-xl">
                Lock the workspace. When clocked out, no staff members or admins aside from yourself will be able to login or access the system.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {clockOutLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <Switch 
                checked={isClockedOut}
                onCheckedChange={handleToggleClockOut}
                disabled={clockOutLoading}
                className="data-[state=checked]:bg-destructive"
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Staff Members
              </CardTitle>
              <CardDescription>
                Add and manage staff members for your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                  {/* Add Staff Button/Form */}
                  {!showAddForm ? (
                    <Button onClick={() => setShowAddForm(true)} className="gap-2 w-full sm:w-auto">
                      <UserPlus className="h-4 w-4" />
                      Add Staff Member
                    </Button>
                  ) : (
                    <form onSubmit={handleCreateStaff} className="border rounded-lg p-4 space-y-4 bg-muted/30">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="staff@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Password</Label>
                          <Input
                            id="password"
                            type="password"
                            placeholder="Min 6 characters"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            minLength={6}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select
                          value={formData.role}
                          onValueChange={(value: 'admin' | 'staff') => 
                            setFormData({ ...formData, role: value })
                          }
                        >
                          <SelectTrigger className="w-full md:w-64">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="staff">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Staff (Read-only access)
                              </div>
                            </SelectItem>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Admin (Full access except staff management)
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" disabled={creating}>
                          {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                          Create Staff Account
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowAddForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Staff Members List */}
                  {members.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border rounded-lg">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No staff members yet. Add your first staff member above.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {members.map((member) => (
                        <StaffMemberCard
                          key={member.id}
                          member={member}
                          onUpdateRole={handleUpdateRole}
                          onRemove={handleRemoveStaff}
                          onToggleSuspend={handleToggleSuspend}
                        />
                      ))}
                    </div>
                  )}
            </CardContent>
          </Card>

          {/* Role Permissions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Role Permissions</CardTitle>
              <CardDescription>
                Understanding what each role can do
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary">Staff</Badge>
                    <span className="text-sm text-muted-foreground">(Read-only)</span>
                  </div>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li className="flex items-center gap-2">✓ View analytics</li>
                    <li className="flex items-center gap-2">✓ View subscribers</li>
                    <li className="flex items-center gap-2">✓ View plans</li>
                    <li className="flex items-center gap-2">✓ View activity logs</li>
                    <li className="flex items-center gap-2">✓ View defaulted subscribers</li>
                    <li className="flex items-center gap-2 text-destructive">✗ Cannot modify data</li>
                    <li className="flex items-center gap-2 text-destructive">✗ Cannot access settings</li>
                    <li className="flex items-center gap-2 text-destructive">✗ Cannot request payouts</li>
                  </ul>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="default">Admin</Badge>
                    <span className="text-sm text-muted-foreground">(Full access)</span>
                  </div>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li className="flex items-center gap-2">✓ All staff permissions</li>
                    <li className="flex items-center gap-2">✓ Create/edit/delete subscribers</li>
                    <li className="flex items-center gap-2">✓ Create/edit/delete plans</li>
                    <li className="flex items-center gap-2">✓ Request payouts</li>
                    <li className="flex items-center gap-2">✓ View billing history</li>
                    <li className="flex items-center gap-2">✓ Modify organization details</li>
                    <li className="flex items-center gap-2 text-destructive">✗ Cannot manage staff</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <FloatingSupport />
      </main>
    </SidebarInset>
  );
}
