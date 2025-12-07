import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Trash2, Shield, User, ChevronDown, ChevronUp, Mail, Calendar, Hash } from "lucide-react";
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

interface StaffMember {
  id: string;
  user_id: string;
  role: 'admin' | 'staff';
  created_at: string;
  email?: string;
}

interface StaffManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
}

interface StaffMemberCardProps {
  member: StaffMember;
  onUpdateRole: (memberId: string, newRole: 'admin' | 'staff') => void;
  onRemove: (memberId: string) => void;
}

function StaffMemberCard({ member, onUpdateRole, onRemove }: StaffMemberCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg bg-card overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
              {member.role === 'admin' ? (
                <Shield className="h-5 w-5 text-accent" />
              ) : (
                <User className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-medium text-sm">{member.email || "N/A"}</p>
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
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function StaffManagementDialog({
  open,
  onOpenChange,
  orgId,
}: StaffManagementDialogProps) {
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
    if (open && orgId) {
      fetchMembers();
    }
  }, [open, orgId]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-staff', {
        body: {
          action: 'list_staff',
          org_id: orgId,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      setMembers(data.members || []);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load staff members');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
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
      // Call the edge function to create staff member
      const { data, error } = await supabase.functions.invoke('manage-staff', {
        body: {
          action: 'create_staff',
          org_id: orgId,
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
      fetchMembers();
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
      fetchMembers();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const handleRemoveStaff = async (memberId: string) => {
    try {
      // Use edge function to properly delete user and membership
      const { data, error } = await supabase.functions.invoke('manage-staff', {
        body: {
          action: 'remove_staff',
          member_id: memberId,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('Staff member removed');
      fetchMembers();
    } catch (error: any) {
      console.error('Error removing staff:', error);
      toast.error(error.message || 'Failed to remove staff member');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Staff Management
          </DialogTitle>
          <DialogDescription>
            Add and manage staff members for your organization. Staff have read-only access, while admins can modify data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add Staff Button/Form */}
          {!showAddForm ? (
            <Button onClick={() => setShowAddForm(true)} className="w-full gap-2">
              <UserPlus className="h-4 w-4" />
              Add Staff Member
            </Button>
          ) : (
            <form onSubmit={handleCreateStaff} className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="grid grid-cols-2 gap-4">
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Staff (Read-only)
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Admin (Full access)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={creating} className="flex-1">
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
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No staff members yet. Add your first staff member above.
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <StaffMemberCard
                  key={member.id}
                  member={member}
                  onUpdateRole={handleUpdateRole}
                  onRemove={handleRemoveStaff}
                />
              ))}
            </div>
          )}

          {/* Role Descriptions */}
          <div className="border rounded-lg p-4 bg-muted/30 text-sm space-y-2">
            <h4 className="font-medium">Role Permissions</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Badge variant="secondary" className="mb-1">Staff</Badge>
                <ul className="text-muted-foreground text-xs space-y-1">
                  <li>• View analytics (read-only)</li>
                  <li>• View subscribers (read-only)</li>
                  <li>• View plans (read-only)</li>
                  <li>• View logs (read-only)</li>
                </ul>
              </div>
              <div>
                <Badge variant="default" className="mb-1">Admin</Badge>
                <ul className="text-muted-foreground text-xs space-y-1">
                  <li>• All staff permissions</li>
                  <li>• Manage subscribers</li>
                  <li>• Manage plans</li>
                  <li>• Request payouts</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
