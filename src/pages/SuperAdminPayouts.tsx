import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react";
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperadmin) {
    return null;
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/superadmin')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Payout Requests</h1>
          <p className="text-muted-foreground">Manage organization payout requests</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle className="capitalize">{activeTab} Payouts</CardTitle>
              <CardDescription>
                {activeTab === "pending" && "Review and process pending payout requests"}
                {activeTab === "approved" && "Payouts that have been approved and are awaiting completion"}
                {activeTab === "completed" && "Successfully completed payouts"}
                {activeTab === "rejected" && "Rejected payout requests"}
                {activeTab === "all" && "All payout requests"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Bank Details</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Processed</TableHead>
                      <TableHead>Request Notes</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{payout.organizations?.org_name}</p>
                            <p className="text-xs text-muted-foreground">{payout.organizations?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {payout.organizations?.bank_name ? (
                            <div className="text-sm">
                              <p className="font-medium">{payout.organizations?.bank_name}</p>
                              <p className="text-muted-foreground">{payout.organizations?.account_number}</p>
                              <p className="text-xs text-muted-foreground">{payout.organizations?.account_name}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">No bank details</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">₦{payout.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={
                            payout.status === 'completed' ? 'default' :
                            payout.status === 'pending' ? 'secondary' :
                            payout.status === 'approved' ? 'outline' :
                            'destructive'
                          }>
                            {payout.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(payout.requested_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {payout.processed_at ? new Date(payout.processed_at).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{payout.notes || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {payout.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApprove(payout.id)}
                                  disabled={actionLoading}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => openRejectDialog(payout)}
                                  disabled={actionLoading}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
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
                                <Clock className="h-4 w-4 mr-1" />
                                Mark Complete
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {payouts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No {activeTab} payout requests
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
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
