import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import {
  DEPARTMENT_DESCRIPTIONS,
  DEPARTMENT_LABELS,
  type SuperadminDepartment,
} from "@/lib/superadminPermissions";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PremiumLoader } from "@/components/PremiumLoader";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  Calculator,
  Server,
  Megaphone,
  Loader2,
} from "lucide-react";

interface TeamMember {
  user_id: string;
  email: string;
  departments: SuperadminDepartment[];
  assigned_at: string;
}

const DEPARTMENT_ICONS: Record<SuperadminDepartment, typeof Shield> = {
  auditor: Calculator,
  it_admin: Server,
  marketing: Megaphone,
};

const DEPARTMENT_COLORS: Record<SuperadminDepartment, string> = {
  auditor: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  it_admin: "bg-violet-500/10 text-violet-600 border-violet-500/30",
  marketing: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
};

const ALL_DEPARTMENTS: SuperadminDepartment[] = ['auditor', 'it_admin', 'marketing'];

export default function SuperAdminTeam() {
  const navigate = useNavigate();
  const { isSuperadmin, loading: authLoading, invokeSuperadmin, refreshAccess } = useSuperadmin();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState<SuperadminDepartment>("auditor");

  useEffect(() => {
    if (!authLoading && !isSuperadmin) {
      navigate("/superadmin");
      toast.error("Only full superadmins can manage team roles.");
    }
  }, [authLoading, isSuperadmin, navigate]);

  useEffect(() => {
    if (isSuperadmin) fetchTeam();
  }, [isSuperadmin]);

  const fetchTeam = async () => {
    try {
      const data = await invokeSuperadmin("list_team_members");
      setMembers(data.members || []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load team";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    setAssigning(true);
    try {
      await invokeSuperadmin("assign_department_role", {
        email: email.trim().toLowerCase(),
        department,
      });
      toast.success(`${DEPARTMENT_LABELS[department]} role assigned to ${email}`);
      setEmail("");
      await fetchTeam();
      await refreshAccess();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to assign role";
      toast.error(message);
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async (userId: string, dept: SuperadminDepartment) => {
    try {
      await invokeSuperadmin("remove_department_role", {
        user_id: userId,
        department: dept,
      });
      toast.success(`${DEPARTMENT_LABELS[dept]} role removed`);
      await fetchTeam();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to remove role";
      toast.error(message);
    }
  };

  if (authLoading || loading) {
    return <PremiumLoader fullScreen message="Loading team..." />;
  }

  if (!isSuperadmin) return null;

  return (
    <div className="container py-6 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-7 w-7 text-primary" />
          Team & Roles
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Delegate superadmin dashboard access by department
        </p>
      </div>

      {/* Department overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        {ALL_DEPARTMENTS.map((dept) => {
          const Icon = DEPARTMENT_ICONS[dept];
          const count = members.filter((m) => m.departments.includes(dept)).length;
          return (
            <Card key={dept} className="border-black/5 dark:border-white/5">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${DEPARTMENT_COLORS[dept]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base">{DEPARTMENT_LABELS[dept]}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-2">{DEPARTMENT_DESCRIPTIONS[dept]}</p>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">assigned member{count !== 1 ? "s" : ""}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Assign role */}
      <Card className="border-black/5 dark:border-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5" />
            Assign Department Role
          </CardTitle>
          <CardDescription>
            The user must already have a Recurra account. They will see only the sections for their department.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="email">User email</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="sm:w-48 space-y-1.5">
              <Label>Department</Label>
              <Select value={department} onValueChange={(v) => setDepartment(v as SuperadminDepartment)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {DEPARTMENT_LABELS[dept]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleAssign} disabled={assigning}>
                {assigning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                Assign
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team list */}
      <Card className="border-black/5 dark:border-white/5">
        <CardHeader>
          <CardTitle className="text-lg">Current Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No department roles assigned yet. Use the form above to delegate access.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Departments</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.user_id}>
                    <TableCell className="font-medium">{member.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {member.departments.map((dept) => (
                          <Badge key={dept} variant="outline" className={DEPARTMENT_COLORS[dept]}>
                            {DEPARTMENT_LABELS[dept]}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {member.departments.map((dept) => (
                        <AlertDialog key={dept}>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove {DEPARTMENT_LABELS[dept]} role?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {member.email} will lose access to {DEPARTMENT_LABELS[dept]} sections.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRemove(member.user_id, dept)}>
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
