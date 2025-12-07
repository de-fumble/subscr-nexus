import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Plus, Users, Mail, Phone } from "lucide-react";
import { SubscriberManagementDialog } from "@/components/SubscriberManagementDialog";
import { useOrgRole } from "@/hooks/useOrgRole";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Subscriber {
  id: string;
  email: string;
  customer_name: string | null;
  amount: number;
  status: string;
  next_payment_date: string | null;
  plan_id: string;
  phone?: string | null;
}

export default function DashboardSubscribers() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [orgId, setOrgId] = useState<string>("");
  const { role, canWrite } = useOrgRole();

  useEffect(() => {
    fetchSubscribers();

    const channel = supabase
      .channel('subscribers-page')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscribers'
        },
        () => {
          fetchSubscribers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSubscribers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // First check if user is org owner
      let organizationId: string | null = null;

      const { data: ownedOrg } = await supabase
        .from("organizations")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownedOrg) {
        organizationId = ownedOrg.id;
      } else {
        // Check if user is a staff member
        const { data: membership } = await supabase
          .from("organization_members")
          .select("org_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (membership) {
          organizationId = membership.org_id;
        }
      }

      if (!organizationId) {
        toast.error("No organization found");
        return;
      }
      
      setOrgId(organizationId);

      const { data: plans } = await supabase
        .from("subscription_plans")
        .select("id")
        .eq("org_id", organizationId);

      if (!plans) return;

      const planIds = plans.map(p => p.id);

      const { data: subsData, error } = await supabase
        .from("subscribers")
        .select("*")
        .in("plan_id", planIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setSubscribers(subsData || []);
    } catch (error) {
      console.error("Error fetching subscribers:", error);
      toast.error("Failed to load subscribers");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subscribers</h1>
          <p className="text-muted-foreground">Manage your subscription customers</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Subscriber
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>All Subscribers</CardTitle>
          </div>
          <CardDescription>
            {subscribers.length} total subscriber{subscribers.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscribers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No subscribers yet</p>
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Subscriber
              </Button>
            </div>
          ) : (
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next Payment</TableHead>
                    {canWrite && <TableHead className="text-right">Contact</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscribers.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">
                        {sub.customer_name || "N/A"}
                      </TableCell>
                      <TableCell>{sub.email}</TableCell>
                      <TableCell>₦{sub.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                          {sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {sub.next_payment_date
                          ? new Date(sub.next_payment_date).toLocaleDateString()
                          : "N/A"}
                      </TableCell>
                      {canWrite && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => window.location.href = `mailto:${sub.email}`}
                                >
                                  <Mail className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Email {sub.email}</p>
                              </TooltipContent>
                            </Tooltip>
                            {sub.phone && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => window.location.href = `tel:${sub.phone}`}
                                  >
                                    <Phone className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Call {sub.phone}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>

      <SubscriberManagementDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        orgId={orgId}
        onSubscriberRemoved={fetchSubscribers}
      />
    </div>
  );
}
