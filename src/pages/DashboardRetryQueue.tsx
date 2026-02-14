import { useState, useEffect, useMemo } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useOrgRole } from "@/hooks/useOrgRole";
import { toast } from "sonner";
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
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Clock,
  XCircle,
  RotateCcw,
  Users,
  Timer,
  Ban,
  Play,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from "lucide-react";

interface RetrySubscriber {
  id: string;
  email: string;
  customer_name: string | null;
  amount: number;
  retry_count: number;
  last_retry_at: string | null;
  payment_failed_at: string | null;
  status: string;
  plan_name: string;
  plan_id: string;
  next_retry_eligible: string | null;
  has_authorization: boolean;
  is_eligible_now: boolean;
  is_exhausted: boolean;
}

interface Organization {
  id: string;
  org_name: string;
  email: string;
  logo_url?: string | null;
}

const DashboardRetryQueue = () => {
  const navigate = useNavigate();
  const { role, canAccessSettings } = useOrgRole();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userEmail, setUserEmail] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscribers, setSubscribers] = useState<RetrySubscriber[]>([]);
  const [search, setSearch] = useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedSubscriber, setSelectedSubscriber] = useState<RetrySubscriber | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUserEmail(user.email);

      let orgData = null;
      const { data: ownedOrg } = await supabase
        .from("organizations")
        .select("id, org_name, email, logo_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownedOrg) {
        orgData = ownedOrg;
      } else {
        const { data: membership } = await supabase
          .from("organization_members")
          .select("org_id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (membership) {
          const { data: staffOrg } = await supabase
            .from("organizations")
            .select("id, org_name, email, logo_url")
            .eq("id", membership.org_id)
            .maybeSingle();
          orgData = staffOrg;
        }
      }

      if (!orgData) { navigate("/auth"); return; }
      setOrganization(orgData);
      await fetchRetryQueue(orgData.id);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchRetryQueue = async (orgId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("retry-failed-payments", {
        body: { action: "status", orgId },
      });

      if (error) throw error;

      setSubscribers(data?.retryQueue || []);
    } catch (error) {
      console.error("Error fetching retry queue:", error);
      toast.error("Failed to load retry queue");
    }
  };

  const handleManualRetry = async (subscriber: RetrySubscriber) => {
    if (!subscriber.has_authorization) {
      toast.error("No stored card authorization — cannot retry");
      return;
    }
    setActionLoading(subscriber.id);
    try {
      const { data, error } = await supabase.functions.invoke("retry-failed-payments", {
        body: { action: "retry_one", subscriberId: subscriber.id },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Payment successful for ${subscriber.email}!`);
        setSubscribers(prev => prev.filter(s => s.id !== subscriber.id));
      } else {
        toast.error(data?.message || "Retry failed");
        // Refresh to get updated state
        if (organization) await fetchRetryQueue(organization.id);
      }
    } catch (error) {
      console.error("Error retrying payment:", error);
      toast.error("Failed to retry payment");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefresh = async () => {
    if (!organization) return;
    setRefreshing(true);
    await fetchRetryQueue(organization.id);
    setRefreshing(false);
    toast.success("Retry queue refreshed");
  };

  const handleCancelRetry = async (subscriber: RetrySubscriber) => {
    setSelectedSubscriber(subscriber);
    setCancelDialogOpen(true);
  };

  const confirmCancelRetry = async () => {
    if (!selectedSubscriber) return;
    setActionLoading(selectedSubscriber.id);
    try {
      const { error } = await supabase
        .from("subscribers")
        .update({
          status: "payment_failed",
          retry_count: 3, // Max out retries to stop automatic retries
        })
        .eq("id", selectedSubscriber.id);

      if (error) throw error;

      setSubscribers(prev =>
        prev.map(s =>
          s.id === selectedSubscriber.id
            ? { ...s, status: "payment_failed", retry_count: 3, next_retry_eligible: null }
            : s
        )
      );
      toast.success(`Cancelled automatic retries for ${selectedSubscriber.email}`);
    } catch (error) {
      console.error("Error cancelling retry:", error);
      toast.error("Failed to cancel retry");
    } finally {
      setActionLoading(null);
      setCancelDialogOpen(false);
      setSelectedSubscriber(null);
    }
  };

  const handleResetRetry = async (subscriber: RetrySubscriber) => {
    setActionLoading(subscriber.id);
    try {
      const { error } = await supabase
        .from("subscribers")
        .update({
          retry_count: 0,
          status: "active",
          last_retry_at: null,
        })
        .eq("id", subscriber.id);

      if (error) throw error;

      setSubscribers(prev =>
        prev.map(s =>
          s.id === subscriber.id
            ? { ...s, retry_count: 0, status: "active", last_retry_at: null, next_retry_eligible: "eligible_now" }
            : s
        )
      );
      toast.success(`Reset retry counter for ${subscriber.email}`);
    } catch (error) {
      console.error("Error resetting retry:", error);
      toast.error("Failed to reset retry");
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearFailedState = async (subscriber: RetrySubscriber) => {
    setActionLoading(subscriber.id);
    try {
      const { error } = await supabase
        .from("subscribers")
        .update({
          payment_failed_at: null,
          retry_count: 0,
          status: "active",
          last_retry_at: null,
        })
        .eq("id", subscriber.id);

      if (error) throw error;

      setSubscribers(prev => prev.filter(s => s.id !== subscriber.id));
      toast.success(`Cleared failed state for ${subscriber.email}`);
    } catch (error) {
      console.error("Error clearing failed state:", error);
      toast.error("Failed to clear state");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = useMemo(() => {
    if (!search) return subscribers;
    const q = search.toLowerCase();
    return subscribers.filter(
      s =>
        s.email.toLowerCase().includes(q) ||
        s.customer_name?.toLowerCase().includes(q) ||
        s.plan_name.toLowerCase().includes(q)
    );
  }, [subscribers, search]);

  const activeRetries = subscribers.filter(s => s.status === "active" && s.retry_count < 3);
  const exhaustedRetries = subscribers.filter(s => s.status === "payment_failed" || s.retry_count >= 3);

  const getRetryStatusBadge = (subscriber: RetrySubscriber) => {
    if (subscriber.status === "payment_failed" || subscriber.retry_count >= 3) {
      return <Badge variant="destructive" className="gap-1"><Ban className="h-3 w-3" /> Exhausted</Badge>;
    }
    if (subscriber.next_retry_eligible === "eligible_now") {
      return <Badge className="gap-1 bg-amber-500/90 hover:bg-amber-500"><Play className="h-3 w-3" /> Eligible Now</Badge>;
    }
    return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Scheduled</Badge>;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-background via-background to-muted/20">
        <AppSidebar
          organization={organization}
          role={role}
          userEmail={userEmail}
          canAccessSettings={canAccessSettings}
        />
        <SidebarInset className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 glass-card px-4">
            <SidebarTrigger />
            <div className="flex-1 flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-primary" />
                Retry Queue
              </h1>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="glass-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{subscribers.length}</p>
                        <p className="text-sm text-muted-foreground">Total in Queue</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <Timer className="h-5 w-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{activeRetries.length}</p>
                        <p className="text-sm text-muted-foreground">Pending Retries</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                        <XCircle className="h-5 w-5 text-destructive" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{exhaustedRetries.length}</p>
                        <p className="text-sm text-muted-foreground">Retries Exhausted</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Search */}
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or plan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Table */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">Subscribers in Retry Queue</CardTitle>
                  <CardDescription>
                    Manage automatic payment retries. The system retries up to 3 times, spaced at least 6 days apart.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {filtered.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h4 className="text-lg font-semibold mb-2">No Subscribers in Queue</h4>
                      <p className="text-sm text-muted-foreground">
                        {search ? "No subscribers match your search" : "All payments are up to date — no retries needed"}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Subscriber</TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Retry Status</TableHead>
                            <TableHead>Attempts</TableHead>
                            <TableHead>Card</TableHead>
                            <TableHead>Failed At</TableHead>
                            <TableHead>Last Retry</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map((subscriber) => (
                            <TableRow key={subscriber.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{subscriber.customer_name || "—"}</p>
                                  <p className="text-sm text-muted-foreground">{subscriber.email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{subscriber.plan_name}</Badge>
                              </TableCell>
                              <TableCell className="font-medium">
                                ₦{(subscriber.amount / 100).toLocaleString()}
                              </TableCell>
                              <TableCell>{getRetryStatusBadge(subscriber)}</TableCell>
                              <TableCell>
                                <span className={`font-mono text-sm ${subscriber.retry_count >= 3 ? "text-destructive" : ""}`}>
                                  {subscriber.retry_count}/3
                                </span>
                              </TableCell>
                              <TableCell>
                                {subscriber.has_authorization ? (
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Stored
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-xs gap-1">
                                    <XCircle className="h-3 w-3" /> None
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDate(subscriber.payment_failed_at)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDate(subscriber.last_retry_at)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-1">
                                  {subscriber.has_authorization && subscriber.status === "active" && subscriber.retry_count < 3 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleManualRetry(subscriber)}
                                      disabled={actionLoading === subscriber.id}
                                      className="text-amber-600 hover:text-amber-600 hover:bg-amber-500/10 gap-1 text-xs"
                                    >
                                      <Zap className="h-3.5 w-3.5" />
                                      Retry Now
                                    </Button>
                                  )}
                                  {subscriber.status === "active" && subscriber.retry_count < 3 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleCancelRetry(subscriber)}
                                      disabled={actionLoading === subscriber.id}
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1 text-xs"
                                    >
                                      <Ban className="h-3.5 w-3.5" />
                                      Cancel
                                    </Button>
                                  )}
                                  {(subscriber.status === "payment_failed" || subscriber.retry_count >= 3) && (
                                    <>
                                      {subscriber.has_authorization && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleManualRetry(subscriber)}
                                          disabled={actionLoading === subscriber.id}
                                          className="text-amber-600 hover:text-amber-600 hover:bg-amber-500/10 gap-1 text-xs"
                                        >
                                          <Zap className="h-3.5 w-3.5" />
                                          Retry Now
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleResetRetry(subscriber)}
                                        disabled={actionLoading === subscriber.id}
                                        className="text-primary hover:text-primary hover:bg-primary/10 gap-1 text-xs"
                                      >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        Reset
                                      </Button>
                                    </>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleClearFailedState(subscriber)}
                                    disabled={actionLoading === subscriber.id}
                                    className="text-emerald-600 hover:text-emerald-600 hover:bg-emerald-500/10 gap-1 text-xs"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Clear
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Info Card */}
              <Card className="glass-card border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">How Intelligent Retries Work</p>
                      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                        <li>Failed payments are automatically retried up to <strong>3 times</strong></li>
                        <li>Retries are spaced at least <strong>6 days apart</strong> (weekly)</li>
                        <li>After 3 failed attempts, the subscriber is marked as <strong>payment failed</strong></li>
                        <li><strong>Cancel</strong> stops all future retries for a subscriber</li>
                        <li><strong>Reset</strong> restarts the retry counter (allows 3 more attempts)</li>
                        <li><strong>Clear</strong> removes the failed state entirely (marks as healthy)</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </SidebarInset>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Automatic Retries?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop all future automatic retry attempts for{" "}
              <strong>{selectedSubscriber?.email}</strong>. The subscriber will be marked as
              "payment failed" and no more charges will be attempted automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Retrying</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelRetry} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Cancel Retries
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
};

export default DashboardRetryQueue;
