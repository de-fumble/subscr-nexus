import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Download, Mail, Loader2, Plus, Trash2 } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { InvoicePDFDocument } from "@/components/InvoicePDFDocument";
import { logAuditEvent } from "@/utils/auditLogger";
import { useOrgRole } from "@/hooks/useOrgRole";

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  orgName: string;
  orgEmail: string;
}

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  orgId,
  orgName,
  orgEmail,
}: CreateInvoiceDialogProps) {
  const { role } = useOrgRole();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now().toString().slice(-6)}`);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const updated = [...items];
    if (field === "description") {
      updated[index][field] = value as string;
    } else {
      updated[index][field] = Number(value) || 0;
    }
    setItems(updated);
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const total = subtotal;

  const resetForm = () => {
    setCustomerName("");
    setCustomerEmail("");
    setInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);
    setDueDate("");
    setNotes("");
    setItems([{ description: "", quantity: 1, unitPrice: 0 }]);
  };

  const generatePDF = async () => {
    const invoiceData = {
      invoiceNumber,
      date: new Date().toLocaleDateString(),
      dueDate: dueDate ? new Date(dueDate).toLocaleDateString() : "On Receipt",
      customerName,
      customerEmail,
      orgName,
      orgEmail,
      items,
      subtotal,
      total,
      notes,
    };

    const blob = await pdf(<InvoicePDFDocument data={invoiceData} />).toBlob();
    return blob;
  };

  const handleDownload = async () => {
    if (!customerName || items.some((item) => !item.description || item.unitPrice <= 0)) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const blob = await generatePDF();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      logAuditEvent("create_invoice", "invoice", invoiceNumber, "invoices", {
        customer: customerName,
        email: customerEmail,
        total,
        action: "downloaded"
      }, role || "User");

      toast.success("Invoice downloaded successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!customerName || !customerEmail || items.some((item) => !item.description || item.unitPrice <= 0)) {
      toast.error("Please fill in customer name, email, and all item details");
      return;
    }

    setSending(true);
    try {
      // Generate PDF blob
      const blob = await generatePDF();

      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(blob);
      const base64PDF = await base64Promise;

      // Send email via edge function (you'd need to create this)
      const { error } = await supabase.functions.invoke("send-invoice-email", {
        body: {
          to: customerEmail,
          customerName,
          invoiceNumber,
          amount: total,
          orgName,
          pdfBase64: base64PDF,
        },
      });

      if (error) throw error;

      logAuditEvent("create_invoice", "invoice", invoiceNumber, "invoices", {
        customer: customerName,
        email: customerEmail,
        total,
        action: "emailed"
      }, role || "User");

      toast.success(`Invoice sent to ${customerEmail}`);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error sending invoice:", error);
      toast.error("Failed to send invoice. You can download it instead.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" />
            Create Invoice
          </DialogTitle>
          <DialogDescription>
            Create a professional invoice to send to your customers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input
                id="invoiceNumber"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Customer Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Customer Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Customer Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="customer@email.com"
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">Line Items</h3>
              <Button variant="outline" size="sm" onClick={addItem} className="gap-1">
                <Plus className="h-3 w-3" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    {index === 0 && <Label className="text-xs text-muted-foreground">Description *</Label>}
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(index, "description", e.target.value)}
                      placeholder="Service or product"
                    />
                  </div>
                  <div className="col-span-2">
                    {index === 0 && <Label className="text-xs text-muted-foreground">Qty</Label>}
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                    />
                  </div>
                  <div className="col-span-3">
                    {index === 0 && <Label className="text-xs text-muted-foreground">Unit Price (₦)</Label>}
                    <Input
                      type="number"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <span className="text-sm font-medium">
                      ₦{(item.quantity * item.unitPrice).toLocaleString()}
                    </span>
                    {items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₦{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>₦{total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment terms, thank you message, etc."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleDownload}
              disabled={loading || sending}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download PDF
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleSendEmail}
              disabled={loading || sending || !customerEmail}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Send via Email
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
