import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  RotateCcw,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

const APPLE_FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif";

interface Transaction {
  id: string;
  reference: string;
  amount: number;
  customer_name: string;
  customer_email: string;
  plan_name: string;
  paid_at: string;
  type: "one-time" | "subscription";
  already_refunded: boolean;
}

interface RefundResult {
  success: boolean;
  message: string;
  error?: string;
  refund?: {
    id: string;
    amount: number | null;
    status: string;
    transaction_reference: string;
    created_at: string;
    currency: string;
    merchant_note: string | null;
  };
}

interface RefundRequestDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  userEmail: string;
  orgId: string;
  children?: React.ReactNode;
}

type Screen = "list" | "confirm" | "result";

export function RefundRequestDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  orgId,
  children,
}: RefundRequestDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled
    ? (v: boolean) => controlledOnOpenChange?.(v)
    : setInternalOpen;

  const [screen, setScreen] = useState<Screen>("list");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTxns, setLoadingTxns] = useState(false);
  const [txnError, setTxnError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Transaction | null>(null);
  const [partialAmount, setPartialAmount] = useState("");
  const [processingRefund, setProcessingRefund] = useState(false);
  const [refundResult, setRefundResult] = useState<RefundResult | null>(null);

  // Fetch transactions when dialog opens
  useEffect(() => {
    if (open) {
      fetchTransactions();
    }
  }, [open, orgId]);

  const fetchTransactions = async () => {
    setLoadingTxns(true);
    setTxnError(null);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-paystack-analytics", {
        body: { action: "refund_transactions", orgId },
      });
      if (error) throw error;
      if (data?.transactions) {
        setTransactions(data.transactions);
      } else {
        setTransactions([]);
      }
    } catch (err: any) {
      const msg = err?.message || "Failed to load recent transactions";
      setTxnError(msg);
      toast.error(msg);
    } finally {
      setLoadingTxns(false);
    }
  };

  const handleSelectTransaction = (txn: Transaction) => {
    if (txn.already_refunded) return;
    setSelected(txn);
    setPartialAmount("");
    setScreen("confirm");
  };

  const handleProcessRefund = async () => {
    if (!selected) return;
    setProcessingRefund(true);
    try {
      const amountValue = partialAmount ? parseFloat(partialAmount) : undefined;
      const { data, error } = await supabase.functions.invoke("fetch-paystack-analytics", {
        body: {
          action: "process_refund",
          orgId,
          transactionReference: selected.reference,
          ...(amountValue && amountValue > 0 ? { amount: amountValue } : {}),
        },
      });

      if (error) throw error;

      setRefundResult(data as RefundResult);
      setScreen("result");
    } catch (err: any) {
      // The edge function returns structured error in body even on 4xx
      const errMsg = err?.message || "Refund request failed";
      setRefundResult({
        success: false,
        message: "Refund declined",
        error: errMsg,
      });
      setScreen("result");
    } finally {
      setProcessingRefund(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setScreen("list");
      setSelected(null);
      setPartialAmount("");
      setRefundResult(null);
      setTxnError(null);
    }, 300);
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      {children && <span onClick={() => setOpen(true)}>{children}</span>}

      <DialogContent
        className="max-w-[480px] p-0 overflow-hidden rounded-[20px] border-0 shadow-[0_24px_64px_rgba(0,0,0,0.2)]"
        style={{ fontFamily: APPLE_FONT }}
      >
        {/* ── Header ── */}
        <div className="px-6 pt-6 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {screen !== "list" && (
                <button
                  onClick={() => {
                    if (screen === "confirm") setScreen("list");
                    if (screen === "result") {
                      if (refundResult?.success) {
                        handleClose();
                      } else {
                        setScreen("confirm");
                      }
                    }
                  }}
                  className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/8 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/12 transition-colors shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-black/50 dark:text-white/50" />
                </button>
              )}
              <div className="w-9 h-9 rounded-[10px] bg-blue-50 dark:bg-blue-500/12 flex items-center justify-center shrink-0">
                <RotateCcw className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <DialogTitle
                  className="text-[15px] font-semibold tracking-[-0.01em] text-black dark:text-white"
                  style={{ fontFamily: APPLE_FONT }}
                >
                  {screen === "list" && "File a Refund"}
                  {screen === "confirm" && "Confirm Refund"}
                  {screen === "result" && (refundResult?.success ? "Refund Initiated" : "Refund Declined")}
                </DialogTitle>
                <p className="text-[12px] text-black/40 dark:text-white/40 mt-0.5">
                  {screen === "list" && "Transactions from the last 3 days"}
                  {screen === "confirm" && "Review details before submitting"}
                  {screen === "result" && "Response from Paystack"}
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* ── Body ── */}
        <div className="max-h-[72vh] overflow-y-auto">

          {/* ── SCREEN: Transaction List ── */}
          {screen === "list" && (
            <div className="px-4 py-4">
              {loadingTxns ? (
                <div className="flex flex-col items-center py-14 gap-3">
                  <Loader2 className="w-6 h-6 text-black/25 dark:text-white/25 animate-spin" />
                  <p className="text-[13px] text-black/35 dark:text-white/35">
                    Fetching recent transactions…
                  </p>
                </div>
              ) : txnError ? (
                <div className="flex flex-col items-center py-12 gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-black dark:text-white">
                      Couldn't load transactions
                    </p>
                    <p className="text-[12px] text-black/40 dark:text-white/40 mt-1">
                      {txnError}
                    </p>
                  </div>
                  <button
                    onClick={fetchTransactions}
                    className="mt-1 px-4 py-1.5 rounded-full bg-black/5 dark:bg-white/8 text-[12px] font-medium text-black/60 dark:text-white/60 hover:bg-black/10 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center py-12 gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-black/[0.04] dark:bg-white/[0.05] flex items-center justify-center">
                    <Clock className="w-6 h-6 text-black/30 dark:text-white/30" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-black dark:text-white">
                      No recent transactions
                    </p>
                    <p className="text-[12px] text-black/40 dark:text-white/40 mt-1">
                      No successful transactions found in the last 3 days.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-black/35 dark:text-white/35 px-1 mb-3">
                    {transactions.length} transaction{transactions.length !== 1 ? "s" : ""} found
                  </p>
                  {transactions.map((txn) => (
                    <button
                      key={txn.id}
                      onClick={() => handleSelectTransaction(txn)}
                      disabled={txn.already_refunded}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-[12px] text-left transition-all group ${
                        txn.already_refunded
                          ? "bg-black/[0.02] dark:bg-white/[0.02] opacity-50 cursor-not-allowed"
                          : "bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] active:scale-[0.99]"
                      }`}
                    >
                      {/* Amount bubble */}
                      <div className="w-10 h-10 rounded-[10px] bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                        <span className="text-[11px] font-bold text-blue-500">₦</span>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-semibold text-black dark:text-white tabular-nums">
                            ₦{txn.amount.toLocaleString()}
                          </span>
                          {txn.already_refunded ? (
                            <span className="text-[10px] font-semibold text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">
                              Refunded
                            </span>
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                        <p className="text-[12px] text-black/50 dark:text-white/50 truncate">
                          {txn.customer_name}
                          {txn.customer_email !== "Unknown" ? (
                            <span className="text-black/30 dark:text-white/30"> · {txn.customer_email}</span>
                          ) : null}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-black/30 dark:text-white/30">
                            {txn.plan_name}
                          </span>
                          <span className="text-black/15 dark:text-white/15">·</span>
                          <span className="text-[10px] text-black/30 dark:text-white/30">
                            {formatDate(txn.paid_at)}
                          </span>
                          <span className="text-black/15 dark:text-white/15">·</span>
                          <span className="text-[10px] font-mono text-black/25 dark:text-white/25">
                            {txn.reference.substring(0, 12)}…
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── SCREEN: Confirm Refund ── */}
          {screen === "confirm" && selected && (
            <div className="px-6 py-5 space-y-5">
              {/* Transaction summary card */}
              <div className="rounded-[14px] bg-black/[0.03] dark:bg-white/[0.04] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-black/35 dark:text-white/35">
                    Transaction
                  </span>
                  <span className="text-[11px] font-mono text-black/30 dark:text-white/30">
                    {selected.reference}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[28px] font-semibold tracking-[-0.02em] text-black dark:text-white tabular-nums">
                    ₦{selected.amount.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-emerald-500 font-medium">Successful</span>
                </div>
                <div className="space-y-1.5 pt-1 border-t border-black/[0.05] dark:border-white/[0.05]">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-black/40 dark:text-white/40">Customer</span>
                    <span className="text-[12px] text-black dark:text-white font-medium">
                      {selected.customer_name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-black/40 dark:text-white/40">Email</span>
                    <span className="text-[12px] text-black/60 dark:text-white/60 truncate max-w-[200px]">
                      {selected.customer_email}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-black/40 dark:text-white/40">Plan</span>
                    <span className="text-[12px] text-black/60 dark:text-white/60">
                      {selected.plan_name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-black/40 dark:text-white/40">Date</span>
                    <span className="text-[12px] text-black/60 dark:text-white/60">
                      {formatDate(selected.paid_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Partial refund option */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-black/35 dark:text-white/35 mb-2">
                  Refund Amount{" "}
                  <span className="normal-case font-normal text-black/20 dark:text-white/20">
                    (leave blank for full refund)
                  </span>
                </p>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-black/40 dark:text-white/40 font-medium">
                    ₦
                  </span>
                  <input
                    type="number"
                    placeholder={`Up to ${selected.amount.toLocaleString()}`}
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    max={selected.amount}
                    min={1}
                    className="w-full pl-7 pr-3 py-2.5 rounded-[10px] bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.06] text-[13px] text-black dark:text-white placeholder:text-black/20 dark:placeholder:text-white/20 outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 transition-all"
                  />
                </div>
                {partialAmount && parseFloat(partialAmount) > selected.amount && (
                  <p className="text-[11px] text-red-400 mt-1.5">
                    Amount cannot exceed ₦{selected.amount.toLocaleString()}
                  </p>
                )}
              </div>

              {/* Warning note */}
              <div className="flex gap-2.5 px-3.5 py-3 rounded-[10px] bg-amber-50 dark:bg-amber-500/8 border border-amber-100 dark:border-amber-500/15">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[12px] text-amber-700 dark:text-amber-400 leading-relaxed">
                  This will send a refund request directly to Paystack. Full refunds are processed
                  immediately and cannot be reversed.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2.5">
                <button
                  onClick={() => setScreen("list")}
                  className="flex-1 py-2.5 rounded-[10px] border border-black/10 dark:border-white/10 text-[13px] font-medium text-black/60 dark:text-white/60 hover:bg-black/4 dark:hover:bg-white/4 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleProcessRefund}
                  disabled={
                    processingRefund ||
                    (!!partialAmount && parseFloat(partialAmount) > selected.amount)
                  }
                  className="flex-1 py-2.5 rounded-[10px] bg-black dark:bg-white text-white dark:text-black text-[13px] font-medium flex items-center justify-center gap-2 hover:opacity-80 active:scale-[0.98] transition-all disabled:opacity-40"
                >
                  {processingRefund ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      {partialAmount ? `Refund ₦${parseFloat(partialAmount).toLocaleString()}` : "Full Refund"}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── SCREEN: Result ── */}
          {screen === "result" && refundResult && (
            <div className="px-6 py-8 flex flex-col items-center text-center gap-5">
              {/* Icon */}
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center ${
                  refundResult.success
                    ? "bg-emerald-50 dark:bg-emerald-500/12"
                    : "bg-red-50 dark:bg-red-500/10"
                }`}
              >
                {refundResult.success ? (
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                ) : (
                  <XCircle className="w-10 h-10 text-red-400" />
                )}
              </div>

              {/* Title */}
              <div>
                <p className="text-[18px] font-semibold tracking-[-0.01em] text-black dark:text-white">
                  {refundResult.success ? "Refund Initiated" : "Refund Declined"}
                </p>
                <p className="text-[13px] text-black/40 dark:text-white/40 mt-1.5 leading-relaxed max-w-[300px]">
                  {refundResult.success
                    ? refundResult.message
                    : refundResult.error || refundResult.message}
                </p>
              </div>

              {/* Refund details if successful */}
              {refundResult.success && refundResult.refund && (
                <div className="w-full rounded-[14px] bg-black/[0.03] dark:bg-white/[0.04] p-4 text-left space-y-2.5">
                  {refundResult.refund.amount !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-black/40 dark:text-white/40">Amount</span>
                      <span className="text-[13px] font-semibold text-black dark:text-white tabular-nums">
                        ₦{refundResult.refund.amount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-black/40 dark:text-white/40">Status</span>
                    <span
                      className={`text-[12px] font-semibold capitalize ${
                        refundResult.refund.status === "processed"
                          ? "text-emerald-500"
                          : "text-amber-500"
                      }`}
                    >
                      {refundResult.refund.status || "Pending"}
                    </span>
                  </div>
                  {refundResult.refund.transaction_reference && (
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-black/40 dark:text-white/40">Ref</span>
                      <span className="text-[11px] font-mono text-black/50 dark:text-white/50">
                        {refundResult.refund.transaction_reference}
                      </span>
                    </div>
                  )}
                  {refundResult.refund.currency && (
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-black/40 dark:text-white/40">Currency</span>
                      <span className="text-[12px] text-black/60 dark:text-white/60">
                        {refundResult.refund.currency}
                      </span>
                    </div>
                  )}
                  {refundResult.refund.created_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-black/40 dark:text-white/40">Initiated</span>
                      <span className="text-[12px] text-black/60 dark:text-white/60">
                        {new Date(refundResult.refund.created_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {refundResult.refund.merchant_note && (
                    <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.05]">
                      <p className="text-[11px] text-black/35 dark:text-white/35 uppercase tracking-wide font-semibold mb-1">
                        Note
                      </p>
                      <p className="text-[12px] text-black/60 dark:text-white/60">
                        {refundResult.refund.merchant_note}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* CTA */}
              <div className="w-full flex gap-2.5">
                {!refundResult.success && (
                  <button
                    onClick={() => setScreen("confirm")}
                    className="flex-1 py-2.5 rounded-[10px] border border-black/10 dark:border-white/10 text-[13px] font-medium text-black/60 dark:text-white/60 hover:bg-black/4 transition-colors"
                  >
                    Try Again
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="flex-1 py-2.5 rounded-[10px] bg-black dark:bg-white text-white dark:text-black text-[13px] font-medium hover:opacity-80 active:scale-[0.98] transition-all"
                >
                  {refundResult.success ? "Done" : "Close"}
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}