import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ArrowLeft, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SuperAdminDeletions() {
  const navigate = useNavigate();
  const { isSuperadmin, loading: authLoading, invokeSuperadmin } = useSuperadmin();
  const [deletions, setDeletions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedDeletion, setSelectedDeletion] = useState<any>(null);
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
      fetchDeletions();
    }
  }, [isSuperadmin, activeTab]);

  const fetchDeletions = async () => {
    setLoading(true);
    try {
      const status = activeTab === "all" ? undefined : activeTab;
      const data = await invokeSuperadmin('get_deletion_requests', { status });
      setDeletions(data.deletion_requests);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch deletion requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedDeletion) return;
    setActionLoading(true);
    try {
      await invokeSuperadmin('approve_deletion', { request_id: selectedDeletion.id });
      toast.success('Deletion approved. Organization has been deleted.');
      setConfirmDialogOpen(false);
      setSelectedDeletion(null);
      fetchDeletions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve deletion');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (deletionId: string) => {
    setActionLoading(true);
    try {
      await invokeSuperadmin('reject_deletion', { request_id: deletionId });
      toast.success('Deletion request rejected');
      fetchDeletions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject deletion');
    } finally {
      setActionLoading(false);
    }
  };

  const openConfirmDialog = (deletion: any) => {
    setSelectedDeletion(deletion);
    setConfirmDialogOpen(true);
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
          <h1 className="text-3xl font-bold">Deletion Requests</h1>
          <p className="text-muted-foreground">Review and process account deletion requests</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle className="capitalize">{activeTab} Deletion Requests</CardTitle>
              <CardDescription>
                {activeTab === "pending" && "Review pending deletion requests carefully"}
                {activeTab === "approved" && "Organizations that have been deleted"}
                {activeTab === "rejected" && "Rejected deletion requests"}
                {activeTab === "all" && "All deletion requests"}
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
                      <TableHead>Email</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Processed</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deletions.map((deletion) => (
                      <TableRow key={deletion.id}>
                        <TableCell className="font-medium">{deletion.organizations?.org_name || 'Deleted'}</TableCell>
                        <TableCell>{deletion.organizations?.email || '-'}</TableCell>
                        <TableCell className="max-w-xs truncate">{deletion.reason || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={
                            deletion.status === 'approved' ? 'default' :
                            deletion.status === 'pending' ? 'secondary' :
                            'destructive'
                          }>
                            {deletion.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(deletion.requested_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {deletion.processed_at ? new Date(deletion.processed_at).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>
                          {deletion.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => openConfirmDialog(deletion)}
                                disabled={actionLoading}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(deletion.id)}
                                disabled={actionLoading}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {deletions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No {activeTab} deletion requests
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

      {/* Confirm Deletion Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Organization Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the organization
              <strong className="text-foreground"> {selectedDeletion?.organizations?.org_name}</strong> and all 
              associated data including subscription plans, subscribers, and transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Organization
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
