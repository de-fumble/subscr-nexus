import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { pdf } from "@react-pdf/renderer";
import {
  FileText, Download, Mail, Loader2, Plus, Trash2, Copy, Check,
  ChevronsUpDown, Building2, User, Hash, Receipt, LayoutDashboard,
  Search, Clock, ChevronRight, Palette, SlidersHorizontal,
  Eye, EyeOff, RefreshCw, FileDown, Settings2, Banknote, AlignLeft,
  Phone, MapPin, Tag, Shield
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { InvoicePDFDocument, PDFInvoiceData } from "@/invoicing/components/InvoicePDFDocument";
import { InvoicePreview } from "@/invoicing/components/InvoicePreview";
import { PremiumLoader } from "@/components/PremiumLoader";
import { FloatingSupport } from "@/components/FloatingSupport";
import { APPLE_FONT } from "@/lib/appleLayout";
import { CurrencyCode, InvoiceItem, TemplateId, InvoiceCustomization, LogoPosition } from "@/invoicing/types";
import { logAuditEvent } from "@/utils/auditLogger";
import { useOrgRole } from "@/hooks/useOrgRole";
import logoImage from "@/assets/logo.svg";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Organization {
  id: string;
  org_name: string;
  email: string;
  logo_url?: string | null;
}

interface SavedInvoiceRecord {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  date: string;
  total: number;
  currency: string;
  themeId: TemplateId;
  createdAt: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: "NGN", label: "Nigerian Naira",       symbol: "₦"  },
  { code: "GHS", label: "Ghanaian Cedi",        symbol: "GH₵"},
  { code: "KES", label: "Kenyan Shilling",      symbol: "KSh"},
  { code: "ZAR", label: "South African Rand",   symbol: "R"  },
  { code: "CAD", label: "Canadian Dollar",      symbol: "C$" },
  { code: "EUR", label: "Euro",                 symbol: "€"  },
  { code: "GBP", label: "British Pound",        symbol: "£"  },
  { code: "USD", label: "US Dollar",            symbol: "$"  },
];

interface TemplateOption {
  id: TemplateId;
  name: string;
  description: string;
  primaryDefault: string;
  accentDefault: string;
  preview: { bg: string; header: string; accent: string; text: string };
}

const TEMPLATES: TemplateOption[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Timeless black & white with top/bottom bars",
    primaryDefault: "#1a1a1a",
    accentDefault: "#1a1a1a",
    preview: { bg: "#fff", header: "#1a1a1a", accent: "#1a1a1a", text: "#333" },
  },
  {
    id: "modern",
    name: "Modern",
    description: "Bold colored header with card layout",
    primaryDefault: "#2563eb",
    accentDefault: "#2563eb",
    preview: { bg: "#fff", header: "#2563eb", accent: "#2563eb", text: "#333" },
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Ultra-clean, typography-first design",
    primaryDefault: "#111111",
    accentDefault: "#6366f1",
    preview: { bg: "#fff", header: "#fff", accent: "#6366f1", text: "#111" },
  },
  {
    id: "obsidian",
    name: "Obsidian",
    description: "Dark luxury with bold accent highlights",
    primaryDefault: "#0f0f0f",
    accentDefault: "#f59e0b",
    preview: { bg: "#0f0f0f", header: "#0f0f0f", accent: "#f59e0b", text: "#fff" },
  },
  {
    id: "forest",
    name: "Forest",
    description: "Professional sidebar layout with deep green",
    primaryDefault: "#064e3b",
    accentDefault: "#064e3b",
    preview: { bg: "#fff", header: "#064e3b", accent: "#064e3b", text: "#333" },
  },
];

const DEFAULT_CUSTOMIZATION: InvoiceCustomization = {
  themeId: "classic",
  primaryColor: "#1a1a1a",
  accentColor: "#1a1a1a",
  showLogo: false,
  showBorder: true,
  companyTagline: "",
  footerText: "",
  paymentTerms: "Payment is due within 14 days of invoice date.",
  bankDetails: "",
  logoDataUrl: undefined,
  logoPosition: "left",
};

const inputCls =
  "w-full h-9 px-3 rounded-[8px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-white/[0.04] text-[13px] text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 outline-none transition-all focus:border-black/20 dark:focus:border-white/20 focus:ring-2 focus:ring-black/[0.05] dark:focus:ring-white/[0.06]";
const labelCls = "block text-[10.5px] font-semibold text-black/40 dark:text-white/40 uppercase tracking-[0.04em] mb-1.5";
const sectionHdr = "text-[11px] font-bold uppercase tracking-[0.07em] text-black/35 dark:text-white/35 flex items-center gap-2";

type SidebarTab = "details" | "customize" | "history";

// ─── Component ────────────────────────────────────────────────────────────────
export function InvoicingTool() {
  const navigate = useNavigate();
  const { role } = useOrgRole();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userEmail, setUserEmail] = useState<string>();
  const [loading, setLoading] = useState(true);

  // Invoice form
  const [invoiceNumber, setInvoiceNumber]     = useState(`INV-${Date.now().toString().slice(-6)}`);
  const [issueDate, setIssueDate]             = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate]                 = useState("");
  const [currency, setCurrency]               = useState<CurrencyCode>("NGN");
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [taxRate, setTaxRate]                 = useState(0);
  const [discountRate, setDiscountRate]       = useState(0);
  const [notes, setNotes]                     = useState("");

  // Customer
  const [customerName, setCustomerName]       = useState("");
  const [customerEmail, setCustomerEmail]     = useState("");
  const [customerPhone, setCustomerPhone]     = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  // Sender extras
  const [orgPhone, setOrgPhone]               = useState("");
  const [orgAddress, setOrgAddress]           = useState("");

  // Items
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);

  // Customization
  const [customization, setCustomization] = useState<InvoiceCustomization>(DEFAULT_CUSTOMIZATION);

  // UI state
  const [sidebarTab, setSidebarTab]           = useState<SidebarTab>("details");
  const [pdfGenerating, setPdfGenerating]     = useState(false);
  const [emailSending, setEmailSending]       = useState(false);
  const [showPreview, setShowPreview]         = useState(true);
  const [savedInvoices, setSavedInvoices]     = useState<SavedInvoiceRecord[]>([]);
  const [historySearch, setHistorySearch]     = useState("");

  // ─── Data fetching ──────────────────────────────────────────────────────────
  const HISTORY_KEY = useMemo(() => `recurra_invoices_v2_${organization?.id || "default"}`, [organization?.id]);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!organization?.id) return;
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setSavedInvoices(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [organization?.id, HISTORY_KEY]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth?redirect=/invoicing"); return; }
      setUserEmail(user.email);

      let orgData = null;
      const { data: ownedOrg } = await supabase.from("organizations").select("id,org_name,email,logo_url").eq("user_id", user.id).maybeSingle();
      if (ownedOrg) {
        orgData = ownedOrg;
      } else {
        const { data: membership } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).maybeSingle();
        if (membership) {
          const { data: staffOrg } = await supabase.from("organizations").select("id,org_name,email,logo_url").eq("id", membership.org_id).maybeSingle();
          orgData = staffOrg;
        }
      }
      if (!orgData) { navigate("/auth?redirect=/invoicing"); return; }
      setOrganization(orgData);
    } catch { toast.error("Failed to load workspace data"); }
    finally { setLoading(false); }
  };

  // ─── Item management ─────────────────────────────────────────────────────────
  const addItem    = () => setItems(p => [...p, { description: "", quantity: 1, unitPrice: 0 }]);
  const removeItem = (i: number) => items.length > 1 && setItems(p => p.filter((_, idx) => idx !== i));
  const dupItem    = (i: number) => setItems(p => [...p.slice(0, i + 1), { ...p[i] }, ...p.slice(i + 1)]);
  const updateItem = (i: number, f: keyof InvoiceItem, v: string | number) =>
    setItems(p => { const n = [...p]; (n[i] as any)[f] = f === "description" ? v : (Number(v) || 0); return n; });

  // ─── Template selection ──────────────────────────────────────────────────────
  const applyTemplate = (tpl: TemplateOption) => {
    setCustomization(prev => ({
      ...prev,
      themeId: tpl.id,
      primaryColor: tpl.primaryDefault,
      accentColor: tpl.accentDefault,
    }));
    toast.success(`${tpl.name} template applied`);
  };

  const updateCustomization = useCallback(<K extends keyof InvoiceCustomization>(key: K, val: InvoiceCustomization[K]) => {
    setCustomization(prev => ({ ...prev, [key]: val }));
  }, []);

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2 MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      updateCustomization("logoDataUrl", ev.target?.result as string);
      updateCustomization("showLogo", true);
    };
    reader.readAsDataURL(file);
    // reset so the same file can be re-uploaded
    e.target.value = "";
  }, [updateCustomization]);

  // ─── Calculations ────────────────────────────────────────────────────────────
  const subtotal       = useMemo(() => items.reduce((s, i) => s + i.quantity * i.unitPrice, 0), [items]);
  const discountAmount = useMemo(() => subtotal * (discountRate / 100), [subtotal, discountRate]);
  const taxAmount      = useMemo(() => (subtotal - discountAmount) * (taxRate / 100), [subtotal, discountAmount, taxRate]);
  const total          = useMemo(() => subtotal - discountAmount + taxAmount, [subtotal, discountAmount, taxAmount]);
  const completedItems = useMemo(() => items.filter(i => i.description.trim() && i.unitPrice > 0).length, [items]);
  const canGenerate    = customerName.trim() && completedItems > 0;
  const currencyObj    = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];

  const formatCurrency = (amount: number, code: string = currency) => {
    const sym = CURRENCIES.find(c => c.code === code)?.symbol || code;
    return `${sym}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // ─── PDF Data builder ────────────────────────────────────────────────────────
  const buildPDFData = (): PDFInvoiceData => ({
    invoiceNumber,
    date: new Date(issueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    dueDate: dueDate ? new Date(dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "On Receipt",
    customerName,
    customerEmail,
    customerPhone,
    customerAddress,
    orgName: organization?.org_name || "Recurra Merchant",
    orgEmail: organization?.email || userEmail || "",
    orgPhone,
    orgAddress,
    items,
    subtotal,
    taxAmount,
    discountAmount,
    total,
    currency,
    currencySymbol: currencyObj.symbol,
    notes: notes || customization.paymentTerms || "",
    customization,
  });

  const livePreviewData = buildPDFData();

  // ─── History ─────────────────────────────────────────────────────────────────
  const saveToHistory = (rec: Omit<SavedInvoiceRecord, "id" | "createdAt">) => {
    const newRec: SavedInvoiceRecord = { ...rec, id: `inv_${Date.now()}`, createdAt: new Date().toISOString() };
    const updated = [newRec, ...savedInvoices.filter(i => i.invoiceNumber !== rec.invoiceNumber)].slice(0, 50);
    setSavedInvoices(updated);
    if (organization?.id) localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  // ─── PDF generation ──────────────────────────────────────────────────────────
  const generatePDFBlob = async () => pdf(<InvoicePDFDocument data={buildPDFData()} />).toBlob();

  const handleDownload = async () => {
    if (!canGenerate) { toast.error("Please fill in customer name and at least one line item"); return; }
    setPdfGenerating(true);
    try {
      const blob = await generatePDFBlob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      saveToHistory({ invoiceNumber, customerName, customerEmail, date: issueDate, total, currency, themeId: customization.themeId });
      if (organization?.id) {
        await logAuditEvent("create_invoice", "organization", organization.id, "invoices", { invoice_number: invoiceNumber, customer: customerName, total, template: customization.themeId, action: "downloaded" }, role || "Owner");
      }
      toast.success("Invoice PDF downloaded successfully!");
    } catch { toast.error("Failed to generate PDF"); }
    finally { setPdfGenerating(false); }
  };

  const handleSendEmail = async () => {
    if (!customerEmail || !canGenerate) { toast.error("Please fill in customer email and complete line items"); return; }
    setEmailSending(true);
    try {
      const blob = await generatePDFBlob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      saveToHistory({ invoiceNumber, customerName, customerEmail, date: issueDate, total, currency, themeId: customization.themeId });
      const sub  = encodeURIComponent(`Invoice ${invoiceNumber} from ${organization?.org_name || "Recurra"}`);
      const body = encodeURIComponent(`Hello ${customerName},\n\nPlease find your invoice attached.\n\nInvoice: ${invoiceNumber}\nAmount: ${formatCurrency(total)}\nDue: ${dueDate ? new Date(dueDate).toLocaleDateString() : "On Receipt"}\n\nThank you,\n${organization?.org_name}`);
      window.location.href = `mailto:${customerEmail}?subject=${sub}&body=${body}`;
      toast.success("Email client opened — attach the downloaded PDF");
    } catch { toast.error("Failed to prepare email"); }
    finally { setEmailSending(false); }
  };

  const regenerateInvoiceNumber = () => setInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return savedInvoices;
    const q = historySearch.toLowerCase();
    return savedInvoices.filter(i =>
      i.invoiceNumber.toLowerCase().includes(q) ||
      i.customerName.toLowerCase().includes(q) ||
      i.customerEmail.toLowerCase().includes(q)
    );
  }, [savedInvoices, historySearch]);

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-black flex items-center justify-center" style={{ fontFamily: APPLE_FONT }}>
        <PremiumLoader message="Loading Recurra Invoicing..." />
      </div>
    );
  }

  const activeTemplate = TEMPLATES.find(t => t.id === customization.themeId) || TEMPLATES[0];

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f0f0f3] dark:bg-[#0a0a0c] text-foreground flex flex-col" style={{ fontFamily: APPLE_FONT }}>

      {/* ── TOP NAV ── */}
      <header className="sticky top-0 z-50 w-full bg-teal-700 shadow-[0_2px_12px_rgba(0,0,0,0.18)]">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <img
              src={logoImage}
              alt="Recurra"
              className="w-8 h-8 rounded-xl group-hover:scale-105 transition-transform"
            />
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold tracking-tight text-white">Recurra Invoicing</span>
              </div>
              <p className="text-[10px] text-white/55 leading-none mt-0.5">Professional Billing Studio</p>
            </div>
          </Link>

          {/* Center: template quick-switch */}
          <div className="hidden md:flex items-center gap-1 bg-white/10 rounded-full p-1">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => applyTemplate(t)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  customization.themeId === t.id
                    ? "bg-white text-teal-700 shadow-sm"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {organization && (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-[11px] text-white/80">
                <Building2 className="h-3 w-3 text-white/60" />
                <span className="font-medium truncate max-w-[140px]">{organization.org_name}</span>
              </div>
            )}
            <button
              onClick={() => setShowPreview(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/25 bg-white/10 text-[11px] font-medium text-white hover:bg-white/20 transition-all"
            >
              {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{showPreview ? "Hide" : "Show"} Preview</span>
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-teal-700 text-[11px] font-bold hover:bg-white/90 transition-all shadow-sm"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── TEMPLATE GALLERY BANNER ── */}
      <div className="bg-white dark:bg-[#111113] border-b border-black/[0.05] dark:border-white/[0.05]">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-4 flex items-center gap-4 overflow-x-auto">
          <div className="shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] text-black/30 dark:text-white/30">
            Templates
          </div>
          <div className="flex items-center gap-3">
            {TEMPLATES.map(tpl => {
              const isActive = customization.themeId === tpl.id;
              return (
                <button
                  key={tpl.id}
                  onClick={() => applyTemplate(tpl)}
                  className={`group relative flex flex-col gap-2 shrink-0 transition-all ${isActive ? "scale-100" : "hover:scale-[1.02]"}`}
                >
                  {/* Mini visual card */}
                  <div
                    className="w-[96px] h-[72px] rounded-[10px] overflow-hidden shadow-sm border-2 transition-all"
                    style={{
                      borderColor: isActive ? tpl.preview.header : "transparent",
                      boxShadow: isActive ? `0 0 0 2px ${tpl.preview.header}25, 0 4px 12px rgba(0,0,0,0.12)` : "0 2px 8px rgba(0,0,0,0.07)",
                    }}
                  >
                    <TemplateMiniCard tpl={tpl} />
                  </div>
                  <div className="text-center">
                    <p className={`text-[10px] font-semibold ${isActive ? "text-black dark:text-white" : "text-black/50 dark:text-white/50"}`}>{tpl.name}</p>
                  </div>
                  {isActive && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-black dark:bg-white rounded-full flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-white dark:text-black" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── MAIN WORKSPACE ── */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 xl:px-8 py-6">
        <div className={`grid gap-6 ${showPreview ? "grid-cols-1 xl:grid-cols-[1fr_420px]" : "grid-cols-1"}`}>

          {/* ── LEFT: EDITOR PANEL ── */}
          <div className="space-y-5">

            {/* Invoice Meta Strip */}
            <div className="bg-white dark:bg-[#111113] rounded-[16px] border border-black/[0.06] dark:border-white/[0.07] shadow-[0_2px_16px_rgba(0,0,0,0.04)] p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-bold text-black dark:text-white flex items-center gap-2">
                  <Hash className="h-4 w-4 text-black/40 dark:text-white/40" />
                  Invoice Details
                </h2>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-black/35 dark:text-white/35 font-medium">Template:</span>
                  <span className="text-[11px] font-bold text-black dark:text-white px-2 py-0.5 rounded-full bg-black/[0.05] dark:bg-white/[0.08]">{activeTemplate.name}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className={labelCls}>Invoice No.</label>
                  <div className="relative">
                    <input className={inputCls} value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="INV-001" />
                    <button onClick={regenerateInvoiceNumber} className="absolute right-2 top-1/2 -translate-y-1/2 text-black/20 dark:text-white/20 hover:text-black/50 dark:hover:text-white/50 transition-colors" title="Regenerate">
                      <RefreshCw className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Issue Date</label>
                  <input type="date" className={inputCls} value={issueDate} onChange={e => setIssueDate(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Due Date</label>
                  <input type="date" className={inputCls} value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Currency</label>
                  <Popover open={currencyPickerOpen} onOpenChange={setCurrencyPickerOpen}>
                    <PopoverTrigger asChild>
                      <button className={`${inputCls} flex items-center justify-between text-left`}>
                        <span className="truncate font-medium">{currencyObj.symbol} {currencyObj.code}</span>
                        <ChevronsUpDown className="h-3 w-3 opacity-30 shrink-0" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[220px] p-0 rounded-[10px] shadow-xl border-black/[0.06]" align="start">
                      <Command>
                        <CommandInput placeholder="Search currency..." className="text-[12px]" />
                        <CommandList>
                          <CommandEmpty>No currency found.</CommandEmpty>
                          <CommandGroup>
                            {CURRENCIES.map(c => (
                              <CommandItem key={c.code} value={`${c.code} ${c.label}`} onSelect={() => { setCurrency(c.code); setCurrencyPickerOpen(false); }} className="text-[12px]">
                                <Check className={`mr-2 h-3.5 w-3.5 ${currency === c.code ? "opacity-100" : "opacity-0"}`} />
                                <span className="font-semibold mr-1.5">{c.symbol}</span>
                                <span className="font-medium">{c.code}</span>
                                <span className="ml-1 text-black/40 dark:text-white/40 text-[11px]">{c.label}</span>
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

            {/* From & Bill To */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Sender */}
              <div className="bg-white dark:bg-[#111113] rounded-[16px] border border-black/[0.06] dark:border-white/[0.07] shadow-[0_2px_16px_rgba(0,0,0,0.04)] p-5 space-y-3">
                <div className={sectionHdr}>
                  <Building2 className="h-3.5 w-3.5 text-black/30 dark:text-white/30" />
                  From (Sender)
                </div>
                <div className="p-3.5 rounded-[10px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.04]">
                  <p className="text-[13px] font-bold text-black dark:text-white">{organization?.org_name || "Your Organization"}</p>
                  <p className="text-[11px] text-black/45 dark:text-white/45 mt-0.5">{organization?.email || userEmail || "email@domain.com"}</p>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className={labelCls}><Phone className="h-2.5 w-2.5 inline mr-1" />Phone</label>
                    <input className={inputCls} value={orgPhone} onChange={e => setOrgPhone(e.target.value)} placeholder="Optional phone number" />
                  </div>
                  <div>
                    <label className={labelCls}><MapPin className="h-2.5 w-2.5 inline mr-1" />Address</label>
                    <input className={inputCls} value={orgAddress} onChange={e => setOrgAddress(e.target.value)} placeholder="Street, City, Country" />
                  </div>
                </div>
              </div>

              {/* Bill To */}
              <div className="bg-white dark:bg-[#111113] rounded-[16px] border border-black/[0.06] dark:border-white/[0.07] shadow-[0_2px_16px_rgba(0,0,0,0.04)] p-5 space-y-3">
                <div className={sectionHdr}>
                  <User className="h-3.5 w-3.5 text-black/30 dark:text-white/30" />
                  Bill To (Customer)
                </div>
                <div className="space-y-2">
                  <div>
                    <label className={labelCls}>Customer Name *</label>
                    <input className={inputCls} value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Client / Customer Name" />
                  </div>
                  <div>
                    <label className={labelCls}>Email Address *</label>
                    <input type="email" className={inputCls} value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="client@example.com" />
                  </div>
                  <div>
                    <label className={labelCls}><Phone className="h-2.5 w-2.5 inline mr-1" />Phone</label>
                    <input className={inputCls} value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Optional phone number" />
                  </div>
                  <div>
                    <label className={labelCls}><MapPin className="h-2.5 w-2.5 inline mr-1" />Address</label>
                    <input className={inputCls} value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} placeholder="Street, City, Country" />
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-white dark:bg-[#111113] rounded-[16px] border border-black/[0.06] dark:border-white/[0.07] shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.05] dark:border-white/[0.05]">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-black/40 dark:text-white/40" />
                  <h3 className="text-[14px] font-bold text-black dark:text-white">Line Items</h3>
                  <span className="text-[10px] text-black/30 dark:text-white/30 bg-black/[0.04] dark:bg-white/[0.05] px-1.5 py-0.5 rounded-full font-medium">{completedItems}/{items.length}</span>
                </div>
                <button onClick={addItem} className="flex items-center gap-1.5 text-[11px] font-semibold text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-all">
                  <Plus className="h-3.5 w-3.5" />Add Item
                </button>
              </div>

              {/* Table header */}
              <div className="grid grid-cols-12 gap-2 px-5 py-2.5 bg-black/[0.015] dark:bg-white/[0.02] text-[9.5px] font-bold uppercase tracking-widest text-black/30 dark:text-white/30 border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="col-span-5">Description</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-3 text-right">Unit Price</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>

              <div className="divide-y divide-black/[0.03] dark:divide-white/[0.04]">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center px-5 py-2.5 group hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors">
                    <div className="col-span-5">
                      <input
                        className={`${inputCls} h-8 text-[12px]`}
                        value={item.description}
                        onChange={e => updateItem(idx, "description", e.target.value)}
                        placeholder={`Service or product #${idx + 1}`}
                      />
                    </div>
                    <div className="col-span-2">
                      <input type="number" min="1" className={`${inputCls} h-8 text-[12px] text-center`} value={item.quantity} onChange={e => updateItem(idx, "quantity", e.target.value)} />
                    </div>
                    <div className="col-span-3">
                      <input type="number" min="0" className={`${inputCls} h-8 text-[12px] text-right`} value={item.unitPrice || ""} onChange={e => updateItem(idx, "unitPrice", e.target.value)} placeholder="0.00" />
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <span className="text-[12px] font-semibold text-black/80 dark:text-white/80 tabular-nums">
                        {currencyObj.symbol}{(item.quantity * item.unitPrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-0.5 ml-1">
                        <button onClick={() => dupItem(idx)} className="p-1 hover:bg-black/[0.06] rounded-md" title="Duplicate"><Copy className="h-3 w-3 text-black/30 dark:text-white/30" /></button>
                        {items.length > 1 && <button onClick={() => removeItem(idx)} className="p-1 hover:bg-red-500/10 rounded-md" title="Remove"><Trash2 className="h-3 w-3 text-red-400" /></button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="px-5 py-4 bg-black/[0.015] dark:bg-white/[0.02] border-t border-black/[0.05] dark:border-white/[0.05]">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <label className={labelCls}>Tax %</label>
                      <input type="number" min="0" max="100" value={taxRate} onChange={e => setTaxRate(Number(e.target.value) || 0)}
                        className="w-[64px] h-8 px-2 rounded-[8px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-white/[0.04] text-[12px] text-center outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10" />
                    </div>
                    <div>
                      <label className={labelCls}>Discount %</label>
                      <input type="number" min="0" max="100" value={discountRate} onChange={e => setDiscountRate(Number(e.target.value) || 0)}
                        className="w-[64px] h-8 px-2 rounded-[8px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-white/[0.04] text-[12px] text-center outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10" />
                    </div>
                  </div>
                  <div className="space-y-1 min-w-[220px]">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-black/40 dark:text-white/40">Subtotal</span>
                      <span className="font-medium text-black/70 dark:text-white/70 tabular-nums">{formatCurrency(subtotal)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-green-600">Discount ({discountRate}%)</span>
                        <span className="font-medium text-green-600 tabular-nums">-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    {taxAmount > 0 && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-black/40 dark:text-white/40">Tax ({taxRate}%)</span>
                        <span className="font-medium text-black/70 dark:text-white/70 tabular-nums">{formatCurrency(taxAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-black/[0.08] dark:border-white/[0.08]">
                      <span className="text-[14px] font-black text-black dark:text-white">Total Due</span>
                      <span className="text-[14px] font-black text-black dark:text-white tabular-nums">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white dark:bg-[#111113] rounded-[16px] border border-black/[0.06] dark:border-white/[0.07] shadow-[0_2px_16px_rgba(0,0,0,0.04)] p-5 space-y-3">
              <div className={sectionHdr}>
                <AlignLeft className="h-3.5 w-3.5 text-black/30 dark:text-white/30" />
                Notes & Payment Instructions
              </div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Payment due within 14 days. Bank transfer preferred. Account details: ..."
                rows={3}
                className={`${inputCls} h-auto py-2.5 resize-none leading-relaxed`}
              />
            </div>

            {/* Action Buttons */}
            <div className="bg-white dark:bg-[#111113] rounded-[16px] border border-black/[0.06] dark:border-white/[0.07] shadow-[0_2px_16px_rgba(0,0,0,0.04)] p-5">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleDownload}
                  disabled={pdfGenerating || emailSending || !canGenerate}
                  className="flex-1 h-12 flex items-center justify-center gap-2 rounded-[12px] bg-black dark:bg-white text-white dark:text-black text-[13px] font-bold hover:opacity-90 transition-all disabled:opacity-35 shadow-lg shadow-black/10 dark:shadow-white/10 active:scale-[0.98]"
                >
                  {pdfGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                  Download PDF Invoice
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={pdfGenerating || emailSending || !customerEmail || !canGenerate}
                  className="flex-1 h-12 flex items-center justify-center gap-2 rounded-[12px] border border-black/[0.10] dark:border-white/[0.14] bg-white dark:bg-white/[0.04] text-[13px] font-bold text-black dark:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.07] transition-all disabled:opacity-35 active:scale-[0.98]"
                >
                  {emailSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Email to Client
                </button>
              </div>
              {!canGenerate && (
                <p className="text-[11px] text-black/35 dark:text-white/35 text-center mt-2.5">
                  Fill in customer name + at least one complete line item to generate
                </p>
              )}
            </div>
          </div>

          {/* ── RIGHT: LIVE PREVIEW + SIDEBAR ── */}
          {showPreview && (
            <div className="space-y-5">

              {/* Sidebar Tabs */}
              <div className="bg-white dark:bg-[#111113] rounded-[16px] border border-black/[0.06] dark:border-white/[0.07] shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden">
                <div className="flex border-b border-black/[0.05] dark:border-white/[0.05]">
                  {([
                    { id: "details", label: "Preview", icon: Eye },
                    { id: "customize", label: "Customize", icon: Palette },
                    { id: "history", label: "History", icon: Clock },
                  ] as const).map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setSidebarTab(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[11px] font-semibold transition-all border-b-2 ${
                        sidebarTab === tab.id
                          ? "border-black dark:border-white text-black dark:text-white"
                          : "border-transparent text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70"
                      }`}
                    >
                      <tab.icon className="h-3.5 w-3.5" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* ── Preview Tab ── */}
                {sidebarTab === "details" && (
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[11px] font-semibold text-black/40 dark:text-white/40 uppercase tracking-widest">Live Preview</p>
                      <span className="text-[10px] text-black/30 dark:text-white/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-black/30 dark:bg-white/30 animate-pulse" />
                        Real-time
                      </span>
                    </div>
                    <div className="rounded-[10px] overflow-hidden border border-black/[0.07] dark:border-white/[0.07] shadow-lg">
                      <InvoicePreview data={livePreviewData} />
                    </div>
                    <p className="text-center text-[10px] text-black/25 dark:text-white/25 mt-2">
                      {activeTemplate.name} template • {currencyObj.code}
                    </p>
                  </div>
                )}

                {/* ── Customize Tab ── */}
                {sidebarTab === "customize" && (
                  <div className="p-4 space-y-5 max-h-[700px] overflow-y-auto">
                    {/* Colors */}
                    <div className="space-y-3">
                      <p className={sectionHdr}><Palette className="h-3.5 w-3.5" />Colors</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>Primary Color</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={customization.primaryColor}
                              onChange={e => updateCustomization("primaryColor", e.target.value)}
                              className="w-9 h-9 rounded-[8px] border border-black/[0.08] cursor-pointer bg-transparent p-0.5"
                            />
                            <input
                              className={`${inputCls} flex-1 font-mono text-[11px]`}
                              value={customization.primaryColor}
                              onChange={e => updateCustomization("primaryColor", e.target.value)}
                              placeholder="#1a1a1a"
                            />
                          </div>
                        </div>
                        <div>
                          <label className={labelCls}>Accent Color</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={customization.accentColor}
                              onChange={e => updateCustomization("accentColor", e.target.value)}
                              className="w-9 h-9 rounded-[8px] border border-black/[0.08] cursor-pointer bg-transparent p-0.5"
                            />
                            <input
                              className={`${inputCls} flex-1 font-mono text-[11px]`}
                              value={customization.accentColor}
                              onChange={e => updateCustomization("accentColor", e.target.value)}
                              placeholder="#2563eb"
                            />
                          </div>
                        </div>
                      </div>
                      {/* Color palette presets */}
                      <div>
                        <label className={`${labelCls} mb-2`}>Quick Palettes</label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { name: "Midnight", p: "#1a1a1a", a: "#1a1a1a" },
                            { name: "Royal",    p: "#1d4ed8", a: "#1d4ed8" },
                            { name: "Crimson",  p: "#dc2626", a: "#dc2626" },
                            { name: "Emerald",  p: "#059669", a: "#059669" },
                            { name: "Amber",    p: "#0f0f0f", a: "#f59e0b" },
                            { name: "Violet",   p: "#7c3aed", a: "#7c3aed" },
                            { name: "Rose",     p: "#be185d", a: "#be185d" },
                            { name: "Teal",     p: "#0f766e", a: "#0f766e" },
                          ].map(palette => (
                            <button
                              key={palette.name}
                              onClick={() => { updateCustomization("primaryColor", palette.p); updateCustomization("accentColor", palette.a); }}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-black/[0.07] dark:border-white/[0.08] hover:scale-[1.03] transition-all text-[10.5px] font-medium text-black/70 dark:text-white/70 bg-white dark:bg-white/[0.03]"
                            >
                              <div className="w-3 h-3 rounded-full" style={{ background: palette.p }} />
                              {palette.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-black/[0.05] dark:bg-white/[0.05]" />

                    {/* Branding */}
                    <div className="space-y-3">
                      <p className={sectionHdr}><Tag className="h-3.5 w-3.5" />Branding</p>

                      {/* ── Logo Upload ── */}
                      <div>
                        <label className={labelCls}>Business Logo</label>
                        {customization.logoDataUrl ? (
                          <div className="space-y-2">
                            {/* Logo preview */}
                            <div className="flex items-center gap-3 p-3 rounded-[10px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
                              <div className="h-12 w-24 flex items-center justify-center bg-white dark:bg-black/20 rounded-[8px] border border-black/[0.06] dark:border-white/[0.06] overflow-hidden p-1">
                                <img src={customization.logoDataUrl} alt="Business logo" className="max-h-full max-w-full object-contain" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-semibold text-black/60 dark:text-white/60 mb-1.5">Uploaded</p>
                                <label className="text-[10px] text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70 cursor-pointer underline underline-offset-2 transition-colors">
                                  Change image
                                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                                </label>
                              </div>
                              <button
                                onClick={() => { updateCustomization("logoDataUrl", undefined); updateCustomization("showLogo", false); }}
                                className="p-1.5 rounded-[6px] hover:bg-red-500/10 transition-colors"
                                title="Remove logo"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-400" />
                              </button>
                            </div>
                            {/* Position toggle */}
                            <div>
                              <label className={`${labelCls} mb-1.5`}>Logo Position</label>
                              <div className="grid grid-cols-2 gap-2">
                                {(["left", "right"] as LogoPosition[]).map(pos => (
                                  <button
                                    key={pos}
                                    onClick={() => updateCustomization("logoPosition", pos)}
                                    className={`h-9 rounded-[8px] border text-[11px] font-semibold capitalize transition-all ${
                                      customization.logoPosition === pos
                                        ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white"
                                        : "border-black/[0.08] dark:border-white/[0.10] text-black/50 dark:text-white/50 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                                    }`}
                                  >
                                    {pos === "left" ? "↖ Top Left" : "Top Right ↗"}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center gap-2 h-20 w-full rounded-[10px] border-2 border-dashed border-black/[0.10] dark:border-white/[0.10] cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] hover:border-black/20 dark:hover:border-white/20 transition-all group">
                            <div className="w-7 h-7 rounded-full bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Plus className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
                            </div>
                            <span className="text-[11px] font-medium text-black/40 dark:text-white/40">Upload logo (PNG, JPG, SVG — max 2 MB)</span>
                            <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={handleLogoUpload} className="hidden" />
                          </label>
                        )}
                      </div>

                      <div>
                        <label className={labelCls}>Company Tagline</label>
                        <input className={inputCls} value={customization.companyTagline} onChange={e => updateCustomization("companyTagline", e.target.value)} placeholder="e.g. Premium Digital Services" />
                      </div>
                      <div>
                        <label className={labelCls}>Footer Text</label>
                        <input className={inputCls} value={customization.footerText} onChange={e => updateCustomization("footerText", e.target.value)} placeholder={`Thank you for your business — ${organization?.org_name || "Company"}`} />
                      </div>
                    </div>

                    <div className="h-px bg-black/[0.05] dark:bg-white/[0.05]" />

                    {/* Payment */}
                    <div className="space-y-3">
                      <p className={sectionHdr}><Banknote className="h-3.5 w-3.5" />Payment</p>
                      <div>
                        <label className={labelCls}>Payment Terms</label>
                        <textarea
                          value={customization.paymentTerms}
                          onChange={e => updateCustomization("paymentTerms", e.target.value)}
                          rows={2}
                          className={`${inputCls} h-auto py-2.5 resize-none`}
                          placeholder="Payment is due within 14 days..."
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Bank / Payment Details</label>
                        <textarea
                          value={customization.bankDetails}
                          onChange={e => updateCustomization("bankDetails", e.target.value)}
                          rows={3}
                          className={`${inputCls} h-auto py-2.5 resize-none`}
                          placeholder="Bank: First Bank&#10;Account: 0123456789&#10;Sort Code: 20-01-12"
                        />
                      </div>
                    </div>

                    <div className="h-px bg-black/[0.05] dark:bg-white/[0.05]" />

                    {/* Reset */}
                    <button
                      onClick={() => setCustomization({ ...DEFAULT_CUSTOMIZATION, themeId: customization.themeId, primaryColor: activeTemplate.primaryDefault, accentColor: activeTemplate.accentDefault })}
                      className="w-full flex items-center justify-center gap-2 h-9 rounded-[10px] border border-black/[0.08] dark:border-white/[0.10] text-[12px] font-medium text-black/50 dark:text-white/50 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-all"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Reset to Template Defaults
                    </button>
                  </div>
                )}

                {/* ── History Tab ── */}
                {sidebarTab === "history" && (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className={sectionHdr}><Clock className="h-3.5 w-3.5" />Invoice History</p>
                      <span className="text-[10px] text-black/35 dark:text-white/35 font-medium">{savedInvoices.length} total</span>
                    </div>
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-black/25 dark:text-white/25" />
                      <input className={`${inputCls} pl-9 text-[12px]`} placeholder="Search invoices..." value={historySearch} onChange={e => setHistorySearch(e.target.value)} />
                    </div>
                    {filteredHistory.length === 0 ? (
                      <div className="text-center py-10 text-black/25 dark:text-white/25">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-[12px]">{savedInvoices.length === 0 ? "No invoices yet" : "No results found"}</p>
                        <p className="text-[10px] mt-1">{savedInvoices.length === 0 ? "Generated invoices will appear here" : ""}</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[500px] overflow-y-auto">
                        {filteredHistory.map(inv => {
                          const tpl = TEMPLATES.find(t => t.id === inv.themeId);
                          return (
                            <div key={inv.id} className="flex items-center justify-between p-3 rounded-[10px] bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors group">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-[12px] font-bold text-black dark:text-white truncate">{inv.invoiceNumber}</p>
                                  {tpl && (
                                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: tpl.preview.header }} />
                                  )}
                                </div>
                                <p className="text-[10.5px] text-black/40 dark:text-white/40 truncate">{inv.customerName}</p>
                                <p className="text-[10px] text-black/30 dark:text-white/30">{formatCurrency(inv.total, inv.currency)}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-black/[0.06] dark:bg-white/[0.08] text-black/50 dark:text-white/50 font-semibold">Generated</span>
                                <span className="text-[9px] text-black/25 dark:text-white/25">{new Date(inv.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Invoices", value: savedInvoices.length, icon: FileText, color: "text-black/40 dark:text-white/40" },
                  { label: "Currency", value: currency, icon: Banknote, color: "text-black/40 dark:text-white/40" },
                  { label: "Template", value: activeTemplate.name, icon: Palette, color: "text-black/40 dark:text-white/40" },
                ].map(stat => (
                  <div key={stat.label} className="bg-white dark:bg-[#111113] rounded-[14px] border border-black/[0.06] dark:border-white/[0.07] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                    <stat.icon className={`h-4 w-4 ${stat.color} mb-2`} />
                    <p className="text-[11px] text-black/35 dark:text-white/35 font-medium">{stat.label}</p>
                    <p className="text-[13px] font-bold text-black dark:text-white mt-0.5 tabular-nums">{stat.value}</p>
                  </div>
                ))}
              </div>

            </div>
          )}
        </div>
      </main>

      <FloatingSupport />
    </div>
  );
}

// ─── Template Mini Card ───────────────────────────────────────────────────────
function TemplateMiniCard({ tpl }: { tpl: TemplateOption }) {
  const { preview: p } = tpl;

  if (tpl.id === "forest") {
    return (
      <div style={{ width: "100%", height: "100%", background: "#fff", display: "flex", overflow: "hidden" }}>
        <div style={{ width: 28, background: p.header, flexShrink: 0 }} />
        <div style={{ flex: 1, padding: 6 }}>
          <div style={{ height: 10, background: p.header, borderRadius: 2, marginBottom: 5 }} />
          {[1, 2, 3].map(i => <div key={i} style={{ height: 4, background: "#f0f0f0", borderRadius: 2, marginBottom: 3, width: `${60 + i * 10}%` }} />)}
          <div style={{ height: 6, background: p.header, borderRadius: 2, marginTop: 6, width: "60%" }} />
        </div>
      </div>
    );
  }
  if (tpl.id === "obsidian") {
    return (
      <div style={{ width: "100%", height: "100%", background: "#0f0f0f", padding: 6 }}>
        <div style={{ height: 16, background: "rgba(255,255,255,0.06)", borderRadius: 3, marginBottom: 4, display: "flex", alignItems: "center", padding: "0 4px" }}>
          <div style={{ width: 30, height: 6, background: "rgba(255,255,255,0.2)", borderRadius: 2 }} />
          <div style={{ marginLeft: "auto", width: 18, height: 6, background: p.accent, borderRadius: 2 }} />
        </div>
        {[70, 55, 85].map((w, i) => <div key={i} style={{ height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2, marginBottom: 3, width: `${w}%` }} />)}
        <div style={{ height: 8, background: p.accent, borderRadius: 3, marginTop: 6 }} />
      </div>
    );
  }
  if (tpl.id === "minimal") {
    return (
      <div style={{ width: "100%", height: "100%", background: "#fff", padding: 7 }}>
        <div style={{ fontSize: 10, fontWeight: 900, color: "#f0f0f0", position: "absolute", right: 6, top: 4, fontFamily: "serif" }}>INV</div>
        <div style={{ width: 28, height: 7, background: "#111", borderRadius: 2, marginBottom: 5 }} />
        <div style={{ height: 1.5, background: p.accent, marginBottom: 5 }} />
        {[80, 65, 90].map((w, i) => <div key={i} style={{ height: 4, background: "#f0f0f0", borderRadius: 2, marginBottom: 3, width: `${w}%` }} />)}
        <div style={{ height: 1.5, background: p.accent, marginTop: 6, width: "60%", marginLeft: "auto" }} />
      </div>
    );
  }
  // classic and modern
  return (
    <div style={{ width: "100%", height: "100%", background: "#fff", overflow: "hidden" }}>
      <div style={{ height: tpl.id === "classic" ? 5 : 20, background: p.header, display: "flex", alignItems: "center", padding: tpl.id === "modern" ? "0 6px" : 0, justifyContent: "space-between" }}>
        {tpl.id === "modern" && (
          <>
            <div style={{ width: 20, height: 5, background: "rgba(255,255,255,0.3)", borderRadius: 2 }} />
            <div style={{ width: 14, height: 8, background: "rgba(255,255,255,0.2)", borderRadius: 10 }} />
          </>
        )}
      </div>
      <div style={{ padding: 6 }}>
        {tpl.id === "classic" && <div style={{ height: 8, background: "#111", borderRadius: 2, marginBottom: 4, width: "40%" }} />}
        {[80, 60, 90].map((w, i) => <div key={i} style={{ height: 4, background: "#f0f0f0", borderRadius: 2, marginBottom: 3, width: `${w}%` }} />)}
        <div style={{ height: 7, background: p.header, borderRadius: 3, marginTop: 5, width: "50%", marginLeft: "auto" }} />
      </div>
      {tpl.id === "classic" && <div style={{ height: 4, background: p.header, marginTop: "auto", position: "absolute", bottom: 0, left: 0, right: 0 }} />}
    </div>
  );
}

export default InvoicingTool;
