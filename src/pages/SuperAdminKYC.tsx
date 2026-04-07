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
  Building, Download, Eye, ArrowLeft, RefreshCw, Lock, Edit3
} from "lucide-react";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

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

interface KYCEditRequest {
  id: string;
  org_id: string;
  org_name: string;
  reason: string;
  status: string;
  created_at: string;
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
  const [editRequests, setEditRequests] = useState<KYCEditRequest[]>([]);
  const [activeTab, setActiveTab] = useState("submissions");
  const [sendEmail, setSendEmail] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

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
      if (showRefresh) setRefreshing(false);
    }
  };

  const fetchEditRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("kyc_edit_requests")
        .select(`
          id,
          org_id,
          reason,
          status,
          created_at,
          organizations (
            org_name
          )
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const formattedRequests = data.map((req: any) => ({
        id: req.id,
        org_id: req.org_id,
        org_name: req.organizations?.org_name || "Unknown Org",
        reason: req.reason,
        status: req.status,
        created_at: req.created_at
      }));
      
      setEditRequests(formattedRequests);
    } catch (error: any) {
      console.error("Error fetching KYC edit requests:", error);
      toast.error("Failed to fetch edit requests");
    }
  };

  useEffect(() => {
    if (isSuperadmin) {
      fetchSubmissions().then(() => setLoading(false));
      fetchEditRequests();
    }
  }, [isSuperadmin]);

  const handleReview = (submission: KYCSubmission) => {
    setSelectedSubmission(submission);
    setAdminNotes("");
    setSendEmail(true);
    setEmailSubject(`KYC Verification Approved — ${submission.org_name}`);
    setEmailMessage(
      `Hello ${submission.org_name},\n\nWe are pleased to inform you that your KYC verification at Recurra has been approved! You now have full access to all platform features.\n\nThank you for your cooperation.`
    );
    setReviewDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedSubmission) return;
    setProcessing(true);
    try {
      // 1. Update KYC status
      const { error } = await supabase
        .from("organizations")
        .update({ kyc_verified: true })
        .eq("id", selectedSubmission.id);

      if (error) throw error;

      // 2. Create in-app notification for the modal
      const { error: notifError } = await supabase.from("notifications").insert({
        org_id: selectedSubmission.id,
        title: "KYC Verification Approved",
        message: "Your KYC documents have been reviewed and approved. Welcome to Recurra!",
        type: "kyc_approval"
      });

      if (notifError) {
        console.error("Notification creation error:", notifError);
        toast.warning("KYC approved, but dashboard notification failed to create");
      }

      // 3. Optional Email Notification
      if (sendEmail) {
        const { error: emailError } = await supabase.functions.invoke("superadmin", {
          body: {
            action: "send_email",
            org_id: selectedSubmission.id,
            subject: emailSubject,
            message: emailMessage
          }
        });
        if (emailError) {
          console.error("Email error:", emailError);
          toast.warning("KYC approved, but email delivery failed");
        }
      }

      // 4. Audit Log
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("audit_logs").insert({
        actor_id: user?.id,
        action: "kyc_approved",
        entity_type: "organization",
        entity_id: selectedSubmission.id,
        details: { admin_notes: adminNotes, email_sent: sendEmail },
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

  const handleProcessEditRequest = async (request: KYCEditRequest, status: 'approved' | 'rejected') => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Update request status
      const { error: requestError } = await supabase
        .from("kyc_edit_requests")
        .update({
          status,
          processed_by: user?.id,
          processed_at: new Date().toISOString()
        })
        .eq("id", request.id);

      if (requestError) throw requestError;

      if (status === 'approved') {
        // 2. Unlock KYC for the organization
        const { error: orgError } = await supabase
          .from("organizations")
          .update({ kyc_verified: false })
          .eq("id", request.org_id);

        if (orgError) throw orgError;

        // 3. Notify organization
        await supabase.from("notifications").insert({
          org_id: request.org_id,
          title: "KYC Edit Request Approved",
          message: "Your request to edit your KYC information has been approved. Your profile is now unlocked for updates.",
          type: "system"
        });

        toast.success("Edit request approved and KYC unlocked");
      } else {
        toast.info("Edit request rejected");
      }

      fetchEditRequests();
      fetchSubmissions();
    } catch (error: any) {
      console.error("Error processing edit request:", error);
      toast.error("Failed to process request");
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
    return <PremiumLoader fullScreen message="Loading KYC data..." />;
  }

  if (!isSuperadmin) {
    return null;
  }

  return (
    <div className="container py-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/superadmin")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <FileCheck className="h-8 w-8 text-primary" />
              KYC Management
            </h1>
            <p className="text-muted-foreground mt-1">Review and manage organization verification and edit requests</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => activeTab === "submissions" ? fetchSubmissions(true) : fetchEditRequests()} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="submissions" className="gap-2">
            <FileCheck className="h-4 w-4" />
            KYC Submissions
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="edit-requests" className="gap-2">
            <Edit3 className="h-4 w-4" />
            Edit Requests
            {editRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                {editRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submissions">
          <Card className="border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>All KYC Submissions</CardTitle>
                  <CardDescription>Organizations that have submitted KYC information</CardDescription>
                </div>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search submissions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-background"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Organization</TableHead>
                    <TableHead>Business Name</TableHead>
                    <TableHead>Business Type</TableHead>
                    <TableHead>Staff Count</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="pr-6"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((submission) => (
                    <TableRow key={submission.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="pl-6">
                        <div>
                          <p className="font-medium text-foreground">{submission.org_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{submission.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{submission.business_name || "-"}</TableCell>
                      <TableCell className="capitalize text-muted-foreground">{submission.business_type?.replace(/_/g, " ") || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{submission.staff_count || "-"}</TableCell>
                      <TableCell>
                        {submission.registration_document_url ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:text-primary/80 hover:bg-primary/10"
                            onClick={() => window.open(submission.registration_document_url!, "_blank")}
                          >
                            <Download className="h-4 w-4 mr-1.5" />
                            Download
                          </Button>
                        ) : (
                          <span className="text-muted-foreground italic text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(submission)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {submission.kyc_submitted_at
                          ? new Date(submission.kyc_submitted_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                          : "-"}
                      </TableCell>
                      <TableCell className="pr-6">
                        <div className="flex justify-end">
                          <Button variant="ghost" size="sm" onClick={() => handleReview(submission)} className="border border-input hover:bg-accent hover:text-accent-foreground">
                            <Eye className="h-4 w-4 mr-1.5" />
                            Review
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredSubmissions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        {searchQuery ? "No submissions match your search" : "No KYC submissions yet"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edit-requests">
          <Card className="border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/50">
              <CardTitle>KYC Edit Requests</CardTitle>
              <CardDescription>Review requests to unlock verified profiles for editing</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Organization</TableHead>
                    <TableHead>Reason for Edit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested On</TableHead>
                    <TableHead className="pr-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="pl-6 font-medium">{request.org_name}</TableCell>
                      <TableCell className="max-w-md">
                        <p className="text-sm line-clamp-2" title={request.reason}>{request.reason}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                          Pending
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(request.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="pr-6">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleProcessEditRequest(request, 'rejected')}
                            disabled={processing}
                          >
                            Reject
                          </Button>
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleProcessEditRequest(request, 'approved')}
                            disabled={processing}
                          >
                            Approve & Unlock
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {editRequests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        No pending edit requests
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

              <div className="pt-4 border-t space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="send_email" 
                    checked={sendEmail} 
                    onCheckedChange={(checked) => setSendEmail(checked as boolean)}
                  />
                  <Label htmlFor="send_email" className="font-medium cursor-pointer">
                    Send email notification to organization
                  </Label>
                </div>

                {sendEmail && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-1.5">
                      <Label htmlFor="email_subject">Email Subject</Label>
                      <Input
                        id="email_subject"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder="Subject"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email_message">Email Message</Label>
                      <Textarea
                        id="email_message"
                        value={emailMessage}
                        onChange={(e) => setEmailMessage(e.target.value)}
                        placeholder="Customize your message..."
                        className="min-h-[120px]"
                      />
                    </div>
                  </div>
                )}
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
              {processing ? <PremiumSpinner className="mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
              Deny
            </Button>
            <Button
              onClick={handleApprove}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? <PremiumSpinner className="mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}