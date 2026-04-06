import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Ban, Mail, AlertTriangle, Clock, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

interface SuspensionInfo {
  type: "platform" | "clocked_out" | "staff_suspended";
  is_suspended?: boolean;
  suspension_reason?: string | null;
  suspended_at?: string | null;
  org_id: string;
  org_name: string;
}

interface Appeal {
  id: string;
  appeal_reason: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

export default function SuspendedAccount() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [suspensionInfo, setSuspensionInfo] = useState<SuspensionInfo | null>(null);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [appealReason, setAppealReason] = useState("");

  useEffect(() => {
    checkSuspensionStatus();
  }, []);

  const checkSuspensionStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // First check if user is an org owner
      const { data: ownedOrg } = await supabase
        .from("organizations")
        .select("id, org_name, is_suspended, suspension_reason, suspended_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownedOrg) {
        if (!ownedOrg.is_suspended) {
          navigate("/dashboard");
          return;
        }

        setSuspensionInfo({
          type: "platform",
          is_suspended: ownedOrg.is_suspended,
          suspension_reason: ownedOrg.suspension_reason,
          suspended_at: ownedOrg.suspended_at,
          org_id: ownedOrg.id,
          org_name: ownedOrg.org_name,
        });

        fetchAppeals(ownedOrg.id);
        setLoading(false);
        return;
      }

      // Check if user is a staff member
      const { data: membership } = await supabase
        .from("organization_members")
        .select("org_id, is_suspended")
        .eq("user_id", user.id)
        .maybeSingle();

      if (membership) {
        const { data: org } = await supabase
          .from("organizations")
          .select("id, org_name, is_suspended, is_clocked_out, suspension_reason, suspended_at")
          .eq("id", membership.org_id)
          .single();

        if (org.is_suspended) {
          setSuspensionInfo({
            type: "platform",
            is_suspended: org.is_suspended,
            suspension_reason: org.suspension_reason,
            suspended_at: org.suspended_at,
            org_id: org.id,
            org_name: org.org_name,
          });
          // Staff don't see appeals form typically, but we fetch it just in case
          fetchAppeals(org.id);
        } else if (membership.is_suspended) {
          setSuspensionInfo({
            type: "staff_suspended",
            org_id: org.id,
            org_name: org.org_name,
          });
        } else if (org.is_clocked_out) {
          setSuspensionInfo({
            type: "clocked_out",
            org_id: org.id,
            org_name: org.org_name,
          });
        } else {
          navigate("/dashboard");
        }
      } else {
        navigate("/auth");
      }
    } catch (error) {
      console.error("Error checking suspension:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppeals = async (orgId: string) => {
    const { data: existingAppeals } = await supabase
      .from("suspension_appeals")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    setAppeals(existingAppeals || []);
  };

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspensionInfo || !appealReason.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("suspension_appeals").insert({
        org_id: suspensionInfo.org_id,
        appeal_reason: appealReason.trim(),
      });

      if (error) throw error;

      toast.success("Appeal submitted successfully");
      setAppealReason("");
      checkSuspensionStatus();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit appeal");
    } finally {
      setSubmitting(false);
    }
  };

  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!suspensionInfo) return null;

  const pendingAppeal = appeals.find(a => a.status === "pending");
  const rejectedAppeals = appeals.filter(a => a.status === "rejected");

  if (suspensionInfo.type === "clocked_out") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <Card className="border-border">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">Workspace Unavailable</CardTitle>
              <CardDescription>
                <strong>{suspensionInfo.org_name}</strong> is currently clocked out.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <p className="text-sm text-muted-foreground">
                Your organization owner has temporarily restricted access. Please check back later or contact your administrator.
              </p>
              <div className="pt-4 border-t">
                <Button variant="outline" onClick={handleSignOut} className="w-full">
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (suspensionInfo.type === "staff_suspended") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-amber-500/5 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <Card className="border-amber-500/20">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
                <UserX className="h-8 w-8 text-amber-500" />
              </div>
              <CardTitle className="text-2xl text-amber-600">Access Suspended</CardTitle>
              <CardDescription>
                Your access to <strong>{suspensionInfo.org_name}</strong> has been suspended.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <p className="text-sm text-muted-foreground">
                Your organization owner has suspended your staff account. Please contact your administrator for more information.
              </p>
              <div className="pt-4 border-t">
                <Button variant="outline" onClick={handleSignOut} className="w-full">
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-destructive/5 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <Card className="border-destructive/50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <Ban className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl text-destructive">Account Suspended</CardTitle>
            <CardDescription>
              Your organization <strong>{suspensionInfo.org_name}</strong> has been suspended
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-destructive/10 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Reason for Suspension</p>
                  <p className="text-sm text-muted-foreground">
                    {suspensionInfo.suspension_reason || "No reason provided. Please contact support."}
                  </p>
                </div>
              </div>
              {suspensionInfo.suspended_at && (
                <p className="text-xs text-muted-foreground ml-7">
                  Suspended on: {new Date(suspensionInfo.suspended_at).toLocaleDateString()}
                </p>
              )}
            </div>

            {pendingAppeal ? (
              <div className="bg-amber-500/10 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Loader2 className="h-5 w-5 text-amber-500 animate-spin mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-600">Appeal Under Review</p>
                    <p className="text-sm text-muted-foreground">
                      Your appeal submitted on {new Date(pendingAppeal.created_at).toLocaleDateString()} is being reviewed by our team.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitAppeal} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="appeal">Submit an Appeal</Label>
                  <Textarea
                    id="appeal"
                    placeholder="Explain why you believe this suspension should be lifted..."
                    value={appealReason}
                    onChange={(e) => setAppealReason(e.target.value)}
                    rows={4}
                    required
                    disabled={submitting}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting || !appealReason.trim()}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting Appeal...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Submit Appeal
                    </>
                  )}
                </Button>
              </form>
            )}

            {rejectedAppeals.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium text-sm">Previous Appeals</h3>
                {rejectedAppeals.map((appeal) => (
                  <div key={appeal.id} className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(appeal.created_at).toLocaleDateString()}
                      </span>
                      <Badge variant="destructive">Rejected</Badge>
                    </div>
                    <p className="text-sm">{appeal.appeal_reason}</p>
                    {appeal.admin_notes && (
                      <p className="text-xs text-muted-foreground border-t pt-2">
                        <strong>Admin Response:</strong> {appeal.admin_notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t">
              <Button variant="outline" onClick={handleSignOut} className="w-full">
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}