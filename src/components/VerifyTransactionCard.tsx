import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Loader2, FileText, CheckCircle2, AlertCircle, Clock3, Mail, User, Hash, Calendar, CreditCard, Tag } from "lucide-react";
import { TransactionReceiptDialog } from "./TransactionReceiptDialog";
import { APPLE_FONT, card, pillBtn } from "@/lib/appleLayout";

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

interface Organization {
  org_name: string;
  email: string;
  logo_url?: string | null;
}

interface VerifyTransactionCardProps {
  organization?: Organization | null;
}

const inputCls =
  "w-full h-10 px-3.5 rounded-[10px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-white/[0.04] text-[13px] text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 outline-none transition-all focus:border-black/20 dark:focus:border-white/20 focus:ring-2 focus:ring-black/[0.04] dark:focus:ring-white/[0.06] font-mono";

export function VerifyTransactionCard({ organization }: VerifyTransactionCardProps) {
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [transaction, setTransaction] = useState<TransactionDetails | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

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

  const getStatusConfig = (status: string) => {
    if (status === "success") {
      return {
        icon: <CheckCircle2 className="h-[18px] w-[18px] text-emerald-500" strokeWidth={1.8} />,
        label: "Successful",
        bg: "bg-emerald-500/10",
        text: "text-emerald-600 dark:text-emerald-400",
        dot: "bg-emerald-500",
      };
    }
    if (status === "failed") {
      return {
        icon: <AlertCircle className="h-[18px] w-[18px] text-red-500" strokeWidth={1.8} />,
        label: "Failed",
        bg: "bg-red-500/10",
        text: "text-red-600 dark:text-red-400",
        dot: "bg-red-500",
      };
    }
    return {
      icon: <Clock3 className="h-[18px] w-[18px] text-amber-500" strokeWidth={1.8} />,
      label: "Pending",
      bg: "bg-amber-500/10",
      text: "text-amber-600 dark:text-amber-400",
      dot: "bg-amber-500",
    };
  };

  return (
    <div style={{ fontFamily: APPLE_FONT }}>
      {/* Search Input */}
      <div className={`${card} p-5`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-black/35 dark:text-white/35 mb-3">
          Transaction Reference
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/20 dark:text-white/20 pointer-events-none" />
            <input
              className={`${inputCls} pl-9`}
              placeholder="Paste reference (e.g. TRX-abc123...)"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            />
          </div>
          <button
            onClick={handleVerify}
            disabled={loading}
            className={`${pillBtn} sm:min-w-[120px] justify-center h-10 text-[13px] px-5 disabled:opacity-35 disabled:pointer-events-none`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking…
              </>
            ) : (
              "Verify"
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {transaction && (
        <div className="mt-4 space-y-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
          {/* Status + Amount Banner */}
          {(() => {
            const config = getStatusConfig(transaction.status);
            return (
              <div className={`${card} p-5`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-[10px] ${config.bg} flex items-center justify-center shrink-0`}>
                      {config.icon}
                    </div>
                    <div>
                      <p className="text-[11px] text-black/35 dark:text-white/35 uppercase tracking-[0.04em] font-medium">Status</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                        <span className={`text-[14px] font-semibold ${config.text}`}>
                          {config.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-[11px] text-black/35 dark:text-white/35 uppercase tracking-[0.04em] font-medium">Amount</p>
                    <p className="text-[22px] font-semibold tracking-[-0.02em] text-black dark:text-white tabular-nums mt-0.5">
                      {transaction.currency} {(transaction.amount / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Details Grid */}
          <div className={`${card} overflow-hidden divide-y divide-black/[0.04] dark:divide-white/[0.04]`}>
            {[
              {
                icon: Hash,
                label: "Reference",
                value: transaction.reference,
                mono: true,
              },
              {
                icon: User,
                label: "Customer",
                value: transaction.customer_name || "N/A",
              },
              {
                icon: Mail,
                label: "Email",
                value: transaction.customer_email || "N/A",
              },
              {
                icon: Tag,
                label: "Plan",
                value: transaction.plan || "N/A",
              },
              {
                icon: Calendar,
                label: "Paid At",
                value: transaction.paid_at ? new Date(transaction.paid_at).toLocaleString() : "N/A",
              },
            ].map((row, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-7 h-7 rounded-[7px] bg-black/[0.03] dark:bg-white/[0.05] flex items-center justify-center shrink-0">
                  <row.icon className="h-3.5 w-3.5 text-black/35 dark:text-white/35" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-black/30 dark:text-white/30 font-medium uppercase tracking-[0.04em]">{row.label}</p>
                  <p className={`text-[13px] text-black dark:text-white mt-0.5 truncate ${row.mono ? "font-mono text-[12px]" : ""}`}>
                    {row.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Generate Receipt CTA */}
          {transaction.status === "success" && (
            <button
              onClick={() => setShowReceipt(true)}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-full bg-black dark:bg-white text-white dark:text-black text-[13px] font-medium hover:opacity-80 transition-all active:scale-[0.98]"
            >
              <FileText className="h-4 w-4" strokeWidth={1.8} />
              Generate Receipt
            </button>
          )}
        </div>
      )}

      {/* Receipt Dialog */}
      {transaction && (
        <TransactionReceiptDialog
          open={showReceipt}
          onOpenChange={setShowReceipt}
          transaction={transaction}
          organization={organization}
        />
      )}
    </div>
  );
}