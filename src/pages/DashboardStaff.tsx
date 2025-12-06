import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrgRole } from "@/hooks/useOrgRole";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { toast } from "sonner";
import { Loader2, Shield, User, UserPlus, Trash2, Users } from "lucide-react";

interface Organization {
  id: string;
  org_name: string;
  email: string;
}

interface StaffMember {
  id: string;
  user_id: string;
  role: 'admin' | 'staff';
  created_at: string;
}

export default function DashboardStaff() {
  const navigate = useNavigate();
  const { role, canManageStaff, loading: roleLoading } = useOrgRole();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
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
        .select("id, org_name, email")
        .eq("user_id", user.id)
        .single();

      if (orgData) {
        setOrganization(orgData);
        
        // Fetch staff members
        const { data: membersData } = await supabase
          .from('organization_members')
          .select('*')
          .eq('org_id', orgData.id)
          .order('created_at', { ascending: false });
        
        setMembers(membersData || []);
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
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!canManageStaff) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar organization={organization} />
          <SidebarInset className="flex-1">
            <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 glass-card px-4">
              <SidebarTrigger />
              <h1 className="text-xl font-bold text-foreground">Staff Management</h1>
            </header>
            <main className="flex-1 overflow-auto">
              <div className="container mx-auto px-6 py-8">
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
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar organization={organization} />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 glass-card px-4">
            <SidebarTrigger />
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">Staff Management</h1>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-6 py-8 space-y-6">
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
                    <Button onClick={() => setShowAddForm(true)} className="gap-2">
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

                  {/* Staff Members Table */}
                  {members.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border rounded-lg">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No staff members yet. Add your first staff member above.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member ID</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Added</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell className="font-mono text-xs">
                              {member.user_id.slice(0, 8)}...
                            </TableCell>
                            <TableCell>
                              <Select
                                value={member.role}
                                onValueChange={(value: 'admin' | 'staff') => 
                                  handleUpdateRole(member.id, value)
                                }
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="staff">
                                    <Badge variant="secondary">Staff</Badge>
                                  </SelectItem>
                                  <SelectItem value="admin">
                                    <Badge variant="default">Admin</Badge>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {new Date(member.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive">
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
                                      onClick={() => handleRemoveStaff(member.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Remove
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
