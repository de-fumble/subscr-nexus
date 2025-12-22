import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, Search, FileCheck, CheckCircle2, XCircle, Clock,
  Building, Download, Eye, ArrowLeft, RefreshCw
} from "lucide-react";
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
import { Label } from "@/components/ui/label";

interface KYCSubmission {
  id: string;
  org_name: string;
  email: string;
  business_name: string | null;
  business_type: string | null;
  business_nature: string | null;
  staff_count: string | null;
  monthly_revenue: string | null;
  is_registered: boolean;
  registration_document_url: string | null;
  kyc_verified: boolean;
  kyc_submitted_at: string | null;
}

export default function SuperAdminKYC() {
  const navigate = useNavigate();
  const { isSuperadmin, loading: authLoading } = useSuperadmin();
  const [submissions, setSubmissions] = useState<KYCSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<KYCSubmission | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!authLoading && !isSuperadmin) {
      navigate("/dashboard");
      toast.error("Access denied. Superadmin privileges required.");
    }
  }, [authLoading, isSuperadmin, navigate]);

  const fetchSubmissions = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, org_name, email, business_name, business_type, business_nature, staff_count, monthly_revenue, is_registered, registration_document_url, kyc_verified, kyc_submitted_at")
        .not("kyc_submitted_at", "is", null)
        .order("kyc_submitted_at", { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
      if (showRefresh) toast.success("Data refreshed");
    } catch (error: any) {
      console.error("Error fetching KYC submissions:", error);
      toast.error("Failed to fetch KYC submissions");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isSuperadmin) {
      fetchSubmissions();
    }
  }, [isSuperadmin]);

  const handleReview = (submission: KYCSubmission) => {
    setSelectedSubmission(submission);
    setAdminNotes("");
    setReviewDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedSubmission) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ kyc_verified: true })
        .eq("id", selectedSubmission.id);

      if (error) throw error;

      // Log the action
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("audit_logs").insert({
        actor_id: user?.id,
        action: "kyc_approved",
        entity_type: "organization",
        entity_id: selectedSubmission.id,
        details: { admin_notes: adminNotes },
      });

      toast.success("KYC approved successfully");
      setReviewDialogOpen(false);
      fetchSubmissions();
    } catch (error: any) {
      console.error("Error approving KYC:", error);
      toast.error("Failed to approve KYC");
    } finally {
      setProcessing(false);
    }
  };

  const handleDeny = async () => {
    if (!selectedSubmission) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ 
          kyc_verified: false,
          kyc_submitted_at: null // Allow resubmission
        })
        .eq("id", selectedSubmission.id);

      if (error) throw error;

      // Log the action
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("audit_logs").insert({
        actor_id: user?.id,
        action: "kyc_denied",
        entity_type: "organization",
        entity_id: selectedSubmission.id,
        details: { admin_notes: adminNotes },
      });

      toast.success("KYC denied - organization can resubmit");
      setReviewDialogOpen(false);
      fetchSubmissions();
    } catch (error: any) {
      console.error("Error denying KYC:", error);
      toast.error("Failed to deny KYC");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (submission: KYCSubmission) => {
    if (submission.kyc_verified) {
      return (
        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" />
        Pending Review
      </Badge>
    );
  };

  const filteredSubmissions = submissions.filter(sub =>
    sub.org_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.business_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCount = submissions.filter(s => !s.kyc_verified).length;

  if (authLoading || loading) {
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/superadmin")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileCheck className="h-8 w-8" />
              KYC Submissions
            </h1>
            <p className="text-muted-foreground">Review and approve organization KYC submissions</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-lg px-4 py-2">
            {pendingCount} Pending
          </Badge>
          <Button variant="outline" size="icon" onClick={() => fetchSubmissions(true)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All KYC Submissions</CardTitle>
              <CardDescription>Organizations that have submitted KYC information</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search submissions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Business Name</TableHead>
                <TableHead>Business Type</TableHead>
                <TableHead>Staff Count</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubmissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{submission.org_name}</p>
                      <p className="text-sm text-muted-foreground">{submission.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{submission.business_name || "-"}</TableCell>
                  <TableCell className="capitalize">{submission.business_type?.replace(/_/g, " ") || "-"}</TableCell>
                  <TableCell>{submission.staff_count || "-"}</TableCell>
                  <TableCell>
                    {submission.registration_document_url ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(submission.registration_document_url!, "_blank")}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(submission)}</TableCell>
                  <TableCell>
                    {submission.kyc_submitted_at
                      ? new Date(submission.kyc_submitted_at).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleReview(submission)}>
                      <Eye className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredSubmissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "No submissions match your search" : "No KYC submissions yet"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              KYC Review - {selectedSubmission?.org_name}
            </DialogTitle>
            <DialogDescription>
              Review the KYC submission details and approve or deny
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Business Name</Label>
                  <p className="font-medium">{selectedSubmission.business_name || "Not provided"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Business Type</Label>
                  <p className="font-medium capitalize">{selectedSubmission.business_type?.replace(/_/g, " ") || "Not provided"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Staff Count</Label>
                  <p className="font-medium">{selectedSubmission.staff_count || "Not provided"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Monthly Revenue</Label>
                  <p className="font-medium">{selectedSubmission.monthly_revenue || "Not provided"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Registered Business</Label>
                  <p className="font-medium">{selectedSubmission.is_registered ? "Yes" : "No"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Document</Label>
                  {selectedSubmission.registration_document_url ? (
                    <Button
                      variant="link"
                      className="p-0 h-auto"
                      onClick={() => window.open(selectedSubmission.registration_document_url!, "_blank")}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download Document
                    </Button>
                  ) : (
                    <p className="text-muted-foreground">No document uploaded</p>
                  )}
                </div>
              </div>

              {selectedSubmission.business_nature && (
                <div>
                  <Label className="text-muted-foreground">Business Nature</Label>
                  <p className="font-medium">{selectedSubmission.business_nature}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Admin Notes (Optional)</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this review..."
                  className="min-h-[80px]"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeny}
              disabled={processing}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
              Deny
            </Button>
            <Button
              onClick={handleApprove}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}