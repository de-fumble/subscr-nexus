import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrgRole } from "@/hooks/useOrgRole";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
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
import { toast } from "sonner";
import {
  Loader2, Shield, User, UserPlus, Trash2, Users,
  ChevronDown, Mail, Calendar, Clock, UserX, UserCheck,
} from "lucide-react";
import { FloatingSupport } from "@/components/FloatingSupport";
import { APPLE_FONT, card, pageInner, sectionLabel, pillBtn } from "@/lib/appleLayout";

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
  role: "admin" | "staff";
  created_at: string;
  email?: string;
  is_suspended?: boolean;
}

// ── Staff row ──────────────────────────────────────────────────────────────
function StaffRow({
  member,
  index,
  onUpdateRole,
  onRemove,
  onToggleSuspend,
}: {
  member: StaffMember;
  index: number;
  onUpdateRole: (id: string, role: "admin" | "staff") => void;
  onRemove: (id: string) => void;
  onToggleSuspend: (id: string, current: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const isAdmin = member.role === "admin";
  const isSuspended = !!member.is_suspended;

  return (
    <div
      className="staff-row"
      style={{ animationDelay: `${index * 55}ms` }}
    >
      {/* Primary row */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="staff-row-header group"
      >
        {/* Avatar */}
        <span
          className={`staff-avatar ${
            isSuspended
              ? "staff-avatar--suspended"
              : isAdmin
              ? "staff-avatar--admin"
              : "staff-avatar--staff"
          }`}
        >
          {isSuspended ? (
            <UserX className="h-4 w-4" />
          ) : isAdmin ? (
            <Shield className="h-4 w-4" />
          ) : (
            <User className="h-4 w-4" />
          )}
        </span>

        {/* Identity */}
        <span className="flex-1 min-w-0 text-left">
          <span className="staff-email">
            {member.email || `User ${member.user_id.slice(0, 8)}…`}
          </span>
          <span className="staff-meta-row">
            <span className={`staff-role-pill ${isAdmin ? "staff-role-pill--admin" : "staff-role-pill--staff"}`}>
              {isAdmin ? "Admin" : "Staff"}
            </span>
            {isSuspended && (
              <span className="staff-role-pill staff-role-pill--suspended">Suspended</span>
            )}
            <span className="staff-joined">
              <Calendar className="h-3 w-3" />
              {new Date(member.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </span>
        </span>

        {/* Chevron */}
        <ChevronDown
          className="staff-chevron"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {/* Expanded detail panel */}
      <div className={`staff-detail ${expanded ? "staff-detail--open" : ""}`}>
        <div className="staff-detail-inner">
          {/* Detail grid */}
          <div className="staff-detail-grid">
            <div className="staff-detail-field">
              <span className="staff-detail-label">
                <Mail className="h-3 w-3" /> Email
              </span>
              <span className="staff-detail-value">{member.email || "—"}</span>
            </div>
            <div className="staff-detail-field">
              <span className="staff-detail-label">
                <Calendar className="h-3 w-3" /> Added
              </span>
              <span className="staff-detail-value">
                {new Date(member.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Role selector */}
          <div className="mt-4">
            <p className="staff-detail-label mb-1.5">
              <Shield className="h-3 w-3" /> Role
            </p>
            <Select
              value={member.role}
              onValueChange={(v: "admin" | "staff") => onUpdateRole(member.id, v)}
            >
              <SelectTrigger className="h-8 w-44 text-xs rounded-lg border-black/10 dark:border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">
                  <span className="flex items-center gap-2 text-xs">
                    <User className="h-3 w-3" /> Staff — Read-only
                  </span>
                </SelectItem>
                <SelectItem value="admin">
                  <span className="flex items-center gap-2 text-xs">
                    <Shield className="h-3 w-3" /> Admin — Full access
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions row */}
          <div className="staff-actions">
            <button
              onClick={() => onToggleSuspend(member.id, isSuspended)}
              className={`staff-action-btn ${isSuspended ? "staff-action-btn--restore" : "staff-action-btn--suspend"}`}
            >
              {isSuspended ? (
                <><UserCheck className="h-3.5 w-3.5" /> Restore Access</>
              ) : (
                <><UserX className="h-3.5 w-3.5" /> Suspend</>
              )}
            </button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="staff-action-btn staff-action-btn--remove">
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent style={{ fontFamily: APPLE_FONT }}>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-[17px] font-semibold tracking-[-0.02em]">
                    Remove Staff Member?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-[13px] text-black/50 dark:text-white/50">
                    This will permanently revoke their access. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="text-[13px] h-8 rounded-lg">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onRemove(member.id)}
                    className="text-[13px] h-8 rounded-lg bg-red-500 hover:bg-red-600 text-white"
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add staff form ──────────────────────────────────────────────────────────
function AddStaffForm({
  onSubmit,
  onCancel,
  creating,
}: {
  onSubmit: (data: { email: string; password: string; role: "admin" | "staff" }) => void;
  onCancel: () => void;
  creating: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("staff");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ email, password, role });
      }}
      className="staff-add-form"
    >
      <p className="text-[13px] font-semibold text-black dark:text-white mb-4 tracking-[-0.01em]">
        New Staff Account
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div className="space-y-1.5">
          <label className="staff-field-label">Email</label>
          <input
            type="email"
            required
            placeholder="staff@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="staff-input"
          />
        </div>
        <div className="space-y-1.5">
          <label className="staff-field-label">Password</label>
          <input
            type="password"
            required
            minLength={6}
            placeholder="Min. 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="staff-input"
          />
        </div>
      </div>

      <div className="mb-5 space-y-1.5">
        <label className="staff-field-label">Role</label>
        <Select value={role} onValueChange={(v: "admin" | "staff") => setRole(v)}>
          <SelectTrigger className="h-9 text-[13px] rounded-lg border-black/10 dark:border-white/10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="staff">
              <span className="flex items-center gap-2 text-[13px]">
                <User className="h-3.5 w-3.5" /> Staff — Read-only access
              </span>
            </SelectItem>
            <SelectItem value="admin">
              <span className="flex items-center gap-2 text-[13px]">
                <Shield className="h-3.5 w-3.5" /> Admin — Full access
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={creating} className={pillBtn}>
          {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
          {creating ? "Creating…" : "Create Account"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/5 dark:bg-white/8 text-black/60 dark:text-white/60 text-[12px] font-medium transition-all hover:bg-black/8 dark:hover:bg-white/12"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
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

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data: orgData } = await supabase
        .from("organizations")
        .select("id, org_name, email, is_clocked_out")
        .eq("user_id", user.id)
        .single();

      if (orgData) {
        setOrganization(orgData);
        setIsClockedOut(orgData.is_clocked_out || false);
        const { data, error } = await supabase.functions.invoke("manage-staff", {
          body: { action: "list_staff", org_id: orgData.id },
        });
        if (!error && data?.members) setMembers(data.members);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async ({ email, password, role }: {
    email: string; password: string; role: "admin" | "staff";
  }) => {
    if (!organization) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-staff", {
        body: { action: "create_staff", org_id: organization.id, email, password, role },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      toast.success("Staff member created");
      setShowAddForm(false);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Failed to create staff member");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: "admin" | "staff") => {
    try {
      const { error } = await supabase
        .from("organization_members")
        .update({ role: newRole })
        .eq("id", memberId);
      if (error) throw error;
      toast.success("Role updated");
      fetchData();
    } catch { toast.error("Failed to update role"); }
  };

  const handleToggleSuspend = async (memberId: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from("organization_members")
        .update({ is_suspended: !current })
        .eq("id", memberId);
      if (error) throw error;
      toast.success(current ? "Access restored" : "Access suspended");
      fetchData();
    } catch { toast.error("Failed to update status"); }
  };

  const handleToggleClockOut = async (checked: boolean) => {
    if (!organization) return;
    setClockOutLoading(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ is_clocked_out: checked })
        .eq("id", organization.id);
      if (error) throw error;
      setIsClockedOut(checked);
      toast.success(checked ? "Workspace locked" : "Workspace unlocked");
    } catch { toast.error("Failed to update workspace status"); }
    finally { setClockOutLoading(false); }
  };

  const handleRemoveStaff = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
      toast.success("Staff member removed");
      fetchData();
    } catch { toast.error("Failed to remove staff member"); }
  };

  // ── Shell header (always shown) ──
  const Header = () => (
    <header
      className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-black/5 dark:border-white/5 bg-[#f5f5f7]/90 dark:bg-black/90 backdrop-blur-md px-4"
      style={{ fontFamily: APPLE_FONT }}
    >
      <SidebarTrigger className="opacity-40 hover:opacity-70 transition-opacity" />
      <h1 className="text-[15px] font-semibold text-black dark:text-white tracking-[-0.01em]">
        Staff
      </h1>
    </header>
  );

  // ── Loading ──
  if (loading || roleLoading) {
    return (
      <SidebarInset className="flex-1">
        <Header />
        <main className="flex-1 overflow-auto bg-[#f5f5f7] dark:bg-[#000]" style={{ fontFamily: APPLE_FONT }}>
          <div className={pageInner}>
            <div className="h-[72px] bg-black/4 dark:bg-white/4 animate-pulse rounded-[16px]" />
            <div className="h-[200px] bg-black/4 dark:bg-white/4 animate-pulse rounded-[16px]" />
            <div className="h-[160px] bg-black/4 dark:bg-white/4 animate-pulse rounded-[16px]" />
          </div>
        </main>
      </SidebarInset>
    );
  }

  // ── Access denied ──
  if (!canManageStaff) {
    return (
      <SidebarInset className="flex-1">
        <Header />
        <main className="flex-1 overflow-auto bg-[#f5f5f7] dark:bg-[#000]" style={{ fontFamily: APPLE_FONT }}>
          <div className={pageInner}>
            <div className={`${card} p-16 flex flex-col items-center text-center`}>
              <Shield className="h-9 w-9 text-black/15 dark:text-white/15 mb-3" />
              <p className="text-[15px] font-semibold text-black dark:text-white tracking-[-0.01em] mb-1">
                Access Restricted
              </p>
              <p className="text-[13px] text-black/40 dark:text-white/40">
                Only organisation owners can manage staff.
              </p>
            </div>
          </div>
        </main>
      </SidebarInset>
    );
  }

  // ── Main ──
  const admins  = members.filter((m) => m.role === "admin");
  const staff   = members.filter((m) => m.role === "staff");

  return (
    <SidebarInset className="flex-1">
      <Header />
      <main className="flex-1 overflow-auto bg-[#f5f5f7] dark:bg-[#000]" style={{ fontFamily: APPLE_FONT }}>
        <div className={pageInner}>

          {/* ── Clock-out card ── */}
          <div>
            <p className={sectionLabel}>Workspace</p>
            <div className={`${card} px-5 py-4 flex items-center justify-between gap-6`}>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/5 dark:bg-white/8 shrink-0">
                  <Clock className="h-4 w-4 text-black/50 dark:text-white/50" />
                </span>
                <div>
                  <p className="text-[14px] font-semibold text-black dark:text-white tracking-[-0.01em]">
                    Clock Out Workspace
                  </p>
                  <p className="text-[12px] text-black/40 dark:text-white/40 mt-0.5 max-w-sm leading-relaxed">
                    Lock the workspace. No staff or admins can log in while this is active.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {clockOutLoading && <Loader2 className="h-4 w-4 animate-spin text-black/30 dark:text-white/30" />}
                <Switch
                  checked={isClockedOut}
                  onCheckedChange={handleToggleClockOut}
                  disabled={clockOutLoading}
                  className="data-[state=checked]:bg-destructive"
                />
              </div>
            </div>
          </div>

          {/* ── Staff members ── */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <p className={sectionLabel} style={{ marginBottom: 0 }}>
                Members · {members.length}
              </p>
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className={pillBtn}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add member
                </button>
              )}
            </div>

            <div className={card}>
              {/* Add form */}
              {showAddForm && (
                <div className="px-5 pt-5 pb-4 border-b border-black/5 dark:border-white/5">
                  <AddStaffForm
                    onSubmit={handleCreateStaff}
                    onCancel={() => setShowAddForm(false)}
                    creating={creating}
                  />
                </div>
              )}

              {/* Empty state */}
              {members.length === 0 && !showAddForm && (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <Users className="h-8 w-8 text-black/12 dark:text-white/12 mb-3" />
                  <p className="text-[14px] font-semibold text-black dark:text-white tracking-[-0.01em] mb-1">
                    No staff yet
                  </p>
                  <p className="text-[12px] text-black/35 dark:text-white/35">
                    Add a staff member to get started.
                  </p>
                </div>
              )}

              {/* Admins */}
              {admins.length > 0 && (
                <div>
                  <p className="px-5 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.07em] text-black/25 dark:text-white/25">
                    Admins
                  </p>
                  {admins.map((m, i) => (
                    <StaffRow
                      key={m.id}
                      member={m}
                      index={i}
                      onUpdateRole={handleUpdateRole}
                      onRemove={handleRemoveStaff}
                      onToggleSuspend={handleToggleSuspend}
                    />
                  ))}
                </div>
              )}

              {/* Staff */}
              {staff.length > 0 && (
                <div>
                  <p className="px-5 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.07em] text-black/25 dark:text-white/25">
                    Staff
                  </p>
                  {staff.map((m, i) => (
                    <StaffRow
                      key={m.id}
                      member={m}
                      index={i + admins.length}
                      onUpdateRole={handleUpdateRole}
                      onRemove={handleRemoveStaff}
                      onToggleSuspend={handleToggleSuspend}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Permissions reference ── */}
          <div>
            <p className={sectionLabel}>Permissions</p>
            <div className={`${card} grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-black/5 dark:divide-white/5`}>
              {/* Staff col */}
              <div className="px-6 py-5">
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-black/40 dark:text-white/40" />
                  <span className="text-[13px] font-semibold text-black dark:text-white tracking-[-0.01em]">
                    Staff
                  </span>
                  <span className="text-[11px] text-black/35 dark:text-white/35">Read-only</span>
                </div>
                <ul className="space-y-2">
                  {["View analytics", "View subscribers", "View plans", "View activity logs"].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-[12px] text-black/55 dark:text-white/55">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                      {item}
                    </li>
                  ))}
                  {["Cannot modify data", "Cannot manage settings", "Cannot request payouts"].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-[12px] text-black/25 dark:text-white/25">
                      <span className="h-1.5 w-1.5 rounded-full bg-black/15 dark:bg-white/15 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Admin col */}
              <div className="px-6 py-5">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-accent" />
                  <span className="text-[13px] font-semibold text-black dark:text-white tracking-[-0.01em]">
                    Admin
                  </span>
                  <span className="text-[11px] text-black/35 dark:text-white/35">Full access</span>
                </div>
                <ul className="space-y-2">
                  {[
                    "All staff permissions",
                    "Create / edit / delete subscribers",
                    "Create / edit / delete plans",
                    "Request payouts",
                    "Modify organisation details",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-[12px] text-black/55 dark:text-white/55">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                      {item}
                    </li>
                  ))}
                  <li className="flex items-center gap-2 text-[12px] text-black/25 dark:text-white/25">
                    <span className="h-1.5 w-1.5 rounded-full bg-black/15 dark:bg-white/15 shrink-0" />
                    Cannot manage staff
                  </li>
                </ul>
              </div>
            </div>
          </div>

        </div>
        <FloatingSupport />
      </main>
    </SidebarInset>
  );
}
