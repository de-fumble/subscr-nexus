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
import { Label } from "@/components/ui/label";

interface Appeal {
  id: string;
  org_id: string;
  appeal_reason: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  organizations: {
    org_name: string;
    email: string;
    suspension_reason: string | null;
  };
}

export default function SuperAdminAppeals() {
  const navigate = useNavigate();
  const { hasPanelAccess, loading: authLoading, invokeSuperadmin } = useSuperadmin();
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    if (hasPanelAccess) {
      fetchAppeals();
    }
  }, [hasPanelAccess]);

  const fetchAppeals = async () => {
    try {
      const data = await invokeSuperadmin("get_suspension_appeals");
      setAppeals(data.appeals || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch appeals");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedAppeal || !actionType) return;

    setProcessing(true);
    try {
      await invokeSuperadmin(
        actionType === "approve" ? "approve_appeal" : "reject_appeal",
        {
          appeal_id: selectedAppeal.id,
          admin_notes: adminNotes || undefined,
        }
      );

      toast.success(
        actionType === "approve"
          ? "Appeal approved. Organization has been restored."
          : "Appeal rejected."
      );
      
      setSelectedAppeal(null);
      setActionType(null);
      setAdminNotes("");
      fetchAppeals();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${actionType} appeal`);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case "approved":
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (authLoading || loading) {
    return <PremiumLoader fullScreen message="Loading appeals..." />;
  }

  if (!hasPanelAccess) return null;

  const pendingAppeals = appeals.filter(a => a.status === "pending");
  const processedAppeals = appeals.filter(a => a.status !== "pending");

  return (
    <div className="container py-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/superadmin")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suspension Appeals</h1>
          <p className="text-muted-foreground mt-1">Review and manage organization suspension appeals</p>
        </div>
      </div>

      {/* Pending Appeals */}
      <Card className="border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/50">
          <CardTitle>Pending Appeals ({pendingAppeals.length})</CardTitle>
          <CardDescription>Appeals waiting for review</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Organization</TableHead>
                <TableHead>Original Suspension Reason</TableHead>
                <TableHead>Appeal Reason</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="pr-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingAppeals.map((appeal) => (
                <TableRow key={appeal.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="pl-6">
                    <div>
                      <p className="font-medium">{appeal.organizations?.org_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{appeal.organizations?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm text-muted-foreground truncate">
                      {appeal.organizations?.suspension_reason || "Not specified"}
                    </p>
                  </TableCell>
                  <TableCell className="max-w-sm">
                    <p className="text-sm line-clamp-2">{appeal.appeal_reason}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{new Date(appeal.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</TableCell>
                  <TableCell className="pr-6">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                        onClick={() => {
                          setSelectedAppeal(appeal);
                          setActionType("approve");
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedAppeal(appeal);
                          setActionType("reject");
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1.5" />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {pendingAppeals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    No pending appeals
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Processed Appeals */}
      <Card className="border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/50">
          <CardTitle>Processed Appeals</CardTitle>
          <CardDescription>Previously reviewed appeals</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Organization</TableHead>
                <TableHead>Appeal Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Admin Notes</TableHead>
                <TableHead className="pr-6">Processed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedAppeals.map((appeal) => (
                <TableRow key={appeal.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="pl-6">
                    <div>
                      <p className="font-medium">{appeal.organizations?.org_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{appeal.organizations?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-sm">
                    <p className="text-sm line-clamp-2">{appeal.appeal_reason}</p>
                  </TableCell>
                  <TableCell>{getStatusBadge(appeal.status)}</TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm text-muted-foreground truncate">
                      {appeal.admin_notes || "-"}
                    </p>
                  </TableCell>
                  <TableCell className="text-muted-foreground pr-6">{new Date(appeal.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</TableCell>
                </TableRow>
              ))}
              {processedAppeals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    No processed appeals
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={!!selectedAppeal && !!actionType} onOpenChange={() => { setSelectedAppeal(null); setActionType(null); setAdminNotes(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve Appeal" : "Reject Appeal"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? "Approving this appeal will restore the organization's access."
                : "Rejecting this appeal will keep the organization suspended."}
            </DialogDescription>
          </DialogHeader>

          {selectedAppeal && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium">{selectedAppeal.organizations?.org_name}</p>
                <p className="text-xs text-muted-foreground">{selectedAppeal.appeal_reason}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Admin Notes {actionType === "reject" && "(required)"}</Label>
                <Textarea
                  id="notes"
                  placeholder={actionType === "approve" ? "Optional notes..." : "Explain why this appeal is rejected..."}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedAppeal(null); setActionType(null); setAdminNotes(""); }}>
              Cancel
            </Button>
            <Button
              variant={actionType === "approve" ? "default" : "destructive"}
              onClick={handleAction}
              disabled={processing || (actionType === "reject" && !adminNotes.trim())}
            >
              {processing && <PremiumSpinner className="mr-2" />}
              {actionType === "approve" ? "Approve & Restore" : "Reject Appeal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}