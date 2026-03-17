import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react";
import { PremiumLoader, PremiumSpinner } from "@/components/PremiumLoader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SuperAdminPayouts() {
  const navigate = useNavigate();
  const { isSuperadmin, loading: authLoading, invokeSuperadmin } = useSuperadmin();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    if (!authLoading && !isSuperadmin) {
      navigate("/dashboard");
      toast.error("Access denied. Superadmin privileges required.");
    }
  }, [authLoading, isSuperadmin, navigate]);

  useEffect(() => {
    if (isSuperadmin) {
      fetchPayouts();
    }
  }, [isSuperadmin, activeTab]);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const status = activeTab === "all" ? undefined : activeTab;
      const data = await invokeSuperadmin('get_payout_requests', { status });
      setPayouts(data.payout_requests);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch payouts');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (payoutId: string) => {
    setActionLoading(true);
    try {
      await invokeSuperadmin('approve_payout', { request_id: payoutId });
      toast.success('Payout approved');
      fetchPayouts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve payout');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPayout) return;
    setActionLoading(true);
    try {
      await invokeSuperadmin('reject_payout', { request_id: selectedPayout.id, reason: rejectReason });
      toast.success('Payout rejected');
      setRejectDialogOpen(false);
      setSelectedPayout(null);
      setRejectReason("");
      fetchPayouts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject payout');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (payoutId: string) => {
    setActionLoading(true);
    try {
      await invokeSuperadmin('complete_payout', { request_id: payoutId });
      toast.success('Payout marked as completed');
      fetchPayouts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete payout');
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectDialog = (payout: any) => {
    setSelectedPayout(payout);
    setRejectDialogOpen(true);
  };

  if (authLoading) {
    return <PremiumLoader fullScreen message="Authenticating..." />;
  }

  if (!isSuperadmin) {
    return null;
  }

  return (
    <div className="container py-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/superadmin')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payout Requests</h1>
          <p className="text-muted-foreground mt-1">Manage organization payout requests</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card className="border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/50">
              <CardTitle className="capitalize">{activeTab} Payouts</CardTitle>
              <CardDescription>
                {activeTab === "pending" && "Review and process pending payout requests"}
                {activeTab === "approved" && "Payouts that have been approved and are awaiting completion"}
                {activeTab === "completed" && "Successfully completed payouts"}
                {activeTab === "rejected" && "Rejected payout requests"}
                {activeTab === "all" && "All payout requests"}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <PremiumLoader size="lg" message="Loading payouts..." fullScreen={false} />
              ) : (
                <Table>
                  <TableHeader className="bg-muted/10">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-6">Organization</TableHead>
                      <TableHead>Bank Details</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Processed</TableHead>
                      <TableHead>Request Notes</TableHead>
                      <TableHead className="pr-6"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((payout) => (
                      <TableRow key={payout.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="pl-6">
                          <div>
                            <p className="font-medium">{payout.organizations?.org_name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{payout.organizations?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {payout.organizations?.bank_name ? (
                            <div className="text-sm">
                              <p className="font-medium text-foreground">{payout.organizations?.bank_name}</p>
                              <p className="text-muted-foreground text-xs mt-0.5 font-mono">{payout.organizations?.account_number}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{payout.organizations?.account_name}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm italic">No bank details</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium text-lg">₦{payout.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={
                            payout.status === 'completed' ? 'default' :
                            payout.status === 'pending' ? 'secondary' :
                            payout.status === 'approved' ? 'outline' :
                            'destructive'
                          } className={
                            payout.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 shadow-none' :
                            payout.status === 'pending' ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-none shadow-none' :
                            payout.status === 'approved' ? 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-none shadow-none' :
                            'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 shadow-none'
                          }>
                            <span className="capitalize">{payout.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(payout.requested_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {payout.processed_at ? new Date(payout.processed_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">{payout.notes || '-'}</TableCell>
                        <TableCell className="pr-6">
                          <div className="flex gap-2 justify-end">
                            {payout.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                                  onClick={() => handleApprove(payout.id)}
                                  disabled={actionLoading}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1.5" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => openRejectDialog(payout)}
                                  disabled={actionLoading}
                                >
                                  <XCircle className="h-4 w-4 mr-1.5" />
                                  Reject
                                </Button>
                              </>
                            )}
                            {payout.status === 'approved' && (
                              <Button
                                size="sm"
                                onClick={() => handleComplete(payout.id)}
                                disabled={actionLoading}
                              >
                                <Clock className="h-4 w-4 mr-1.5" />
                                Complete
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {payouts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          No {activeTab} payout requests found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payout Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this payout request.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={actionLoading || !rejectReason}>
              {actionLoading && <PremiumSpinner className="mr-2" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
