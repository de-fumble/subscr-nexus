import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Trash2, Mail, Search, AlertTriangle, Calendar, Users } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Subscriber {
  id: string;
  email: string;
  customer_name: string;
  amount: number;
  status: string;
  paystack_subscription_code: string;
  paystack_customer_code: string;
  plan_name: string;
  next_payment_date: string | null;
  created_at: string;
}

interface FailedPayment {
  id: string;
  email: string;
  customer_name: string;
  amount: number;
  status: string;
  failure_reason: string | null;
  payment_failed_at: string | null;
  retry_count: number | null;
  last_retry_at: string | null;
  paystack_subscription_code: string | null;
}

interface PlanManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: {
    id: string;
    name: string;
    price: number;
    interval: string;
  };
  onSubscriberRemoved?: () => void;
}

export function PlanManagementDialog({
  open,
  onOpenChange,
  plan,
  onSubscriberRemoved,
}: PlanManagementDialogProps) {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [failedPayments, setFailedPayments] = useState<FailedPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [subscriberToRemove, setSubscriberToRemove] = useState<Subscriber | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open && plan.id) {
      fetchSubscribers();
    }
  }, [open, plan.id]);

  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("list-subscribers", {
        body: { planId: plan.id, includeFailedPayments: true },
      });

      if (error) throw error;

      const list = (data as any)?.subscribers || [];
      const failed = (data as any)?.failedPayments || [];

      const formattedData = list.map((sub: any) => ({
        id: sub.id || sub.paystack_subscription_code,
        email: sub.email,
        customer_name: sub.customer_name || "N/A",
        amount: sub.amount,
        status: sub.status,
        paystack_subscription_code: sub.paystack_subscription_code,
        paystack_customer_code: sub.paystack_customer_code,
        plan_name: sub.plan_name || "Unknown",
        next_payment_date: sub.next_payment_date,
        created_at: sub.created_at,
      }));

      setSubscribers(formattedData);
      setFailedPayments(failed);
    } catch (error) {
      console.error("Error fetching subscribers:", error);
      toast.error("Failed to load subscribers");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSubscriber = async (subscriber: Subscriber) => {
    setRemovingId(subscriber.paystack_subscription_code);
    try {
      const { error } = await supabase.functions.invoke("cancel-subscription", {
        body: {
          subscriptionCode: subscriber.paystack_subscription_code,
        },
      });

      if (error) throw error;

      toast.success("Subscriber removed successfully");
      fetchSubscribers();
      onSubscriberRemoved?.();
    } catch (error) {
      console.error("Error removing subscriber:", error);
      toast.error("Failed to remove subscriber");
    } finally {
      setRemovingId(null);
      setSubscriberToRemove(null);
    }
  };

  const handleContactSubscriber = (email: string, name: string) => {
    const subject = encodeURIComponent(`Regarding your ${plan.name} subscription`);
    const body = encodeURIComponent(`Hi ${name},\n\n`);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
  };

  const filteredSubscribers = useMemo(() => {
    if (!searchQuery.trim()) return subscribers;
    const query = searchQuery.toLowerCase();
    return subscribers.filter(
      (sub) =>
        sub.email.toLowerCase().includes(query) ||
        sub.customer_name.toLowerCase().includes(query)
    );
  }, [subscribers, searchQuery]);

  const activeSubscribers = filteredSubscribers.filter(s => s.status === "active");
  const inactiveSubscribers = filteredSubscribers.filter(s => s.status !== "active");

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch {
      return "N/A";
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Manage: {plan.name}
            </DialogTitle>
            <DialogDescription>
              ₦{plan.price.toLocaleString()} / {plan.interval} • View subscribers, billing dates, and failed payments
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Tabs defaultValue="active" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="active" className="gap-2">
                  Active
                  <Badge variant="secondary">{activeSubscribers.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="inactive" className="gap-2">
                  Inactive
                  <Badge variant="secondary">{inactiveSubscribers.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="failed" className="gap-2">
                  <AlertTriangle className="h-3 w-3" />
                  Failed
                  <Badge variant="destructive">{failedPayments.length}</Badge>
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-auto mt-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <TabsContent value="active" className="m-0">
                      {activeSubscribers.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                          {searchQuery ? "No matching active subscribers" : "No active subscribers"}
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Customer</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Next Billing
                                </div>
                              </TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {activeSubscribers.map((subscriber) => (
                              <TableRow key={subscriber.id}>
                                <TableCell className="font-medium">
                                  {subscriber.customer_name}
                                </TableCell>
                                <TableCell>{subscriber.email}</TableCell>
                                <TableCell>₦{subscriber.amount.toLocaleString()}</TableCell>
                                <TableCell>{formatDate(subscriber.next_payment_date)}</TableCell>
                                <TableCell>
                                  <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                                    {subscriber.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleContactSubscriber(subscriber.email, subscriber.customer_name)}
                                      title="Contact subscriber"
                                    >
                                      <Mail className="h-4 w-4 text-primary" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setSubscriberToRemove(subscriber)}
                                      disabled={removingId === subscriber.paystack_subscription_code}
                                      title="Remove subscriber"
                                    >
                                      {removingId === subscriber.paystack_subscription_code ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      )}
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </TabsContent>

                    <TabsContent value="inactive" className="m-0">
                      {inactiveSubscribers.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                          {searchQuery ? "No matching inactive subscribers" : "No inactive subscribers"}
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Customer</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {inactiveSubscribers.map((subscriber) => (
                              <TableRow key={subscriber.id}>
                                <TableCell className="font-medium">
                                  {subscriber.customer_name}
                                </TableCell>
                                <TableCell>{subscriber.email}</TableCell>
                                <TableCell>₦{subscriber.amount.toLocaleString()}</TableCell>
                                <TableCell>
                                  <Badge variant="secondary">
                                    {subscriber.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleContactSubscriber(subscriber.email, subscriber.customer_name)}
                                    title="Contact subscriber"
                                  >
                                    <Mail className="h-4 w-4 text-primary" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </TabsContent>

                    <TabsContent value="failed" className="m-0">
                      {failedPayments.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                          No failed payments for this plan
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Customer</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Failed At</TableHead>
                              <TableHead>Reason</TableHead>
                              <TableHead>Retries</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {failedPayments.map((payment) => (
                              <TableRow key={payment.id}>
                                <TableCell className="font-medium">
                                  {payment.customer_name}
                                </TableCell>
                                <TableCell>{payment.email}</TableCell>
                                <TableCell>₦{payment.amount.toLocaleString()}</TableCell>
                                <TableCell>{formatDate(payment.payment_failed_at)}</TableCell>
                                <TableCell className="max-w-[150px] truncate" title={payment.failure_reason || undefined}>
                                  {payment.failure_reason || "Unknown"}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{payment.retry_count || 0}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleContactSubscriber(payment.email, payment.customer_name)}
                                    title="Contact customer"
                                  >
                                    <Mail className="h-4 w-4 text-primary" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </TabsContent>
                  </>
                )}
              </div>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!subscriberToRemove} onOpenChange={() => setSubscriberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Subscriber</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {subscriberToRemove?.customer_name} from the{" "}
              {plan.name} plan? This will cancel their subscription.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => subscriberToRemove && handleRemoveSubscriber(subscriberToRemove)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}