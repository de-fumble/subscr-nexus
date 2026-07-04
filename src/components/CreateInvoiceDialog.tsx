import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { FileText, Download, Mail, Loader2, Plus, Trash2, Copy, CalendarDays, Check, ChevronsUpDown, Building2, User, Hash, Receipt } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { InvoicePDFDocument } from "@/components/InvoicePDFDocument";
import { logAuditEvent } from "@/utils/auditLogger";
import { useOrgRole } from "@/hooks/useOrgRole";
import { APPLE_FONT } from "@/lib/appleLayout";

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

const CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: "NGN", label: "Nigerian Naira", symbol: "₦" },
  { code: "GHS", label: "Ghanaian Cedi", symbol: "GH₵" },
  { code: "KES", label: "Kenyan Shilling", symbol: "KSh" },
  { code: "UGX", label: "Ugandan Shilling", symbol: "USh" },
  { code: "TZS", label: "Tanzanian Shilling", symbol: "TSh" },
  { code: "ZAR", label: "South African Rand", symbol: "R" },
  { code: "XOF", label: "West African CFA", symbol: "CFA" },
  { code: "XAF", label: "Central African CFA", symbol: "FCFA" },
  { code: "EGP", label: "Egyptian Pound", symbol: "E£" },
  { code: "MAD", label: "Moroccan Dirham", symbol: "MAD" },
  { code: "BWP", label: "Botswana Pula", symbol: "P" },
  { code: "ZMW", label: "Zambian Kwacha", symbol: "ZK" },
  { code: "RWF", label: "Rwandan Franc", symbol: "RF" },
  { code: "USD", label: "US Dollar", symbol: "$" },
];

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  orgName: string;
  orgEmail: string;
  initialTemplateName?: string | null;
}

/* ─── Shared Apple-style classes ─── */
const inputCls =
  "w-full h-9 px-3 rounded-[8px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-white/[0.04] text-[13px] text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 outline-none transition-all focus:border-black/20 dark:focus:border-white/20 focus:ring-2 focus:ring-black/[0.04] dark:focus:ring-white/[0.06]";

const labelCls = "block text-[11px] font-medium text-black/40 dark:text-white/40 uppercase tracking-[0.04em] mb-1.5";

const sectionTitle = "text-[11px] font-semibold uppercase tracking-[0.07em] text-black/35 dark:text-white/35";

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
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("NGN");
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [taxRate, setTaxRate] = useState(0);
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
      setIssueDate(parsed.issueDate || new Date().toISOString().split("T")[0]);
      setDueDate(parsed.dueDate || "");
      setCurrency(parsed.currency || "NGN");
      setTaxRate(parsed.taxRate ?? 0);
      setNotes(parsed.notes || "");
      setItems(parsed.items?.length ? parsed.items : [{ description: "", quantity: 1, unitPrice: 0 }]);
    } catch {
      // Ignore draft parse issues
    }
  }, [open, STORAGE_KEY]);

  useEffect(() => {
    if (!open) return;
    const draftData = {
      customerName,
      customerEmail,
      customerPhone,
      invoiceNumber,
      issueDate,
      dueDate,
      currency,
      taxRate,
      notes,
      items,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draftData));
  }, [open, customerName, customerEmail, customerPhone, invoiceNumber, issueDate, dueDate, currency, taxRate, notes, items, STORAGE_KEY]);

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
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;
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
    setIssueDate(new Date().toISOString().split("T")[0]);
    setDueDate("");
    setCurrency("NGN");
    setTaxRate(0);
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
      date: new Date(issueDate).toLocaleDateString(),
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

  const currencyObj = CURRENCIES.find((c) => c.code === currency);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[680px] max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 border-0 rounded-[16px] shadow-[0_24px_80px_rgba(0,0,0,0.16),0_0_0_0.5px_rgba(0,0,0,0.06)] bg-[#f5f5f7] dark:bg-[#1c1c1e]"
        style={{ fontFamily: APPLE_FONT }}
      >
        {/* ── Modal Header ── */}
        <div className="sticky top-0 z-20 px-6 pt-5 pb-4 bg-[#f5f5f7]/95 dark:bg-[#1c1c1e]/95 backdrop-blur-xl border-b border-black/[0.04] dark:border-white/[0.06]">
          <DialogHeader className="space-y-0">
            <DialogTitle className="text-[17px] font-semibold text-black dark:text-white tracking-[-0.02em] flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-[7px] bg-black/[0.05] dark:bg-white/[0.08] flex items-center justify-center">
                <FileText className="h-[15px] w-[15px] text-black/50 dark:text-white/50" strokeWidth={1.8} />
              </div>
              Invoice Studio
            </DialogTitle>
            <DialogDescription className="text-[12px] text-black/35 dark:text-white/35 mt-1 pl-[38px]">
              Build and export a client-ready invoice.
            </DialogDescription>
          </DialogHeader>

          {/* Quick Templates */}
          <div className="flex items-center gap-1.5 mt-4 overflow-x-auto">
            <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-black/30 dark:text-white/30 shrink-0 mr-1">Templates</span>
            {invoiceTemplates.map((template) => (
              <button
                key={template.name}
                onClick={() => applyTemplate(template)}
                className="shrink-0 px-3 py-[5px] rounded-full border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-[11px] font-medium text-black/60 dark:text-white/60 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-all active:scale-[0.97]"
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Invoice Meta */}
          <div className="bg-white dark:bg-white/[0.03] rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.03)] p-4">
            <div className="flex items-center gap-2 mb-3.5">
              <Hash className="h-3.5 w-3.5 text-black/30 dark:text-white/30" strokeWidth={2} />
              <span className={sectionTitle}>Invoice Details</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className={labelCls}>Invoice No.</label>
                <input
                  className={inputCls}
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="INV-001"
                />
              </div>
              <div>
                <label className={labelCls}>Issue Date</label>
                <input
                  type="date"
                  className={inputCls}
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Due Date</label>
                <input
                  type="date"
                  className={inputCls}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
                <div className="flex gap-1 mt-1.5">
                  {[
                    { label: "Today", days: 0 },
                    { label: "+7d", days: 7 },
                    { label: "+30d", days: 30 },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setDueDate(getISODateAfterDays(opt.days))}
                      className="px-2 py-[2px] rounded-[5px] text-[10px] font-medium text-black/35 dark:text-white/35 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Currency</label>
                <Popover open={currencyPickerOpen} onOpenChange={setCurrencyPickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className={`${inputCls} flex items-center justify-between text-left`}
                    >
                      <span className="truncate">{currencyObj?.code ?? "Select"}</span>
                      <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-30" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[260px] p-0 rounded-[10px] shadow-[0_12px_40px_rgba(0,0,0,0.12)] border-black/[0.06]" align="start">
                    <Command>
                      <CommandInput placeholder="Search currency..." className="text-[13px]" />
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
                              className="text-[12px]"
                            >
                              <Check className={`mr-2 h-3.5 w-3.5 ${currency === c.code ? "opacity-100" : "opacity-0"}`} />
                              <span className="font-medium">{c.code}</span>
                              <span className="ml-1.5 text-black/40 dark:text-white/40">{c.label}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* From / To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* From */}
            <div className="bg-white dark:bg-white/[0.03] rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.03)] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-3.5 w-3.5 text-black/30 dark:text-white/30" strokeWidth={2} />
                <span className={sectionTitle}>From</span>
              </div>
              <p className="text-[13px] font-medium text-black dark:text-white">{orgName}</p>
              <p className="text-[12px] text-black/40 dark:text-white/40 mt-0.5">{orgEmail}</p>
            </div>

            {/* To */}
            <div className="bg-white dark:bg-white/[0.03] rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.03)] p-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-3.5 w-3.5 text-black/30 dark:text-white/30" strokeWidth={2} />
                <span className={sectionTitle}>Bill To</span>
              </div>
              <div className="space-y-2">
                <input
                  className={inputCls}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name *"
                />
                <input
                  type="email"
                  className={inputCls}
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="customer@email.com"
                />
                <input
                  className={inputCls}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Phone (optional)"
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white dark:bg-white/[0.03] rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.04] dark:border-white/[0.04]">
              <div className="flex items-center gap-2">
                <Receipt className="h-3.5 w-3.5 text-black/30 dark:text-white/30" strokeWidth={2} />
                <span className={sectionTitle}>Line Items</span>
                <span className="text-[10px] text-black/25 dark:text-white/25 tabular-nums">
                  {completedItems}/{items.length}
                </span>
              </div>
              <button
                onClick={addItem}
                className="flex items-center gap-1 text-[11px] font-medium text-black/45 dark:text-white/45 hover:text-black/70 dark:hover:text-white/70 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-black/[0.015] dark:bg-white/[0.02]">
              <div className="col-span-5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-black/25 dark:text-white/25">Description</span>
              </div>
              <div className="col-span-2 text-center">
                <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-black/25 dark:text-white/25">Qty</span>
              </div>
              <div className="col-span-3 text-right">
                <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-black/25 dark:text-white/25">Price</span>
              </div>
              <div className="col-span-2 text-right">
                <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-black/25 dark:text-white/25">Amount</span>
              </div>
            </div>

            {/* Item Rows */}
            <div className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 items-center px-4 py-2.5 group hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors"
                >
                  <div className="col-span-5">
                    <input
                      className={`${inputCls} h-8 text-[12px]`}
                      value={item.description}
                      onChange={(e) => updateItem(index, "description", e.target.value)}
                      placeholder="Service or product"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      className={`${inputCls} h-8 text-[12px] text-center`}
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      min="0"
                      className={`${inputCls} h-8 text-[12px] text-right`}
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <span className="text-[12px] font-medium text-black/70 dark:text-white/70 tabular-nums">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </span>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => duplicateItem(index)}
                        className="p-1 rounded-[4px] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="h-3 w-3 text-black/30 dark:text-white/30" />
                      </button>
                      {items.length > 1 && (
                        <button
                          onClick={() => removeItem(index)}
                          className="p-1 rounded-[4px] hover:bg-red-500/10 transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="h-3 w-3 text-red-500/50 hover:text-red-500/80" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-black/[0.06] dark:border-white/[0.06] px-4 py-3.5 bg-black/[0.01] dark:bg-white/[0.01]">
              <div className="max-w-[260px] ml-auto space-y-1.5">
                <div className="flex justify-between text-[12px]">
                  <span className="text-black/40 dark:text-white/40">Subtotal</span>
                  <span className="text-black/70 dark:text-white/70 tabular-nums font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-black/40 dark:text-white/40 flex items-center gap-1.5">
                    Tax
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                      className="w-[42px] h-6 px-1.5 rounded-[5px] border border-black/[0.06] dark:border-white/[0.08] bg-transparent text-[11px] text-center text-black/60 dark:text-white/60 outline-none focus:border-black/15 dark:focus:border-white/15"
                    />
                    <span className="text-black/25 dark:text-white/25">%</span>
                  </span>
                  <span className="text-black/70 dark:text-white/70 tabular-nums font-medium">{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-black/[0.08] dark:border-white/[0.08]">
                  <span className="text-[14px] font-semibold text-black dark:text-white">Total</span>
                  <span className="text-[14px] font-semibold text-black dark:text-white tabular-nums">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white dark:bg-white/[0.03] rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.03)] p-4">
            <label className={`${labelCls} mb-2`}>Notes & Payment Terms</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment is due within 30 days. Bank transfer details..."
              rows={3}
              className={`${inputCls} h-auto py-2.5 resize-none leading-[1.5]`}
            />
          </div>
        </div>

        {/* ── Sticky Footer Actions ── */}
        <div className="sticky bottom-0 px-6 py-4 bg-[#f5f5f7]/95 dark:bg-[#1c1c1e]/95 backdrop-blur-xl border-t border-black/[0.04] dark:border-white/[0.06]">
          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              disabled={loading || sending || !canGenerateInvoice}
              className="flex-1 h-10 flex items-center justify-center gap-2 rounded-full border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-white/[0.05] text-[13px] font-medium text-black dark:text-white hover:bg-black/[0.02] dark:hover:bg-white/[0.08] transition-all active:scale-[0.98] disabled:opacity-35 disabled:pointer-events-none"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" strokeWidth={1.8} />
              )}
              Download PDF
            </button>
            <button
              onClick={handleSendEmail}
              disabled={loading || sending || !customerEmail || !canGenerateInvoice}
              className="flex-1 h-10 flex items-center justify-center gap-2 rounded-full bg-black dark:bg-white text-white dark:text-black text-[13px] font-medium hover:opacity-80 transition-all active:scale-[0.98] disabled:opacity-35 disabled:pointer-events-none"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" strokeWidth={1.8} />
              )}
              Email Invoice
            </button>
          </div>
          <p className="text-[10px] text-black/25 dark:text-white/25 text-center mt-2.5">
            Draft auto-saves while you type · Email opens in your default mail app
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
