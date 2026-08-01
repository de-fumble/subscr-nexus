import { useMemo } from "react";
import { PDFInvoiceData } from "./InvoicePDFDocument";

function fmt(amount: number, symbol: string) {
  return `${symbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface InvoicePreviewProps {
  data: PDFInvoiceData;
}

export function InvoicePreview({ data }: InvoicePreviewProps) {
  const { customization: c } = data;
  const primary = c.primaryColor || "#1a1a1a";
  const accent = c.accentColor || "#1a1a1a";

  const preview = useMemo(() => {
    switch (c.themeId) {
      case "modern":   return <ModernPreview data={data} primary={primary} accent={accent} />;
      case "minimal":  return <MinimalPreview data={data} primary={primary} accent={accent} />;
      case "obsidian": return <ObsidianPreview data={data} primary={primary} accent={accent} />;
      case "forest":   return <ForestPreview data={data} primary={primary} accent={accent} />;
      default:         return <ClassicPreview data={data} primary={primary} accent={accent} />;
    }
  }, [data, primary, accent, c.themeId]);

  return (
    <div style={{ width: "100%", aspectRatio: "1 / 1.414", fontSize: "10px", lineHeight: 1.5 }}>
      {preview}
    </div>
  );
}

interface PreviewProps {
  data: PDFInvoiceData;
  primary: string;
  accent: string;
}

function TotalsRows({ data, accent }: { data: PDFInvoiceData; accent: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginTop: 12 }}>
      <div style={{ width: 200 }}>
        <TotalRow label="Subtotal" value={fmt(data.subtotal, data.currencySymbol)} />
        {data.taxAmount > 0 && <TotalRow label="Tax" value={fmt(data.taxAmount, data.currencySymbol)} />}
        {data.discountAmount > 0 && <TotalRow label="Discount" value={`-${fmt(data.discountAmount, data.currencySymbol)}`} />}
        <div style={{ borderTop: `2px solid ${accent}`, marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, fontSize: 11 }}>TOTAL DUE</span>
          <span style={{ fontWeight: 700, fontSize: 11, color: accent }}>{fmt(data.total, data.currencySymbol)}</span>
        </div>
      </div>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, color: "#666", fontSize: 9 }}>
      <span>{label}</span>
      <span style={{ fontWeight: 600, color: "#333" }}>{value}</span>
    </div>
  );
}

function ItemsTable({ data, headerBg, headerColor = "#fff" }: { data: PDFInvoiceData; headerBg: string; headerColor?: string }) {
  const thStyle: React.CSSProperties = {
    background: headerBg, color: headerColor, padding: "8px 10px",
    fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px",
    display: "grid", gridTemplateColumns: "48% 12% 20% 20%", gap: 4, borderRadius: "4px 4px 0 0",
  };
  return (
    <div style={{ borderRadius: 6, overflow: "hidden", border: "1px solid #f0f0f0" }}>
      <div style={thStyle}>
        <span>Description</span>
        <span style={{ textAlign: "center" }}>Qty</span>
        <span style={{ textAlign: "right" }}>Unit Price</span>
        <span style={{ textAlign: "right" }}>Amount</span>
      </div>
      {data.items.filter(i => i.description || i.unitPrice > 0).map((item, i) => (
        <div
          key={i}
          style={{
            display: "grid", gridTemplateColumns: "48% 12% 20% 20%", gap: 4,
            padding: "9px 10px", fontSize: 9, color: "#333",
            background: i % 2 === 1 ? "#fafafa" : "#fff",
            borderBottom: "1px solid #f5f5f5",
          }}
        >
          <span>{item.description || "—"}</span>
          <span style={{ textAlign: "center" }}>{item.quantity}</span>
          <span style={{ textAlign: "right" }}>{fmt(item.unitPrice, data.currencySymbol)}</span>
          <span style={{ textAlign: "right", fontWeight: 600 }}>{fmt(item.quantity * item.unitPrice, data.currencySymbol)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── CLASSIC PREVIEW ────────────────────────────────────────────────────────
function ClassicPreview({ data, primary, accent }: PreviewProps) {
  return (
    <div style={{ background: "#fff", height: "100%", display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ height: 6, background: primary }} />
      <div style={{ padding: "28px 36px", flex: 1, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            {data.customization.logoDataUrl && data.customization.logoPosition === "left" && (
              <img src={data.customization.logoDataUrl} alt="Logo" style={{ maxHeight: 36, maxWidth: 120, objectFit: "contain", marginBottom: 6, display: "block" }} />
            )}
            <div style={{ fontSize: 18, fontWeight: 800, color: "#111", letterSpacing: "-0.3px" }}>{data.orgName || "Your Organization"}</div>
            <div style={{ fontSize: 9, color: "#888", marginTop: 2 }}>{data.orgEmail || "email@org.com"}</div>
            {data.customization.companyTagline && <div style={{ fontSize: 8.5, color: "#aaa", marginTop: 3, fontStyle: "italic" }}>{data.customization.companyTagline}</div>}
          </div>
          <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            {data.customization.logoDataUrl && data.customization.logoPosition === "right" && (
              <img src={data.customization.logoDataUrl} alt="Logo" style={{ maxHeight: 36, maxWidth: 120, objectFit: "contain", marginBottom: 6, display: "block" }} />
            )}
            <div style={{ fontSize: 28, fontWeight: 900, color: "#1a1a1a", letterSpacing: "-1px" }}>INVOICE</div>
            <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>#{data.invoiceNumber}</div>
          </div>
        </div>
        <div style={{ height: 1, background: "#e8e8e8", margin: "0 0 14px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 7, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px", color: "#bbb", marginBottom: 5 }}>Bill To</div>
            <div style={{ fontWeight: 700, color: "#111", fontSize: 10 }}>{data.customerName || "Client Name"}</div>
            <div style={{ color: "#888", fontSize: 9 }}>{data.customerEmail || "client@email.com"}</div>
            {data.customerPhone && <div style={{ color: "#888", fontSize: 9 }}>{data.customerPhone}</div>}
          </div>
          <div style={{ display: "flex", gap: 20, alignItems: "flex-end" }}>
            {[{ l: "Issue Date", v: data.date }, { l: "Due Date", v: data.dueDate }].map(m => (
              <div key={m.l} style={{ textAlign: "right" }}>
                <div style={{ fontSize: 7, color: "#bbb", textTransform: "uppercase", letterSpacing: "1px" }}>{m.l}</div>
                <div style={{ fontWeight: 700, fontSize: 10, marginTop: 2 }}>{m.v || "—"}</div>
              </div>
            ))}
          </div>
        </div>
        <ItemsTable data={data} headerBg={primary} />
        <TotalsRows data={data} accent={accent || primary} />
        {data.notes && (
          <div style={{ marginTop: 14, padding: "10px 12px", background: "#f8f8f8", borderLeft: `3px solid ${primary}`, borderRadius: "0 4px 4px 0" }}>
            <div style={{ fontSize: 7, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#aaa", marginBottom: 4 }}>Notes</div>
            <div style={{ fontSize: 8.5, color: "#666" }}>{data.notes}</div>
          </div>
        )}
      </div>
      <div style={{ padding: "8px 36px", borderTop: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 8, color: "#ccc" }}>{data.customization.footerText || `Thank you — ${data.orgName}`}</span>
        <span style={{ fontSize: 8, color: "#ccc" }}>{data.invoiceNumber}</span>
      </div>
      <div style={{ height: 4, background: primary }} />
    </div>
  );
}

// ─── MODERN PREVIEW ─────────────────────────────────────────────────────────
function ModernPreview({ data, primary, accent }: PreviewProps) {
  return (
    <div style={{ background: "#fff", height: "100%", display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif", overflow: "hidden" }}>
      <div style={{ background: primary, padding: "28px 36px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          {data.customization.logoDataUrl && data.customization.logoPosition === "left" && (
            <img src={data.customization.logoDataUrl} alt="Logo" style={{ maxHeight: 36, maxWidth: 120, objectFit: "contain", marginBottom: 6, borderRadius: 4, display: "block" }} />
          )}
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{data.orgName || "Organization"}</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>{data.orgEmail || ""}</div>
          {data.customization.companyTagline && <div style={{ fontSize: 8, color: "rgba(255,255,255,0.45)", marginTop: 3, fontStyle: "italic" }}>{data.customization.companyTagline}</div>}
        </div>
        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          {data.customization.logoDataUrl && data.customization.logoPosition === "right" && (
            <img src={data.customization.logoDataUrl} alt="Logo" style={{ maxHeight: 36, maxWidth: 120, objectFit: "contain", marginBottom: 6, borderRadius: 4, display: "block" }} />
          )}
          <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "5px 14px", fontSize: 11, fontWeight: 800, color: "#fff", letterSpacing: 3 }}>INVOICE</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", marginTop: 5 }}>#{data.invoiceNumber}</div>
        </div>
      </div>
      <div style={{ padding: "20px 36px", flex: 1, overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, background: "#f8f9fb", border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 7, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px", color: "#aaa", marginBottom: 5 }}>From</div>
            <div style={{ fontWeight: 700, color: "#111", fontSize: 10 }}>{data.orgName || "Organization"}</div>
            <div style={{ color: "#888", fontSize: 9 }}>{data.orgEmail}</div>
          </div>
          <div style={{ flex: 1, background: `${primary}0d`, border: `1px solid ${primary}30`, borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 7, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px", color: primary, marginBottom: 5 }}>Bill To</div>
            <div style={{ fontWeight: 700, color: "#111", fontSize: 10 }}>{data.customerName || "Client Name"}</div>
            <div style={{ color: "#888", fontSize: 9 }}>{data.customerEmail || "client@email.com"}</div>
            {data.customerPhone && <div style={{ color: "#888", fontSize: 9 }}>{data.customerPhone}</div>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {[{ l: "Invoice No.", v: `#${data.invoiceNumber}` }, { l: "Issued", v: data.date || "—" }, { l: "Due", v: data.dueDate || "—" }].map(m => (
            <div key={m.l} style={{ background: "#f5f5f5", borderRadius: 6, padding: "7px 10px" }}>
              <div style={{ fontSize: 7, color: "#aaa", textTransform: "uppercase", letterSpacing: "1px" }}>{m.l}</div>
              <div style={{ fontWeight: 700, fontSize: 9.5, marginTop: 1 }}>{m.v}</div>
            </div>
          ))}
        </div>
        <ItemsTable data={data} headerBg={primary} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginTop: 12 }}>
          <div style={{ width: 200 }}>
            <TotalRow label="Subtotal" value={fmt(data.subtotal, data.currencySymbol)} />
            {data.taxAmount > 0 && <TotalRow label="Tax" value={fmt(data.taxAmount, data.currencySymbol)} />}
            {data.discountAmount > 0 && <TotalRow label="Discount" value={`-${fmt(data.discountAmount, data.currencySymbol)}`} />}
            <div style={{ background: primary, borderRadius: 6, padding: "8px 12px", display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 11, color: "#fff" }}>TOTAL DUE</span>
              <span style={{ fontWeight: 700, fontSize: 11, color: "#fff" }}>{fmt(data.total, data.currencySymbol)}</span>
            </div>
          </div>
        </div>
        {data.notes && (
          <div style={{ marginTop: 14, padding: "10px 12px", background: "#f8f9fb", border: "1px solid #eee", borderRadius: 8 }}>
            <div style={{ fontSize: 7, fontWeight: 700, textTransform: "uppercase", color: "#aaa", marginBottom: 4 }}>Notes</div>
            <div style={{ fontSize: 8.5, color: "#666" }}>{data.notes}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MINIMAL PREVIEW ────────────────────────────────────────────────────────
function MinimalPreview({ data, primary, accent }: PreviewProps) {
  return (
    <div style={{ background: "#fff", height: "100%", display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif", padding: "36px 40px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 24, right: 36, fontSize: 60, fontWeight: 900, color: "#f0f0f0", letterSpacing: -2 }}>INVOICE</div>
      {data.customization.logoDataUrl && data.customization.logoPosition === "left" && (
        <img src={data.customization.logoDataUrl} alt="Logo" style={{ maxHeight: 36, maxWidth: 120, objectFit: "contain", marginBottom: 6, display: "block" }} />
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#111" }}>{data.orgName || "Your Organization"}</div>
          <div style={{ fontSize: 9, color: "#bbb", marginTop: 2 }}>{data.orgEmail}</div>
          {data.customization.companyTagline && <div style={{ fontSize: 8.5, color: "#ccc", fontStyle: "italic", marginTop: 2 }}>{data.customization.companyTagline}</div>}
        </div>
        {data.customization.logoDataUrl && data.customization.logoPosition === "right" && (
          <img src={data.customization.logoDataUrl} alt="Logo" style={{ maxHeight: 36, maxWidth: 120, objectFit: "contain", zIndex: 1, display: "block" }} />
        )}
      </div>
      <div style={{ height: 2, background: accent || primary, margin: "16px 0" }} />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 24, marginBottom: 16 }}>
        {[{ l: "Invoice", v: `#${data.invoiceNumber}` }, { l: "Issued", v: data.date || "—" }, { l: "Due", v: data.dueDate || "—" }].map(m => (
          <div key={m.l} style={{ textAlign: "right" }}>
            <div style={{ fontSize: 7, color: "#ccc", textTransform: "uppercase", letterSpacing: "1.5px" }}>{m.l}</div>
            <div style={{ fontWeight: 700, fontSize: 10, marginTop: 2 }}>{m.v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 7, color: "#ccc", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 6 }}>From</div>
          <div style={{ fontWeight: 700, fontSize: 10 }}>{data.orgName}</div>
          <div style={{ color: "#888", fontSize: 9 }}>{data.orgEmail}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 7, color: "#ccc", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 6 }}>Bill To</div>
          <div style={{ fontWeight: 700, fontSize: 10 }}>{data.customerName || "Client Name"}</div>
          <div style={{ color: "#888", fontSize: 9 }}>{data.customerEmail || "client@email.com"}</div>
          {data.customerPhone && <div style={{ color: "#888", fontSize: 9 }}>{data.customerPhone}</div>}
        </div>
      </div>
      <div style={{ borderTop: `1px solid #111`, borderBottom: `1px solid #f5f5f5` }}>
        <div style={{ display: "grid", gridTemplateColumns: "50% 12% 19% 19%", padding: "7px 0", fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px" }}>
          <span>Description</span><span style={{ textAlign: "center" }}>Qty</span><span style={{ textAlign: "right" }}>Rate</span><span style={{ textAlign: "right" }}>Total</span>
        </div>
        {data.items.filter(i => i.description || i.unitPrice > 0).map((item, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "50% 12% 19% 19%", padding: "9px 0", fontSize: 9, borderTop: "1px solid #f5f5f5", color: "#333" }}>
            <span>{item.description || "—"}</span>
            <span style={{ textAlign: "center" }}>{item.quantity}</span>
            <span style={{ textAlign: "right" }}>{fmt(item.unitPrice, data.currencySymbol)}</span>
            <span style={{ textAlign: "right", fontWeight: 600 }}>{fmt(item.quantity * item.unitPrice, data.currencySymbol)}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginTop: 12 }}>
        <div style={{ width: 200 }}>
          <TotalRow label="Subtotal" value={fmt(data.subtotal, data.currencySymbol)} />
          {data.taxAmount > 0 && <TotalRow label="Tax" value={fmt(data.taxAmount, data.currencySymbol)} />}
          <div style={{ height: 1, background: accent || primary, margin: "6px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700, fontSize: 11 }}>Total Due</span>
            <span style={{ fontWeight: 700, fontSize: 11, color: accent || primary }}>{fmt(data.total, data.currencySymbol)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── OBSIDIAN PREVIEW ───────────────────────────────────────────────────────
function ObsidianPreview({ data, primary: _primary, accent }: PreviewProps) {
  const bg = "#0f0f0f";
  return (
    <div style={{ background: bg, height: "100%", display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif", color: "#fff", overflow: "hidden" }}>
      <div style={{ padding: "28px 36px 22px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          {data.customization.logoDataUrl && data.customization.logoPosition === "left" && (
            <img src={data.customization.logoDataUrl} alt="Logo" style={{ maxHeight: 36, maxWidth: 120, objectFit: "contain", marginBottom: 6, borderRadius: 4, display: "block" }} />
          )}
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{data.orgName || "Organization"}</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{data.orgEmail}</div>
          {data.customization.companyTagline && <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", fontStyle: "italic", marginTop: 3 }}>{data.customization.companyTagline}</div>}
        </div>
        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          {data.customization.logoDataUrl && data.customization.logoPosition === "right" && (
            <img src={data.customization.logoDataUrl} alt="Logo" style={{ maxHeight: 36, maxWidth: 120, objectFit: "contain", marginBottom: 6, borderRadius: 4, display: "block" }} />
          )}
          <div style={{ display: "inline-block", border: `1px solid ${accent}50`, borderRadius: 4, padding: "5px 12px", fontSize: 10, fontWeight: 800, color: accent, letterSpacing: 3 }}>INVOICE</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 5 }}>#{data.invoiceNumber}</div>
        </div>
      </div>
      <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "0 36px 20px" }} />
      <div style={{ padding: "0 36px", flex: 1, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 7, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 6 }}>From</div>
            <div style={{ fontWeight: 700, fontSize: 10 }}>{data.orgName}</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 9 }}>{data.orgEmail}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 7, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 6 }}>Bill To</div>
            <div style={{ fontWeight: 700, fontSize: 10 }}>{data.customerName || "Client Name"}</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 9 }}>{data.customerEmail}</div>
            {data.customerPhone && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 9 }}>{data.customerPhone}</div>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {[{ l: "Invoice", v: `#${data.invoiceNumber}` }, { l: "Issued", v: data.date || "—" }, { l: "Due", v: data.dueDate || "—" }].map(m => (
            <div key={m.l} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "7px 10px" }}>
              <div style={{ fontSize: 7, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px" }}>{m.l}</div>
              <div style={{ fontWeight: 700, fontSize: 9.5, marginTop: 1, color: "#fff" }}>{m.v}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 6, padding: "7px 10px", display: "grid", gridTemplateColumns: "48% 12% 20% 20%", marginBottom: 2, fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "rgba(255,255,255,0.4)" }}>
          <span>Description</span><span style={{ textAlign: "center" }}>Qty</span><span style={{ textAlign: "right" }}>Unit Price</span><span style={{ textAlign: "right" }}>Amount</span>
        </div>
        {data.items.filter(i => i.description || i.unitPrice > 0).map((item, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "48% 12% 20% 20%", padding: "9px 10px", fontSize: 9, color: "rgba(255,255,255,0.75)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <span>{item.description || "—"}</span>
            <span style={{ textAlign: "center" }}>{item.quantity}</span>
            <span style={{ textAlign: "right" }}>{fmt(item.unitPrice, data.currencySymbol)}</span>
            <span style={{ textAlign: "right", fontWeight: 600 }}>{fmt(item.quantity * item.unitPrice, data.currencySymbol)}</span>
          </div>
        ))}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginTop: 12 }}>
          <div style={{ width: 210 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, color: "rgba(255,255,255,0.3)", fontSize: 9 }}>
              <span>Subtotal</span><span style={{ fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>{fmt(data.subtotal, data.currencySymbol)}</span>
            </div>
            {data.taxAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, color: "rgba(255,255,255,0.3)", fontSize: 9 }}>
                <span>Tax</span><span style={{ fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>{fmt(data.taxAmount, data.currencySymbol)}</span>
              </div>
            )}
            <div style={{ background: accent, borderRadius: 6, padding: "8px 12px", display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 11, color: "#0f0f0f" }}>TOTAL DUE</span>
              <span style={{ fontWeight: 700, fontSize: 11, color: "#0f0f0f" }}>{fmt(data.total, data.currencySymbol)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FOREST PREVIEW ─────────────────────────────────────────────────────────
function ForestPreview({ data, primary, accent: _accent }: PreviewProps) {
  return (
    <div style={{ background: "#fff", height: "100%", display: "flex", fontFamily: "system-ui, sans-serif", overflow: "hidden" }}>
      {/* Sidebar */}
      <div style={{ width: 150, background: primary, padding: "24px 16px", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        {data.customization.logoDataUrl && data.customization.logoPosition === "left" && (
          <img src={data.customization.logoDataUrl} alt="Logo" style={{ maxHeight: 36, maxWidth: 100, objectFit: "contain", marginBottom: 8, borderRadius: 4, display: "block" }} />
        )}
        <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 2 }}>{data.orgName || "Organization"}</div>
        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>{data.orgEmail}</div>
        {data.customization.companyTagline && <div style={{ fontSize: 7.5, color: "rgba(255,255,255,0.35)", fontStyle: "italic", marginTop: 5 }}>{data.customization.companyTagline}</div>}
        <div style={{ height: 1, background: "rgba(255,255,255,0.12)", margin: "14px 0" }} />
        {[{ l: "Invoice #", v: data.invoiceNumber }, { l: "Issue Date", v: data.date || "—" }, { l: "Due Date", v: data.dueDate || "—" }].map(m => (
          <div key={m.l} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 7, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1.5px" }}>{m.l}</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#fff", marginTop: 2 }}>{m.v}</div>
          </div>
        ))}
        <div style={{ height: 1, background: "rgba(255,255,255,0.12)", margin: "10px 0" }} />
        <div style={{ fontSize: 7, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 6 }}>Bill To</div>
        <div style={{ fontSize: 9, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{data.customerName || "Client Name"}</div>
        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{data.customerEmail || ""}</div>
        {data.customerPhone && <div style={{ fontSize: 8, color: "rgba(255,255,255,0.45)" }}>{data.customerPhone}</div>}
      </div>
      {/* Main */}
      <div style={{ flex: 1, padding: "28px 24px", overflow: "hidden" }}>
        <div style={{ fontSize: 30, fontWeight: 900, color: primary, letterSpacing: -1, marginBottom: 2 }}>INVOICE</div>
        <div style={{ fontSize: 9, color: "#aaa", marginBottom: 18 }}>#{data.invoiceNumber}</div>
        <div style={{ background: primary, padding: "7px 10px", display: "grid", gridTemplateColumns: "48% 12% 20% 20%", borderRadius: "5px 5px 0 0", fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "#fff", marginBottom: 1 }}>
          <span>Description</span><span style={{ textAlign: "center" }}>Qty</span><span style={{ textAlign: "right" }}>Unit Price</span><span style={{ textAlign: "right" }}>Amount</span>
        </div>
        {data.items.filter(i => i.description || i.unitPrice > 0).map((item, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "48% 12% 20% 20%", padding: "9px 10px", fontSize: 9, color: "#333", background: i % 2 === 1 ? "#fafafa" : "#fff", borderBottom: "1px solid #f0f0f0" }}>
            <span>{item.description || "—"}</span>
            <span style={{ textAlign: "center" }}>{item.quantity}</span>
            <span style={{ textAlign: "right" }}>{fmt(item.unitPrice, data.currencySymbol)}</span>
            <span style={{ textAlign: "right", fontWeight: 600 }}>{fmt(item.quantity * item.unitPrice, data.currencySymbol)}</span>
          </div>
        ))}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginTop: 12 }}>
          <div style={{ width: 200 }}>
            <TotalRow label="Subtotal" value={fmt(data.subtotal, data.currencySymbol)} />
            {data.taxAmount > 0 && <TotalRow label="Tax" value={fmt(data.taxAmount, data.currencySymbol)} />}
            {data.discountAmount > 0 && <TotalRow label="Discount" value={`-${fmt(data.discountAmount, data.currencySymbol)}`} />}
            <div style={{ background: primary, borderRadius: 6, padding: "8px 12px", display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 11, color: "#fff" }}>TOTAL DUE</span>
              <span style={{ fontWeight: 700, fontSize: 11, color: "#fff" }}>{fmt(data.total, data.currencySymbol)}</span>
            </div>
          </div>
        </div>
        {data.notes && (
          <div style={{ marginTop: 12, padding: "10px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6 }}>
            <div style={{ fontSize: 7, fontWeight: 700, textTransform: "uppercase", color: primary, marginBottom: 4 }}>Notes</div>
            <div style={{ fontSize: 8.5, color: "#555" }}>{data.notes}</div>
          </div>
        )}
      </div>
    </div>
  );
}
