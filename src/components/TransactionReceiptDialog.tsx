import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, Printer, CheckCircle2 } from "lucide-react";
import logoImage from "@/assets/logo.png";

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

interface TransactionReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionDetails;
  organization?: Organization | null;
}

export function TransactionReceiptDialog({
  open,
  onOpenChange,
  transaction,
  organization,
}: TransactionReceiptDialogProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = receiptRef.current?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${transaction.reference}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { width: 60px; height: 60px; border-radius: 12px; }
            .title { font-size: 24px; font-weight: bold; margin: 10px 0 5px; }
            .subtitle { color: #666; font-size: 14px; }
            .status-badge { display: inline-block; padding: 4px 12px; background: #dcfce7; color: #166534; border-radius: 9999px; font-size: 12px; font-weight: 600; margin: 10px 0; }
            .section { margin: 20px 0; }
            .section-title { font-weight: 600; color: #374151; margin-bottom: 10px; font-size: 14px; }
            .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
            .row:last-child { border-bottom: none; }
            .label { color: #6b7280; font-size: 14px; }
            .value { font-weight: 500; font-size: 14px; }
            .amount-row { background: #f9fafb; padding: 16px; border-radius: 8px; margin: 20px 0; }
            .amount-label { color: #6b7280; font-size: 12px; }
            .amount { font-size: 28px; font-weight: bold; color: #111827; }
            .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownload = () => {
    // Create a simple text receipt
    const receipt = `
PAYMENT RECEIPT
===============

Reference: ${transaction.reference}
Date: ${new Date(transaction.paid_at).toLocaleString()}
Status: ${transaction.status.toUpperCase()}

Customer Details:
Name: ${transaction.customer_name || "N/A"}
Email: ${transaction.customer_email}

Payment Details:
Amount: ${transaction.currency} ${(transaction.amount / 100).toLocaleString()}
Plan: ${transaction.plan || "N/A"}

Organization: ${organization?.org_name || "Recurra"}

---
This is an automatically generated receipt.
Powered by Recurra
    `.trim();

    const blob = new Blob([receipt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${transaction.reference}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payment Receipt</DialogTitle>
          <DialogDescription>
            Transaction details and receipt
          </DialogDescription>
        </DialogHeader>

        <div ref={receiptRef} className="space-y-4">
          <div className="header text-center">
            <img 
              src={organization?.logo_url || logoImage} 
              alt="Logo" 
              className="logo w-14 h-14 mx-auto rounded-xl object-cover"
            />
            <h2 className="title text-xl font-bold mt-3">
              {organization?.org_name || "Recurra"}
            </h2>
            <p className="subtitle text-sm text-muted-foreground">Payment Receipt</p>
            <div className="status-badge inline-flex items-center gap-1 mt-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              <CheckCircle2 className="h-3 w-3" />
              {transaction.status === "success" ? "Successful" : transaction.status}
            </div>
          </div>

          <Separator />

          <div className="amount-row bg-muted/50 p-4 rounded-xl text-center">
            <p className="amount-label text-xs text-muted-foreground uppercase tracking-wider">Amount Paid</p>
            <p className="amount text-2xl font-bold">
              {transaction.currency} {(transaction.amount / 100).toLocaleString()}
            </p>
          </div>

          <div className="section space-y-2">
            <h4 className="section-title text-sm font-medium text-muted-foreground">Transaction Details</h4>
            <div className="space-y-2">
              <div className="row flex justify-between text-sm">
                <span className="label text-muted-foreground">Reference</span>
                <span className="value font-mono text-xs">{transaction.reference}</span>
              </div>
              <div className="row flex justify-between text-sm">
                <span className="label text-muted-foreground">Date</span>
                <span className="value">{new Date(transaction.paid_at).toLocaleDateString()}</span>
              </div>
              <div className="row flex justify-between text-sm">
                <span className="label text-muted-foreground">Time</span>
                <span className="value">{new Date(transaction.paid_at).toLocaleTimeString()}</span>
              </div>
              {transaction.plan && (
                <div className="row flex justify-between text-sm">
                  <span className="label text-muted-foreground">Plan</span>
                  <span className="value">{transaction.plan}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div className="section space-y-2">
            <h4 className="section-title text-sm font-medium text-muted-foreground">Customer Details</h4>
            <div className="space-y-2">
              <div className="row flex justify-between text-sm">
                <span className="label text-muted-foreground">Name</span>
                <span className="value">{transaction.customer_name || "N/A"}</span>
              </div>
              <div className="row flex justify-between text-sm">
                <span className="label text-muted-foreground">Email</span>
                <span className="value">{transaction.customer_email}</span>
              </div>
            </div>
          </div>

          <p className="footer text-center text-xs text-muted-foreground pt-4 border-t">
            Powered by Recurra • Secure payments by Paystack
          </p>
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1 gap-2" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button className="flex-1 gap-2" onClick={handleDownload}>
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
