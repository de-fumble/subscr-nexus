import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, ExternalLink, RefreshCw, Loader2, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { useOrgRole } from "@/hooks/useOrgRole";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BackButton } from "@/components/BackButton";

interface Payment {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  is_paid: boolean;
  paid_at: string | null;
  paid_by_email: string | null;
  paid_by_name: string | null;
  created_at: string;
}

interface Organization {
  id: string;
  org_name: string;
  email: string;
  logo_url?: string | null;
}

const OneTimePayments = () => {
  const navigate = useNavigate();
  const { canCreatePlans, role, canAccessSettings } = useOrgRole();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>();

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      setUserEmail(user.email);

      let orgId = null;
      let orgData = null;
      const { data: ownedOrg } = await supabase
        .from("organizations")
        .select("id, org_name, email, logo_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownedOrg) {
        orgId = ownedOrg.id;
        orgData = ownedOrg;
      } else {
        const { data: membership } = await supabase
          .from("organization_members")
          .select("org_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (membership) {
          orgId = membership.org_id;
          const { data: memberOrg } = await supabase
            .from("organizations")
            .select("id, org_name, email, logo_url")
            .eq("id", membership.org_id)
            .maybeSingle();
          
          orgData = memberOrg;
        }
      }

      setOrganization(orgData);
      if (!orgId) return;

      const { data: paymentsData, error } = await supabase
        .from("one_time_payments")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching payments:", error);
        toast.error("Failed to load payments");
        return;
      }

      setPayments(paymentsData || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const copyPaymentLink = (paymentId: string) => {
    const link = `${window.location.origin}/pay/${paymentId}`;
    navigator.clipboard.writeText(link);
    toast.success("Payment link copied to clipboard!");
  };

  const pendingPayments = payments.filter(p => !p.is_paid);
  const paidPayments = payments.filter(p => p.is_paid);

  const renderPaymentCard = (payment: Payment, index: number) => (
    <Card
      key={payment.id}
      className="p-6 glass-card border-0 shadow-[var(--shadow-medium)] transition-all duration-300 hover:shadow-[var(--shadow-strong)] animate-fade-in"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-foreground">
            {payment.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Created {new Date(payment.created_at).toLocaleDateString()}
          </p>
        </div>
        <Badge variant={payment.is_paid ? "default" : "secondary"} className="gap-1">
          {payment.is_paid ? (
            <>
              <CheckCircle2 className="h-3 w-3" />
              Paid
            </>
          ) : (
            <>
              <Clock className="h-3 w-3" />
              Pending
            </>
          )}
        </Badge>
      </div>

      {payment.description && (
        <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
          {payment.description}
        </p>
      )}

      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-foreground">
            ₦{payment.amount.toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">
            one-time
          </span>
        </div>
      </div>

      {payment.is_paid && payment.paid_by_email && (
        <div className="mb-4 p-3 rounded-lg bg-muted/50 text-sm">
          <p className="text-muted-foreground">
            Paid by: <span className="text-foreground font-medium">{payment.paid_by_name || payment.paid_by_email}</span>
          </p>
          <p className="text-muted-foreground text-xs">
            {payment.paid_at && new Date(payment.paid_at).toLocaleString()}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Button
          onClick={() => copyPaymentLink(payment.id)}
          variant="outline"
          className="w-full gap-2"
          disabled={payment.is_paid}
          title={payment.is_paid ? "This payment has been completed" : "Copy payment link"}
        >
          <ExternalLink className="h-4 w-4" />
          {payment.is_paid ? "Payment Completed" : "Copy Payment Link"}
        </Button>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen w-full">
          <AppSidebar organization={organization} role={role} userEmail={userEmail} canAccessSettings={canAccessSettings} />
          <SidebarInset>
            <div className="flex min-h-screen items-center justify-center">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent mx-auto mb-4" />
                <p className="text-muted-foreground">Loading payments...</p>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar organization={organization} role={role} userEmail={userEmail} canAccessSettings={canAccessSettings} />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 glass-card px-4">
            <SidebarTrigger />
            <BackButton />
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">One-Time Payments</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchPayments(true)}
                disabled={refreshing}
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
              {canCreatePlans && (
                <Button
                  onClick={() => navigate("/payments/create")}
                  className="bg-accent hover:bg-accent/90 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Payment
                </Button>
              )}
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-6 py-8">
              <div className="mb-6">
                <p className="text-muted-foreground">Manage one-time payment links</p>
              </div>

              {payments.length === 0 ? (
                <Card className="p-12 glass-card border-0 shadow-[var(--shadow-medium)]">
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <Plus className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="mb-2 text-xl font-semibold text-foreground">
                      No payments yet
                    </h3>
                    <p className="mb-6 text-muted-foreground">
                      Create your first one-time payment link
                    </p>
                    {canCreatePlans && (
                      <Button
                        onClick={() => navigate("/payments/create")}
                        className="bg-accent hover:bg-accent/90"
                      >
                        Create Your First Payment
                      </Button>
                    )}
                  </div>
                </Card>
              ) : (
                <Tabs defaultValue="pending" className="space-y-6">
                  <TabsList>
                    <TabsTrigger value="pending" className="gap-2">
                      Pending
                      <Badge variant="secondary" className="ml-1">{pendingPayments.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="paid" className="gap-2">
                      Paid
                      <Badge variant="secondary" className="ml-1">{paidPayments.length}</Badge>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="pending">
                    {pendingPayments.length === 0 ? (
                      <Card className="p-8 glass-card border-0">
                        <div className="text-center text-muted-foreground">
                          <p>No pending payments</p>
                        </div>
                      </Card>
                    ) : (
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {pendingPayments.map((payment, index) => renderPaymentCard(payment, index))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="paid">
                    {paidPayments.length === 0 ? (
                      <Card className="p-8 glass-card border-0">
                        <div className="text-center text-muted-foreground">
                          <p>No paid payments yet</p>
                        </div>
                      </Card>
                    ) : (
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {paidPayments.map((payment, index) => renderPaymentCard(payment, index))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default OneTimePayments;