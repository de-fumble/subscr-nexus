import { useEffect, useState } from "react";
import { PremiumLoader } from "@/components/PremiumLoader";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useSuperadmin } from "@/hooks/useSuperadmin";

import { ArrowLeft, Edit3, CheckCircle2, XCircle, Clock, RefreshCw, Building } from "lucide-react";

interface NameChangeRequest {
  id: string;
  org_id: string;
  current_name: string;
  requested_name: string;
  reason: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  organizations: {
    org_name: string;
    email: string;
  };
}

export default function SuperAdminNameChanges() {
  const navigate = useNavigate();
  const { isSuperadmin, loading: authLoading } = useSuperadmin();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<NameChangeRequest[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && !isSuperadmin) {
      navigate("/");
      return;
    }
    if (isSuperadmin) {
      fetchRequests();
    }
  }, [isSuperadmin, authLoading]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("name_change_requests")
        .select(`
          *,
          organizations (
            org_name,
            email
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching name change requests:", error);
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (request: NameChangeRequest, approve: boolean) => {
    setProcessingId(request.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update request status
      const { error: requestError } = await supabase
        .from("name_change_requests")
        .update({
          status: approve ? "approved" : "rejected",
          processed_at: new Date().toISOString(),
          processed_by: user.id,
          admin_notes: adminNotes[request.id] || null,
        })
        .eq("id", request.id);

      if (requestError) throw requestError;

      // If approved, update the organization name
      if (approve) {
        const { error: orgError } = await supabase
          .from("organizations")
          .update({ org_name: request.requested_name })
          .eq("id", request.org_id);

        if (orgError) throw orgError;
      }

      toast.success(approve ? "Name change approved" : "Name change rejected");
      fetchRequests();
    } catch (error) {
      console.error("Error processing request:", error);
      toast.error("Failed to process request");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (authLoading || loading) {
    return <PremiumLoader message="Loading..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/superadmin")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Name Change Requests</h1>
            <p className="text-muted-foreground mt-1">Review and approve organization name changes</p>
          </div>
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={fetchRequests} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {requests.length === 0 ? (
            <Card className="border-black/5 dark:border-white/5 shadow-sm">
              <CardContent className="py-12 text-center">
                <Edit3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Name Change Requests</h3>
                <p className="text-muted-foreground">There are no pending name change requests</p>
              </CardContent>
            </Card>
          ) : (
            requests.map((request) => (
              <Card key={request.id} className="border-black/5 dark:border-white/5 shadow-sm overflow-hidden transition-all hover:shadow-md">
                <CardHeader className="bg-muted/30 border-b border-border/50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                        <Building className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{request.organizations?.org_name}</CardTitle>
                        <CardDescription>{request.organizations?.email}</CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="grid md:grid-cols-2 gap-4 p-4 rounded-xl border border-border/50 bg-muted/10 shadow-sm">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Current Name</p>
                      <p className="font-medium text-foreground">{request.current_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Requested Name</p>
                      <p className="font-medium text-accent">{request.requested_name}</p>
                    </div>
                  </div>

                  {request.reason && (
                    <div className="p-4 rounded-xl border border-border/50 bg-muted/10 shadow-sm">
                      <p className="text-sm text-muted-foreground mb-1">Reason for Change</p>
                      <p className="text-sm leading-relaxed">{request.reason}</p>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Submitted: {new Date(request.created_at).toLocaleString(undefined, {
                      year: 'numeric', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>

                  {request.status === "pending" && (
                    <div className="space-y-3 pt-6 mt-6 border-t border-border/50">
                      <Textarea
                        placeholder="Admin notes (optional)"
                        value={adminNotes[request.id] || ""}
                        onChange={(e) => setAdminNotes({ ...adminNotes, [request.id]: e.target.value })}
                        className="bg-background border-input shadow-sm"
                        rows={3}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => handleProcess(request, false)}
                          disabled={processingId === request.id}
                          className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/50"
                        >
                          <XCircle className="h-4 w-4 mr-1.5" />
                          Reject
                        </Button>
                        <Button
                          onClick={() => handleProcess(request, true)}
                          disabled={processingId === request.id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1.5" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  )}

                  {request.admin_notes && request.status !== "pending" && (
                    <div className="p-4 rounded-xl border border-border/50 bg-muted/10 shadow-sm mt-4">
                      <p className="text-sm font-medium text-muted-foreground mb-1.5">Admin Notes</p>
                      <p className="text-sm leading-relaxed">{request.admin_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
