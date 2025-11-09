import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TransactionDetails {
  reference: string;
  amount: number;
  status: string;
  customer_email: string;
  customer_name: string;
  paid_at: string;
  plan: string;
  currency: string;
}

export function VerifyTransactionCard() {
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [transaction, setTransaction] = useState<TransactionDetails | null>(null);

  const handleVerify = async () => {
    if (!reference.trim()) {
      toast.error("Please enter a reference number");
      return;
    }

    setLoading(true);
    setTransaction(null);

    try {
      const { data, error } = await supabase.functions.invoke("verify-transaction", {
        body: { reference: reference.trim() },
      });

      if (error) throw error;

      if (data.transaction) {
        setTransaction(data.transaction);
        toast.success("Transaction found");
      } else {
        toast.error("Transaction not found");
      }
    } catch (error) {
      console.error("Error verifying transaction:", error);
      toast.error("Failed to verify transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify Transaction</CardTitle>
        <CardDescription>
          Enter a transaction reference to view its details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Enter transaction reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
          />
          <Button onClick={handleVerify} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {transaction && (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableBody>
                <TableRow>
                  <TableHead className="w-[200px]">Reference</TableHead>
                  <TableCell className="font-mono">{transaction.reference}</TableCell>
                </TableRow>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableCell>
                    {transaction.currency} {(transaction.amount / 100).toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        transaction.status === "success"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {transaction.status}
                    </span>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableCell>{transaction.customer_name || "N/A"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableCell>{transaction.customer_email}</TableCell>
                </TableRow>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableCell>{transaction.plan || "N/A"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableHead>Paid At</TableHead>
                  <TableCell>
                    {new Date(transaction.paid_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
