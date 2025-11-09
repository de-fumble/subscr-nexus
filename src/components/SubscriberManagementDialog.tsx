import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
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

interface Subscriber {
  id: string;
  email: string;
  customer_name: string;
  amount: number;
  status: string;
  paystack_subscription_code: string;
  paystack_customer_code: string;
  plan_name: string;
  created_at: string;
}

interface SubscriberManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  onSubscriberRemoved?: () => void;
}

export function SubscriberManagementDialog({
  open,
  onOpenChange,
  orgId,
  onSubscriberRemoved,
}: SubscriberManagementDialogProps) {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [subscriberToRemove, setSubscriberToRemove] = useState<Subscriber | null>(null);

  useEffect(() => {
    if (open) {
      fetchSubscribers();
    }
  }, [open, orgId]);

  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("list-subscribers", {
        body: { orgId },
      });

      if (error) throw error;

      const list = (data as any)?.subscribers || [];

      const formattedData = list.map((sub: any) => ({
        id: sub.id || sub.paystack_subscription_code,
        email: sub.email,
        customer_name: sub.customer_name || "N/A",
        amount: sub.amount,
        status: sub.status,
        paystack_subscription_code: sub.paystack_subscription_code,
        paystack_customer_code: sub.paystack_customer_code,
        plan_name: sub.plan_name || "Unknown",
        created_at: sub.created_at,
      }));

      setSubscribers(formattedData);
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
      const { data, error } = await supabase.functions.invoke("cancel-subscription", {
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Manage Subscribers</DialogTitle>
            <DialogDescription>
              View and manage all active subscribers across your plans
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : subscribers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No subscribers found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscribers.map((subscriber) => (
                  <TableRow key={subscriber.id}>
                    <TableCell className="font-medium">
                      {subscriber.customer_name}
                    </TableCell>
                    <TableCell>{subscriber.email}</TableCell>
                    <TableCell>{subscriber.plan_name}</TableCell>
                    <TableCell>₦{(subscriber.amount / 100).toLocaleString()}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          subscriber.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {subscriber.status}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {subscriber.paystack_subscription_code}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSubscriberToRemove(subscriber)}
                        disabled={removingId === subscriber.id}
                      >
                        {removingId === subscriber.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!subscriberToRemove} onOpenChange={() => setSubscriberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Subscriber</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {subscriberToRemove?.customer_name} from the{" "}
              {subscriberToRemove?.plan_name} plan? This will cancel their subscription on Paystack.
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
