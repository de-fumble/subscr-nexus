import { useEffect, useMemo, useState } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { FileText, Download, Mail, Loader2, Plus, Trash2, Copy, CalendarDays, Check, ChevronsUpDown } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { InvoicePDFDocument } from "@/components/InvoicePDFDocument";
import { logAuditEvent } from "@/utils/auditLogger";
import { useOrgRole } from "@/hooks/useOrgRole";

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface InvoiceTemplate {
  name: string;
  items: InvoiceItem[];
}

type CurrencyCode =
  | "NGN"
  | "GHS"
  | "KES"
  | "UGX"
  | "TZS"
  | "ZAR"
  | "XOF"
  | "XAF"
  | "EGP"
  | "MAD"
  | "BWP"
  | "ZMW"
  | "RWF"
  | "USD";

const CURRENCIES: { code: CurrencyCode; label: string }[] = [
  { code: "NGN", label: "Nigerian Naira (NGN)" },
  { code: "GHS", label: "Ghanaian Cedi (GHS)" },
  { code: "KES", label: "Kenyan Shilling (KES)" },
  { code: "UGX", label: "Ugandan Shilling (UGX)" },
  { code: "TZS", label: "Tanzanian Shilling (TZS)" },
  { code: "ZAR", label: "South African Rand (ZAR)" },
  { code: "XOF", label: "West African CFA Franc (XOF)" },
  { code: "XAF", label: "Central African CFA Franc (XAF)" },
  { code: "EGP", label: "Egyptian Pound (EGP)" },
  { code: "MAD", label: "Moroccan Dirham (MAD)" },
  { code: "BWP", label: "Botswana Pula (BWP)" },
  { code: "ZMW", label: "Zambian Kwacha (ZMW)" },
  { code: "RWF", label: "Rwandan Franc (RWF)" },
  { code: "USD", label: "US Dollar (USD)" },
];

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  orgName: string;
  orgEmail: string;
  initialTemplateName?: string | null;
}

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  orgId,
  orgName,
  orgEmail,
  initialTemplateName,
}: CreateInvoiceDialogProps) {
  const STORAGE_KEY = `recurra_invoice_draft_${orgId}`;
  const { role } = useOrgRole();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now().toString().slice(-6)}`);
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("NGN");
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);

  const invoiceTemplates: InvoiceTemplate[] = [
    {
      name: "Consultation",
      items: [{ description: "Professional Consultation Session", quantity: 1, unitPrice: 25000 }],
    },
    {
      name: "Starter Package",
      items: [{ description: "Starter Service Package", quantity: 1, unitPrice: 50000 }],
    },
    {
      name: "Monthly Retainer",
      items: [{ description: "Monthly Retainer", quantity: 1, unitPrice: 120000 }],
    },
  ];

  useEffect(() => {
    if (!open) return;
    try {
      const draft = localStorage.getItem(STORAGE_KEY);
      if (!draft) return;
      const parsed = JSON.parse(draft);
      setCustomerName(parsed.customerName || "");
      setCustomerEmail(parsed.customerEmail || "");
      setCustomerPhone(parsed.customerPhone || "");
      setInvoiceNumber(parsed.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`);
      setDueDate(parsed.dueDate || "");
      setCurrency(parsed.currency || "NGN");
      setNotes(parsed.notes || "");
      setItems(parsed.items?.length ? parsed.items : [{ description: "", quantity: 1, unitPrice: 0 }]);
    } catch {
      // Ignore draft parse issues silently
    }
  }, [open, STORAGE_KEY]);

  useEffect(() => {
    if (!open) return;
    const draftData = {
      customerName,
      customerEmail,
      customerPhone,
      invoiceNumber,
      dueDate,
      currency,
      notes,
      items,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draftData));
  }, [open, customerName, customerEmail, customerPhone, invoiceNumber, dueDate, currency, notes, items, STORAGE_KEY]);

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0 }]);
  };

  const duplicateItem = (index: number) => {
    const selected = items[index];
    setItems([...items.slice(0, index + 1), { ...selected }, ...items.slice(index + 1)]);
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
  const completedItems = useMemo(
    () => items.filter((item) => item.description.trim() && item.unitPrice > 0).length,
    [items]
  );
  const canGenerateInvoice = customerName.trim() && completedItems > 0;

  const getISODateAfterDays = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
  };

  const applyTemplate = (template: InvoiceTemplate) => {
    setItems(template.items);
    toast.success(`${template.name} template applied`);
  };

  useEffect(() => {
    if (!open || !initialTemplateName) return;
    const template = invoiceTemplates.find((t) => t.name === initialTemplateName);
    if (template) {
      setItems(template.items);
    }
  }, [open, initialTemplateName]);

  const resetForm = () => {
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);
    setDueDate("");
    setCurrency("NGN");
    setNotes("");
    setItems([{ description: "", quantity: 1, unitPrice: 0 }]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const formatCurrency = (amount: number) => {
    return `${currency} ${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const generatePDF = async () => {
    const invoiceData = {
      invoiceNumber,
      date: new Date().toLocaleDateString(),
      dueDate: dueDate ? new Date(dueDate).toLocaleDateString() : "On Receipt",
      customerName,
      customerEmail,
      customerPhone,
      orgName,
      orgEmail,
      items,
      subtotal,
      total,
      currency,
      notes,
    };

    const blob = await pdf(<InvoicePDFDocument data={invoiceData} />).toBlob();
    return blob;
  };

  const handleDownload = async () => {
    if (!canGenerateInvoice) {
      toast.error("Add customer name and at least one complete line item");
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

      await logAuditEvent("create_invoice", "organization", orgId, "invoices", {
        invoice_number: invoiceNumber,
        customer: customerName,
        email: customerEmail,
        total,
        action: "downloaded"
      }, role || "Owner");

      toast.success("Invoice downloaded successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!customerName || !customerEmail || !canGenerateInvoice) {
      toast.error("Please fill in customer name, email, and all item details");
      return;
    }

    setSending(true);
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

      const subject = encodeURIComponent(`Invoice ${invoiceNumber} from ${orgName}`);
      const body = encodeURIComponent(
        `Hello ${customerName},\n\nPlease find your invoice attached.\n\nInvoice Number: ${invoiceNumber}\nAmount: ${formatCurrency(total)}\nDue Date: ${dueDate ? new Date(dueDate).toLocaleDateString() : "On Receipt"}\n\nKindly attach the downloaded PDF before sending.\n\nRegards,\n${orgName}`
      );
      window.location.href = `mailto:${customerEmail}?subject=${subject}&body=${body}`;

      await logAuditEvent("create_invoice", "organization", orgId, "invoices", {
        invoice_number: invoiceNumber,
        customer: customerName,
        email: customerEmail,
        total,
        action: "email_draft_opened"
      }, role || "Owner");

      toast.success("Email client opened. Attach the downloaded PDF and send.");
    } catch (error) {
      console.error("Error preparing email draft:", error);
      toast.error("Failed to open email draft. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto glass-card border-border/40">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" />
            <span>Invoice Studio</span>
          </DialogTitle>
          <DialogDescription>
            Build and export a client-ready invoice in minutes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="rounded-xl border border-border/40 bg-muted/20 p-3 sm:p-4 flex flex-wrap items-center gap-2">
            <span className="text-xs sm:text-sm text-muted-foreground mr-1">Quick templates:</span>
            {invoiceTemplates.map((template) => (
              <Button
                key={template.name}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => applyTemplate(template)}
              >
                {template.name}
              </Button>
            ))}
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setDueDate(getISODateAfterDays(0))}>
                  <CalendarDays className="h-3.5 w-3.5" />
                  Today
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDueDate(getISODateAfterDays(7))}>
                  +7 days
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDueDate(getISODateAfterDays(30))}>
                  +30 days
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Popover open={currencyPickerOpen} onOpenChange={setCurrencyPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={currencyPickerOpen} className="w-full justify-between">
                    {CURRENCIES.find((c) => c.code === currency)?.label ?? "Select currency"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[340px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search currency..." />
                    <CommandList>
                      <CommandEmpty>No currency found.</CommandEmpty>
                      <CommandGroup>
                        {CURRENCIES.map((c) => (
                          <CommandItem
                            key={c.code}
                            value={`${c.code} ${c.label}`}
                            onSelect={() => {
                              setCurrency(c.code);
                              setCurrencyPickerOpen(false);
                            }}
                          >
                            <Check className={`mr-2 h-4 w-4 ${currency === c.code ? "opacity-100" : "opacity-0"}`} />
                            {c.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Customer Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Customer Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Customer Phone (Optional)</Label>
                <Input
                  id="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+234 801 234 5678"
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
                    {index === 0 && <Label className="text-xs text-muted-foreground">Unit Price ({currency})</Label>}
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
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground"
                      onClick={() => duplicateItem(index)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
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
            <div className="border-t pt-4 rounded-xl bg-muted/30 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {completedItems}/{items.length} item(s) complete
              </p>
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
              className="flex-1 gap-2 rounded-full"
              onClick={handleDownload}
              disabled={loading || sending || !canGenerateInvoice}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download PDF
            </Button>
            <Button
              className="flex-1 gap-2 rounded-full"
              onClick={handleSendEmail}
              disabled={loading || sending || !customerEmail || !canGenerateInvoice}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Open Email Draft
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            Draft auto-saves while you type. Email opens in your default mail app.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
