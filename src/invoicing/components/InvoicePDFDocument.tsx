import { Document, Page, Text, View, StyleSheet, Font, Image } from "@react-pdf/renderer";
import { TemplateId, InvoiceCustomization } from "@/invoicing/types";

export interface PDFInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface PDFInvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  orgName: string;
  orgEmail: string;
  orgPhone?: string;
  orgAddress?: string;
  items: PDFInvoiceItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  currency: string;
  currencySymbol: string;
  notes: string;
  customization: InvoiceCustomization;
}

const fmt = (amount: number, symbol: string) =>
  `${symbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── CLASSIC TEMPLATE ───────────────────────────────────────────────────────
const classicStyles = StyleSheet.create({
  page: { padding: 0, fontFamily: "Helvetica", fontSize: 10, backgroundColor: "#ffffff" },
  topBar: { height: 8, backgroundColor: "#1a1a1a" },
  body: { paddingHorizontal: 48, paddingTop: 36, paddingBottom: 60 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 36 },
  orgName: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#111111", letterSpacing: 0.5 },
  orgSub: { fontSize: 9, color: "#888888", marginTop: 3 },
  invoiceTitle: { fontSize: 32, fontFamily: "Helvetica-Bold", color: "#1a1a1a", textAlign: "right" },
  invoiceNum: { fontSize: 11, color: "#555555", textAlign: "right", marginTop: 4 },
  divider: { height: 1, backgroundColor: "#e0e0e0", marginBottom: 24 },
  parties: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  partyBlock: { width: "45%" },
  partyLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#999999", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 },
  partyName: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#111111", marginBottom: 2 },
  partySub: { fontSize: 9, color: "#666666", marginBottom: 1 },
  metaGrid: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 28 },
  metaItem: { marginLeft: 24, alignItems: "flex-end" },
  metaLabel: { fontSize: 8, color: "#999999", textTransform: "uppercase", letterSpacing: 1 },
  metaValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#111111", marginTop: 2 },
  tableHeader: { flexDirection: "row", backgroundColor: "#1a1a1a", paddingVertical: 9, paddingHorizontal: 12, borderRadius: 2 },
  thText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#ffffff", textTransform: "uppercase", letterSpacing: 1 },
  tableRow: { flexDirection: "row", paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  tableRowAlt: { backgroundColor: "#fafafa" },
  td: { fontSize: 10, color: "#333333" },
  colDesc: { width: "48%" },
  colQty: { width: "14%", textAlign: "center" },
  colPrice: { width: "19%", textAlign: "right" },
  colAmount: { width: "19%", textAlign: "right" },
  totalsSection: { marginTop: 16, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", width: 220, paddingVertical: 4 },
  totalLabel: { fontSize: 9, color: "#888888" },
  totalValue: { fontSize: 9, color: "#333333", fontFamily: "Helvetica-Bold" },
  grandTotalRow: { flexDirection: "row", justifyContent: "space-between", width: 220, paddingTop: 8, marginTop: 4, borderTopWidth: 2, borderTopColor: "#1a1a1a" },
  grandLabel: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#111111" },
  grandValue: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#111111" },
  notesBox: { marginTop: 32, padding: 14, backgroundColor: "#f8f8f8", borderLeftWidth: 3, borderLeftColor: "#1a1a1a" },
  notesLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#999999", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 },
  notesText: { fontSize: 9, color: "#555555", lineHeight: 1.6 },
  footer: { position: "absolute", bottom: 24, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerText: { fontSize: 8, color: "#bbbbbb" },
  bottomBar: { height: 5, backgroundColor: "#1a1a1a" },
});

function ClassicPDF({ data }: { data: PDFInvoiceData }) {
  const primary = data.customization.primaryColor || "#1a1a1a";
  return (
    <Document>
      <Page size="A4" style={classicStyles.page}>
        <View style={[classicStyles.topBar, { backgroundColor: primary }]} />
        <View style={classicStyles.body}>
          <View style={classicStyles.header}>
            <View>
              {data.customization.logoDataUrl && data.customization.logoPosition === "left" && (
                <Image src={data.customization.logoDataUrl} style={{ width: 72, height: 36, objectFit: "contain", marginBottom: 6 }} />
              )}
              <Text style={classicStyles.orgName}>{data.orgName}</Text>
              <Text style={classicStyles.orgSub}>{data.orgEmail}</Text>
              {data.orgPhone && <Text style={classicStyles.orgSub}>{data.orgPhone}</Text>}
              {data.customization.companyTagline ? <Text style={[classicStyles.orgSub, { marginTop: 4, fontStyle: "italic" }]}>{data.customization.companyTagline}</Text> : null}
            </View>
            <View style={{ alignItems: "flex-end" }}>
              {data.customization.logoDataUrl && data.customization.logoPosition === "right" && (
                <Image src={data.customization.logoDataUrl} style={{ width: 72, height: 36, objectFit: "contain", marginBottom: 6 }} />
              )}
              <Text style={classicStyles.invoiceTitle}>INVOICE</Text>
              <Text style={classicStyles.invoiceNum}>#{data.invoiceNumber}</Text>
            </View>
          </View>

          <View style={classicStyles.divider} />

          <View style={classicStyles.metaGrid}>
            <View style={classicStyles.metaItem}>
              <Text style={classicStyles.metaLabel}>Issue Date</Text>
              <Text style={classicStyles.metaValue}>{data.date}</Text>
            </View>
            <View style={classicStyles.metaItem}>
              <Text style={classicStyles.metaLabel}>Due Date</Text>
              <Text style={classicStyles.metaValue}>{data.dueDate}</Text>
            </View>
          </View>

          <View style={classicStyles.parties}>
            <View style={classicStyles.partyBlock}>
              <Text style={classicStyles.partyLabel}>From</Text>
              <Text style={classicStyles.partyName}>{data.orgName}</Text>
              <Text style={classicStyles.partySub}>{data.orgEmail}</Text>
              {data.orgAddress && <Text style={classicStyles.partySub}>{data.orgAddress}</Text>}
            </View>
            <View style={classicStyles.partyBlock}>
              <Text style={classicStyles.partyLabel}>Bill To</Text>
              <Text style={classicStyles.partyName}>{data.customerName}</Text>
              <Text style={classicStyles.partySub}>{data.customerEmail}</Text>
              {data.customerPhone && <Text style={classicStyles.partySub}>{data.customerPhone}</Text>}
              {data.customerAddress && <Text style={classicStyles.partySub}>{data.customerAddress}</Text>}
            </View>
          </View>

          <View style={classicStyles.tableHeader}>
            <Text style={[classicStyles.thText, classicStyles.colDesc]}>Description</Text>
            <Text style={[classicStyles.thText, classicStyles.colQty, { textAlign: "center" }]}>Qty</Text>
            <Text style={[classicStyles.thText, classicStyles.colPrice, { textAlign: "right" }]}>Unit Price</Text>
            <Text style={[classicStyles.thText, classicStyles.colAmount, { textAlign: "right" }]}>Amount</Text>
          </View>
          {data.items.map((item, i) => (
            <View key={i} style={[classicStyles.tableRow, i % 2 === 1 ? classicStyles.tableRowAlt : {}]}>
              <Text style={[classicStyles.td, classicStyles.colDesc]}>{item.description}</Text>
              <Text style={[classicStyles.td, classicStyles.colQty, { textAlign: "center" }]}>{item.quantity}</Text>
              <Text style={[classicStyles.td, classicStyles.colPrice, { textAlign: "right" }]}>{fmt(item.unitPrice, data.currencySymbol)}</Text>
              <Text style={[classicStyles.td, classicStyles.colAmount, { textAlign: "right" }]}>{fmt(item.quantity * item.unitPrice, data.currencySymbol)}</Text>
            </View>
          ))}

          <View style={classicStyles.totalsSection}>
            <View style={classicStyles.totalRow}>
              <Text style={classicStyles.totalLabel}>Subtotal</Text>
              <Text style={classicStyles.totalValue}>{fmt(data.subtotal, data.currencySymbol)}</Text>
            </View>
            {data.taxAmount > 0 && (
              <View style={classicStyles.totalRow}>
                <Text style={classicStyles.totalLabel}>Tax</Text>
                <Text style={classicStyles.totalValue}>{fmt(data.taxAmount, data.currencySymbol)}</Text>
              </View>
            )}
            {data.discountAmount > 0 && (
              <View style={classicStyles.totalRow}>
                <Text style={classicStyles.totalLabel}>Discount</Text>
                <Text style={classicStyles.totalValue}>-{fmt(data.discountAmount, data.currencySymbol)}</Text>
              </View>
            )}
            <View style={classicStyles.grandTotalRow}>
              <Text style={classicStyles.grandLabel}>TOTAL DUE</Text>
              <Text style={[classicStyles.grandValue, { color: primary }]}>{fmt(data.total, data.currencySymbol)}</Text>
            </View>
          </View>

          {data.notes ? (
            <View style={[classicStyles.notesBox, { borderLeftColor: primary }]}>
              <Text style={classicStyles.notesLabel}>Notes & Payment Instructions</Text>
              <Text style={classicStyles.notesText}>{data.notes}</Text>
            </View>
          ) : null}
          {data.customization.bankDetails ? (
            <View style={[classicStyles.notesBox, { borderLeftColor: primary, marginTop: 8 }]}>
              <Text style={classicStyles.notesLabel}>Bank Details</Text>
              <Text style={classicStyles.notesText}>{data.customization.bankDetails}</Text>
            </View>
          ) : null}

          <View style={classicStyles.footer}>
            <Text style={classicStyles.footerText}>{data.customization.footerText || `Thank you for your business — ${data.orgName}`}</Text>
            <Text style={classicStyles.footerText}>{data.invoiceNumber}</Text>
          </View>
        </View>
        <View style={[classicStyles.bottomBar, { backgroundColor: primary }]} />
      </Page>
    </Document>
  );
}

// ─── MODERN TEMPLATE ────────────────────────────────────────────────────────
const modernStyles = StyleSheet.create({
  page: { padding: 0, fontFamily: "Helvetica", fontSize: 10, backgroundColor: "#ffffff" },
  header: { paddingHorizontal: 48, paddingTop: 40, paddingBottom: 32, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  orgName: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  orgSub: { fontSize: 9, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  tagline: { fontSize: 8, color: "rgba(255,255,255,0.6)", marginTop: 4, fontStyle: "italic" },
  invoiceBadge: { backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  invoiceTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#ffffff", letterSpacing: 3 },
  invoiceNum: { fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 4, textAlign: "right" },
  body: { paddingHorizontal: 48, paddingTop: 32, paddingBottom: 80 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 32 },
  infoCard: { width: "47%", padding: 16, borderRadius: 8, backgroundColor: "#f8f9fb", borderWidth: 1, borderColor: "#ebebeb" },
  infoCardAccent: { width: "47%", padding: 16, borderRadius: 8 },
  infoLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1.5, color: "#aaaaaa", marginBottom: 6 },
  infoName: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#111111", marginBottom: 2 },
  infoSub: { fontSize: 9, color: "#666666", marginBottom: 1 },
  metaRow: { flexDirection: "row", gap: 20, marginBottom: 24 },
  metaChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6, backgroundColor: "#f4f4f4", flexDirection: "row", alignItems: "center" },
  metaChipLabel: { fontSize: 7, color: "#aaaaaa", textTransform: "uppercase", letterSpacing: 1 },
  metaChipValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#222222", marginTop: 1 },
  th: { flexDirection: "row", paddingVertical: 9, paddingHorizontal: 14, borderRadius: 6, marginBottom: 4 },
  thText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#ffffff", textTransform: "uppercase", letterSpacing: 0.8 },
  row: { flexDirection: "row", paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: "#f3f3f3" },
  td: { fontSize: 10, color: "#333333" },
  colDesc: { width: "48%" },
  colQty: { width: "14%", textAlign: "center" },
  colPrice: { width: "19%", textAlign: "right" },
  colAmt: { width: "19%", textAlign: "right" },
  totals: { marginTop: 20, alignItems: "flex-end" },
  tRow: { flexDirection: "row", justifyContent: "space-between", width: 230, paddingVertical: 4 },
  tLabel: { fontSize: 9, color: "#888888" },
  tValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#333333" },
  grandBox: { width: 230, padding: 12, borderRadius: 8, marginTop: 8, flexDirection: "row", justifyContent: "space-between" },
  grandLabel: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  grandValue: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  notesBox: { marginTop: 28, padding: 14, borderRadius: 8, backgroundColor: "#f8f9fb", borderWidth: 1, borderColor: "#ebebeb" },
  notesLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#aaaaaa", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 },
  notesText: { fontSize: 9, color: "#555555", lineHeight: 1.6 },
  footer: { position: "absolute", bottom: 28, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 8, color: "#cccccc" },
});

function ModernPDF({ data }: { data: PDFInvoiceData }) {
  const primary = data.customization.primaryColor || "#2563eb";
  return (
    <Document>
      <Page size="A4" style={modernStyles.page}>
        <View style={[modernStyles.header, { backgroundColor: primary }]}>
          <View>
            {data.customization.logoDataUrl && data.customization.logoPosition === "left" && (
              <Image src={data.customization.logoDataUrl} style={{ width: 72, height: 36, objectFit: "contain", marginBottom: 8, borderRadius: 4 }} />
            )}
            <Text style={modernStyles.orgName}>{data.orgName}</Text>
            <Text style={modernStyles.orgSub}>{data.orgEmail}</Text>
            {data.customization.companyTagline ? <Text style={modernStyles.tagline}>{data.customization.companyTagline}</Text> : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            {data.customization.logoDataUrl && data.customization.logoPosition === "right" && (
              <Image src={data.customization.logoDataUrl} style={{ width: 72, height: 36, objectFit: "contain", marginBottom: 8, borderRadius: 4 }} />
            )}
            <View style={modernStyles.invoiceBadge}>
              <Text style={modernStyles.invoiceTitle}>INVOICE</Text>
            </View>
            <Text style={modernStyles.invoiceNum}>#{data.invoiceNumber}</Text>
          </View>
        </View>

        <View style={modernStyles.body}>
          <View style={modernStyles.infoRow}>
            <View style={modernStyles.infoCard}>
              <Text style={modernStyles.infoLabel}>From</Text>
              <Text style={modernStyles.infoName}>{data.orgName}</Text>
              <Text style={modernStyles.infoSub}>{data.orgEmail}</Text>
              {data.orgAddress && <Text style={modernStyles.infoSub}>{data.orgAddress}</Text>}
            </View>
            <View style={[modernStyles.infoCardAccent, { backgroundColor: `${primary}12`, borderWidth: 1, borderColor: `${primary}30` }]}>
              <Text style={[modernStyles.infoLabel, { color: primary }]}>Bill To</Text>
              <Text style={modernStyles.infoName}>{data.customerName}</Text>
              <Text style={modernStyles.infoSub}>{data.customerEmail}</Text>
              {data.customerPhone && <Text style={modernStyles.infoSub}>{data.customerPhone}</Text>}
              {data.customerAddress && <Text style={modernStyles.infoSub}>{data.customerAddress}</Text>}
            </View>
          </View>

          <View style={modernStyles.metaRow}>
            {[{ label: "Invoice No.", value: `#${data.invoiceNumber}` }, { label: "Issue Date", value: data.date }, { label: "Due Date", value: data.dueDate }].map((m, i) => (
              <View key={i} style={modernStyles.metaChip}>
                <View>
                  <Text style={modernStyles.metaChipLabel}>{m.label}</Text>
                  <Text style={modernStyles.metaChipValue}>{m.value}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={[modernStyles.th, { backgroundColor: primary }]}>
            <Text style={[modernStyles.thText, modernStyles.colDesc]}>Description</Text>
            <Text style={[modernStyles.thText, modernStyles.colQty, { textAlign: "center" }]}>Qty</Text>
            <Text style={[modernStyles.thText, modernStyles.colPrice, { textAlign: "right" }]}>Unit Price</Text>
            <Text style={[modernStyles.thText, modernStyles.colAmt, { textAlign: "right" }]}>Amount</Text>
          </View>
          {data.items.map((item, i) => (
            <View key={i} style={[modernStyles.row, i % 2 === 1 ? { backgroundColor: "#fafafa" } : {}]}>
              <Text style={[modernStyles.td, modernStyles.colDesc]}>{item.description}</Text>
              <Text style={[modernStyles.td, modernStyles.colQty, { textAlign: "center" }]}>{item.quantity}</Text>
              <Text style={[modernStyles.td, modernStyles.colPrice, { textAlign: "right" }]}>{fmt(item.unitPrice, data.currencySymbol)}</Text>
              <Text style={[modernStyles.td, modernStyles.colAmt, { textAlign: "right" }]}>{fmt(item.quantity * item.unitPrice, data.currencySymbol)}</Text>
            </View>
          ))}

          <View style={modernStyles.totals}>
            <View style={modernStyles.tRow}>
              <Text style={modernStyles.tLabel}>Subtotal</Text>
              <Text style={modernStyles.tValue}>{fmt(data.subtotal, data.currencySymbol)}</Text>
            </View>
            {data.taxAmount > 0 && (
              <View style={modernStyles.tRow}>
                <Text style={modernStyles.tLabel}>Tax</Text>
                <Text style={modernStyles.tValue}>{fmt(data.taxAmount, data.currencySymbol)}</Text>
              </View>
            )}
            {data.discountAmount > 0 && (
              <View style={modernStyles.tRow}>
                <Text style={modernStyles.tLabel}>Discount</Text>
                <Text style={modernStyles.tValue}>-{fmt(data.discountAmount, data.currencySymbol)}</Text>
              </View>
            )}
            <View style={[modernStyles.grandBox, { backgroundColor: primary }]}>
              <Text style={modernStyles.grandLabel}>TOTAL DUE</Text>
              <Text style={modernStyles.grandValue}>{fmt(data.total, data.currencySymbol)}</Text>
            </View>
          </View>

          {(data.notes || data.customization.bankDetails) && (
            <View style={modernStyles.notesBox}>
              {data.notes ? (
                <>
                  <Text style={modernStyles.notesLabel}>Notes</Text>
                  <Text style={modernStyles.notesText}>{data.notes}</Text>
                </>
              ) : null}
              {data.customization.bankDetails ? (
                <>
                  <Text style={[modernStyles.notesLabel, { marginTop: data.notes ? 8 : 0 }]}>Bank Details</Text>
                  <Text style={modernStyles.notesText}>{data.customization.bankDetails}</Text>
                </>
              ) : null}
            </View>
          )}
        </View>
        <View style={modernStyles.footer}>
          <Text style={modernStyles.footerText}>{data.customization.footerText || `Thank you — ${data.orgName}`}</Text>
          <Text style={modernStyles.footerText}>Page 1</Text>
        </View>
      </Page>
    </Document>
  );
}

// ─── MINIMAL TEMPLATE ───────────────────────────────────────────────────────
const minimalStyles = StyleSheet.create({
  page: { padding: 56, fontFamily: "Helvetica", fontSize: 10, backgroundColor: "#ffffff" },
  invoiceWord: { fontSize: 48, color: "#ebebeb", fontFamily: "Helvetica-Bold", position: "absolute", top: 40, right: 48 },
  orgName: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#111111" },
  orgSub: { fontSize: 9, color: "#aaaaaa", marginTop: 2 },
  topDivider: { height: 2, marginVertical: 28 },
  parties: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  partyLabel: { fontSize: 7, textTransform: "uppercase", letterSpacing: 2, color: "#cccccc", marginBottom: 8 },
  partyName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#111111", marginBottom: 2 },
  partySub: { fontSize: 9, color: "#888888", marginBottom: 1 },
  metaLine: { flexDirection: "row", justifyContent: "flex-end", gap: 32, marginBottom: 32 },
  metaLabel: { fontSize: 7, color: "#aaaaaa", textTransform: "uppercase", letterSpacing: 1.5 },
  metaValue: { fontSize: 10, color: "#111111", fontFamily: "Helvetica-Bold", marginTop: 2 },
  thRow: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#111111" },
  thText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#111111", textTransform: "uppercase", letterSpacing: 1 },
  row: { flexDirection: "row", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f2f2f2" },
  td: { fontSize: 10, color: "#333333" },
  colDesc: { width: "50%" },
  colQty: { width: "12%", textAlign: "center" },
  colPrice: { width: "19%", textAlign: "right" },
  colAmt: { width: "19%", textAlign: "right" },
  totals: { alignItems: "flex-end", marginTop: 24 },
  tRow: { flexDirection: "row", justifyContent: "space-between", width: 210, paddingVertical: 5 },
  tLabel: { fontSize: 9, color: "#aaaaaa" },
  tValue: { fontSize: 9, color: "#333333" },
  grandLine: { height: 1, width: 210, marginVertical: 4 },
  grandRow: { flexDirection: "row", justifyContent: "space-between", width: 210, paddingTop: 8 },
  grandLabel: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#111111" },
  grandValue: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  notesSection: { marginTop: 40 },
  notesDivider: { height: 1, backgroundColor: "#eeeeee", marginBottom: 12 },
  notesLabel: { fontSize: 7, color: "#cccccc", textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 },
  notesText: { fontSize: 9, color: "#888888", lineHeight: 1.7 },
  footer: { position: "absolute", bottom: 40, left: 56, right: 56, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 8, color: "#dddddd" },
});

function MinimalPDF({ data }: { data: PDFInvoiceData }) {
  const accent = data.customization.accentColor || "#111111";
  return (
    <Document>
      <Page size="A4" style={minimalStyles.page}>
        <Text style={minimalStyles.invoiceWord}>INVOICE</Text>
        {data.customization.logoDataUrl && data.customization.logoPosition === "left" && (
          <Image src={data.customization.logoDataUrl} style={{ width: 80, height: 40, objectFit: "contain", marginBottom: 4 }} />
        )}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View>
            <Text style={minimalStyles.orgName}>{data.orgName}</Text>
            <Text style={minimalStyles.orgSub}>{data.orgEmail}</Text>
            {data.customization.companyTagline ? <Text style={[minimalStyles.orgSub, { fontStyle: "italic", marginTop: 2 }]}>{data.customization.companyTagline}</Text> : null}
          </View>
          {data.customization.logoDataUrl && data.customization.logoPosition === "right" && (
            <Image src={data.customization.logoDataUrl} style={{ width: 80, height: 40, objectFit: "contain" }} />
          )}
        </View>

        <View style={[minimalStyles.topDivider, { backgroundColor: accent }]} />

        <View style={minimalStyles.metaLine}>
          {[{ label: "Invoice", value: `#${data.invoiceNumber}` }, { label: "Issued", value: data.date }, { label: "Due", value: data.dueDate }].map((m, i) => (
            <View key={i} style={{ alignItems: "flex-end" }}>
              <Text style={minimalStyles.metaLabel}>{m.label}</Text>
              <Text style={minimalStyles.metaValue}>{m.value}</Text>
            </View>
          ))}
        </View>

        <View style={minimalStyles.parties}>
          <View>
            <Text style={minimalStyles.partyLabel}>From</Text>
            <Text style={minimalStyles.partyName}>{data.orgName}</Text>
            <Text style={minimalStyles.partySub}>{data.orgEmail}</Text>
            {data.orgAddress && <Text style={minimalStyles.partySub}>{data.orgAddress}</Text>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={minimalStyles.partyLabel}>Bill To</Text>
            <Text style={minimalStyles.partyName}>{data.customerName}</Text>
            <Text style={minimalStyles.partySub}>{data.customerEmail}</Text>
            {data.customerPhone && <Text style={minimalStyles.partySub}>{data.customerPhone}</Text>}
            {data.customerAddress && <Text style={minimalStyles.partySub}>{data.customerAddress}</Text>}
          </View>
        </View>

        <View style={minimalStyles.thRow}>
          <Text style={[minimalStyles.thText, minimalStyles.colDesc]}>Description</Text>
          <Text style={[minimalStyles.thText, minimalStyles.colQty, { textAlign: "center" }]}>Qty</Text>
          <Text style={[minimalStyles.thText, minimalStyles.colPrice, { textAlign: "right" }]}>Rate</Text>
          <Text style={[minimalStyles.thText, minimalStyles.colAmt, { textAlign: "right" }]}>Total</Text>
        </View>
        {data.items.map((item, i) => (
          <View key={i} style={minimalStyles.row}>
            <Text style={[minimalStyles.td, minimalStyles.colDesc]}>{item.description}</Text>
            <Text style={[minimalStyles.td, minimalStyles.colQty, { textAlign: "center" }]}>{item.quantity}</Text>
            <Text style={[minimalStyles.td, minimalStyles.colPrice, { textAlign: "right" }]}>{fmt(item.unitPrice, data.currencySymbol)}</Text>
            <Text style={[minimalStyles.td, minimalStyles.colAmt, { textAlign: "right" }]}>{fmt(item.quantity * item.unitPrice, data.currencySymbol)}</Text>
          </View>
        ))}

        <View style={minimalStyles.totals}>
          <View style={minimalStyles.tRow}>
            <Text style={minimalStyles.tLabel}>Subtotal</Text>
            <Text style={minimalStyles.tValue}>{fmt(data.subtotal, data.currencySymbol)}</Text>
          </View>
          {data.taxAmount > 0 && (
            <View style={minimalStyles.tRow}>
              <Text style={minimalStyles.tLabel}>Tax</Text>
              <Text style={minimalStyles.tValue}>{fmt(data.taxAmount, data.currencySymbol)}</Text>
            </View>
          )}
          {data.discountAmount > 0 && (
            <View style={minimalStyles.tRow}>
              <Text style={minimalStyles.tLabel}>Discount</Text>
              <Text style={minimalStyles.tValue}>-{fmt(data.discountAmount, data.currencySymbol)}</Text>
            </View>
          )}
          <View style={[minimalStyles.grandLine, { backgroundColor: accent }]} />
          <View style={minimalStyles.grandRow}>
            <Text style={minimalStyles.grandLabel}>Total Due</Text>
            <Text style={[minimalStyles.grandValue, { color: accent }]}>{fmt(data.total, data.currencySymbol)}</Text>
          </View>
        </View>

        {(data.notes || data.customization.bankDetails) && (
          <View style={minimalStyles.notesSection}>
            <View style={minimalStyles.notesDivider} />
            {data.notes ? (
              <>
                <Text style={minimalStyles.notesLabel}>Notes</Text>
                <Text style={minimalStyles.notesText}>{data.notes}</Text>
              </>
            ) : null}
            {data.customization.bankDetails ? (
              <>
                <Text style={[minimalStyles.notesLabel, { marginTop: data.notes ? 8 : 0 }]}>Bank Details</Text>
                <Text style={minimalStyles.notesText}>{data.customization.bankDetails}</Text>
              </>
            ) : null}
          </View>
        )}

        <View style={minimalStyles.footer}>
          <Text style={minimalStyles.footerText}>{data.customization.footerText || `Generated by ${data.orgName}`}</Text>
          <Text style={minimalStyles.footerText}>{data.invoiceNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}

// ─── OBSIDIAN DARK TEMPLATE ─────────────────────────────────────────────────
const obsidianStyles = StyleSheet.create({
  page: { padding: 0, fontFamily: "Helvetica", fontSize: 10, backgroundColor: "#0f0f0f" },
  header: { paddingHorizontal: 48, paddingTop: 44, paddingBottom: 40, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  orgName: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  orgSub: { fontSize: 9, color: "rgba(255,255,255,0.45)", marginTop: 2 },
  invoicePill: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  invoiceTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 3, color: "#ffffff" },
  invoiceNum: { fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 6, textAlign: "right" },
  separator: { marginHorizontal: 48, height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginBottom: 36 },
  body: { paddingHorizontal: 48, paddingBottom: 80 },
  parties: { flexDirection: "row", justifyContent: "space-between", marginBottom: 32 },
  partyLabel: { fontSize: 7, textTransform: "uppercase", letterSpacing: 2, color: "rgba(255,255,255,0.3)", marginBottom: 8 },
  partyName: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#ffffff", marginBottom: 2 },
  partySub: { fontSize: 9, color: "rgba(255,255,255,0.45)", marginBottom: 1 },
  metaRow: { flexDirection: "row", gap: 12, marginBottom: 28 },
  metaChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  metaLabel: { fontSize: 7, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1 },
  metaValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#ffffff", marginTop: 2 },
  thRow: { flexDirection: "row", paddingVertical: 10, paddingHorizontal: 14, marginBottom: 2, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.06)" },
  thText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1 },
  row: { flexDirection: "row", paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  td: { fontSize: 10, color: "rgba(255,255,255,0.8)" },
  colDesc: { width: "48%" },
  colQty: { width: "14%", textAlign: "center" },
  colPrice: { width: "19%", textAlign: "right" },
  colAmt: { width: "19%", textAlign: "right" },
  totals: { alignItems: "flex-end", marginTop: 20 },
  tRow: { flexDirection: "row", justifyContent: "space-between", width: 230, paddingVertical: 5 },
  tLabel: { fontSize: 9, color: "rgba(255,255,255,0.3)" },
  tValue: { fontSize: 9, color: "rgba(255,255,255,0.7)", fontFamily: "Helvetica-Bold" },
  grandBox: { width: 230, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 8, marginTop: 8, flexDirection: "row", justifyContent: "space-between" },
  grandLabel: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#0f0f0f" },
  grandValue: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#0f0f0f" },
  notesBox: { marginTop: 32, padding: 16, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  notesLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 },
  notesText: { fontSize: 9, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 },
  footer: { position: "absolute", bottom: 28, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 8, color: "rgba(255,255,255,0.2)" },
});

function ObsidianPDF({ data }: { data: PDFInvoiceData }) {
  const accent = data.customization.accentColor || "#f59e0b";
  return (
    <Document>
      <Page size="A4" style={obsidianStyles.page}>
        <View style={obsidianStyles.header}>
          <View>
            {data.customization.logoDataUrl && data.customization.logoPosition === "left" && (
              <Image src={data.customization.logoDataUrl} style={{ width: 72, height: 36, objectFit: "contain", marginBottom: 8, borderRadius: 4 }} />
            )}
            <Text style={obsidianStyles.orgName}>{data.orgName}</Text>
            <Text style={obsidianStyles.orgSub}>{data.orgEmail}</Text>
            {data.customization.companyTagline ? <Text style={[obsidianStyles.orgSub, { fontStyle: "italic", marginTop: 3 }]}>{data.customization.companyTagline}</Text> : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            {data.customization.logoDataUrl && data.customization.logoPosition === "right" && (
              <Image src={data.customization.logoDataUrl} style={{ width: 72, height: 36, objectFit: "contain", marginBottom: 8, borderRadius: 4 }} />
            )}
            <View style={[obsidianStyles.invoicePill, { borderColor: `${accent}50` }]}>
              <Text style={[obsidianStyles.invoiceTitle, { color: accent }]}>INVOICE</Text>
            </View>
            <Text style={obsidianStyles.invoiceNum}>#{data.invoiceNumber}</Text>
          </View>
        </View>

        <View style={obsidianStyles.separator} />

        <View style={obsidianStyles.body}>
          <View style={obsidianStyles.parties}>
            <View>
              <Text style={obsidianStyles.partyLabel}>From</Text>
              <Text style={obsidianStyles.partyName}>{data.orgName}</Text>
              <Text style={obsidianStyles.partySub}>{data.orgEmail}</Text>
              {data.orgAddress && <Text style={obsidianStyles.partySub}>{data.orgAddress}</Text>}
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={obsidianStyles.partyLabel}>Bill To</Text>
              <Text style={obsidianStyles.partyName}>{data.customerName}</Text>
              <Text style={obsidianStyles.partySub}>{data.customerEmail}</Text>
              {data.customerPhone && <Text style={obsidianStyles.partySub}>{data.customerPhone}</Text>}
              {data.customerAddress && <Text style={obsidianStyles.partySub}>{data.customerAddress}</Text>}
            </View>
          </View>

          <View style={obsidianStyles.metaRow}>
            {[{ label: "Invoice", value: `#${data.invoiceNumber}` }, { label: "Issued", value: data.date }, { label: "Due", value: data.dueDate }].map((m, i) => (
              <View key={i} style={obsidianStyles.metaChip}>
                <Text style={obsidianStyles.metaLabel}>{m.label}</Text>
                <Text style={obsidianStyles.metaValue}>{m.value}</Text>
              </View>
            ))}
          </View>

          <View style={obsidianStyles.thRow}>
            <Text style={[obsidianStyles.thText, obsidianStyles.colDesc]}>Description</Text>
            <Text style={[obsidianStyles.thText, obsidianStyles.colQty, { textAlign: "center" }]}>Qty</Text>
            <Text style={[obsidianStyles.thText, obsidianStyles.colPrice, { textAlign: "right" }]}>Unit Price</Text>
            <Text style={[obsidianStyles.thText, obsidianStyles.colAmt, { textAlign: "right" }]}>Amount</Text>
          </View>
          {data.items.map((item, i) => (
            <View key={i} style={obsidianStyles.row}>
              <Text style={[obsidianStyles.td, obsidianStyles.colDesc]}>{item.description}</Text>
              <Text style={[obsidianStyles.td, obsidianStyles.colQty, { textAlign: "center" }]}>{item.quantity}</Text>
              <Text style={[obsidianStyles.td, obsidianStyles.colPrice, { textAlign: "right" }]}>{fmt(item.unitPrice, data.currencySymbol)}</Text>
              <Text style={[obsidianStyles.td, obsidianStyles.colAmt, { textAlign: "right" }]}>{fmt(item.quantity * item.unitPrice, data.currencySymbol)}</Text>
            </View>
          ))}

          <View style={obsidianStyles.totals}>
            <View style={obsidianStyles.tRow}>
              <Text style={obsidianStyles.tLabel}>Subtotal</Text>
              <Text style={obsidianStyles.tValue}>{fmt(data.subtotal, data.currencySymbol)}</Text>
            </View>
            {data.taxAmount > 0 && (
              <View style={obsidianStyles.tRow}>
                <Text style={obsidianStyles.tLabel}>Tax</Text>
                <Text style={obsidianStyles.tValue}>{fmt(data.taxAmount, data.currencySymbol)}</Text>
              </View>
            )}
            {data.discountAmount > 0 && (
              <View style={obsidianStyles.tRow}>
                <Text style={obsidianStyles.tLabel}>Discount</Text>
                <Text style={obsidianStyles.tValue}>-{fmt(data.discountAmount, data.currencySymbol)}</Text>
              </View>
            )}
            <View style={[obsidianStyles.grandBox, { backgroundColor: accent }]}>
              <Text style={obsidianStyles.grandLabel}>TOTAL DUE</Text>
              <Text style={obsidianStyles.grandValue}>{fmt(data.total, data.currencySymbol)}</Text>
            </View>
          </View>

          {(data.notes || data.customization.bankDetails) && (
            <View style={obsidianStyles.notesBox}>
              {data.notes ? (
                <>
                  <Text style={obsidianStyles.notesLabel}>Notes</Text>
                  <Text style={obsidianStyles.notesText}>{data.notes}</Text>
                </>
              ) : null}
              {data.customization.bankDetails ? (
                <>
                  <Text style={[obsidianStyles.notesLabel, { marginTop: data.notes ? 8 : 0 }]}>Bank Details</Text>
                  <Text style={obsidianStyles.notesText}>{data.customization.bankDetails}</Text>
                </>
              ) : null}
            </View>
          )}
        </View>

        <View style={obsidianStyles.footer}>
          <Text style={obsidianStyles.footerText}>{data.customization.footerText || `Thank you — ${data.orgName}`}</Text>
          <Text style={obsidianStyles.footerText}>{data.invoiceNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}

// ─── FOREST ELEGANT TEMPLATE ────────────────────────────────────────────────
const forestStyles = StyleSheet.create({
  page: { padding: 0, fontFamily: "Helvetica", fontSize: 10, backgroundColor: "#ffffff" },
  sidebar: { position: "absolute", top: 0, bottom: 0, left: 0, width: 180, backgroundColor: "#064e3b", padding: 28 },
  sideOrgName: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#ffffff", marginBottom: 4 },
  sideOrgSub: { fontSize: 8, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 },
  sideTagline: { fontSize: 7.5, color: "rgba(255,255,255,0.4)", fontStyle: "italic", marginTop: 6 },
  sideDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.12)", marginVertical: 20 },
  sideLabel: { fontSize: 7, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 },
  sideMeta: { marginBottom: 14 },
  sideMetaValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#ffffff", marginTop: 1 },
  sideParty: { marginBottom: 4 },
  sidePartyName: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#ffffff", marginBottom: 1 },
  sidePartySub: { fontSize: 7.5, color: "rgba(255,255,255,0.45)" },
  main: { marginLeft: 180, paddingHorizontal: 36, paddingTop: 40, paddingBottom: 70 },
  invoiceTitle: { fontSize: 36, fontFamily: "Helvetica-Bold", color: "#064e3b", letterSpacing: -0.5 },
  invoiceNum: { fontSize: 10, color: "#aaaaaa", marginTop: 2, marginBottom: 28 },
  thRow: { flexDirection: "row", paddingVertical: 9, paddingHorizontal: 10, backgroundColor: "#064e3b", borderRadius: 5 },
  thText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#ffffff", textTransform: "uppercase", letterSpacing: 0.8 },
  row: { flexDirection: "row", paddingVertical: 11, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  td: { fontSize: 10, color: "#333333" },
  colDesc: { width: "48%" },
  colQty: { width: "14%", textAlign: "center" },
  colPrice: { width: "19%", textAlign: "right" },
  colAmt: { width: "19%", textAlign: "right" },
  totals: { alignItems: "flex-end", marginTop: 20 },
  tRow: { flexDirection: "row", justifyContent: "space-between", width: 220, paddingVertical: 4 },
  tLabel: { fontSize: 9, color: "#aaaaaa" },
  tValue: { fontSize: 9, color: "#333333", fontFamily: "Helvetica-Bold" },
  grandRow: { flexDirection: "row", justifyContent: "space-between", width: 220, paddingTop: 10, paddingBottom: 10, paddingHorizontal: 14, backgroundColor: "#064e3b", borderRadius: 6, marginTop: 8 },
  grandLabel: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  grandValue: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  notesBox: { marginTop: 24, padding: 14, borderRadius: 6, backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0" },
  notesLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#166534", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 },
  notesText: { fontSize: 9, color: "#555555", lineHeight: 1.6 },
  footer: { position: "absolute", bottom: 24, left: 216, right: 36, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 8, color: "#cccccc" },
});

function ForestPDF({ data }: { data: PDFInvoiceData }) {
  const primary = data.customization.primaryColor || "#064e3b";
  return (
    <Document>
      <Page size="A4" style={forestStyles.page}>
        {/* Sidebar */}
        <View style={[forestStyles.sidebar, { backgroundColor: primary }]}>
          {data.customization.logoDataUrl && data.customization.logoPosition === "left" && (
            <Image src={data.customization.logoDataUrl} style={{ width: 80, height: 40, objectFit: "contain", marginBottom: 10, borderRadius: 4 }} />
          )}
          <Text style={forestStyles.sideOrgName}>{data.orgName}</Text>
          <Text style={forestStyles.sideOrgSub}>{data.orgEmail}</Text>
          {data.orgPhone && <Text style={forestStyles.sideOrgSub}>{data.orgPhone}</Text>}
          {data.customization.companyTagline ? <Text style={forestStyles.sideTagline}>{data.customization.companyTagline}</Text> : null}

          <View style={forestStyles.sideDivider} />

          <View style={forestStyles.sideMeta}>
            <Text style={forestStyles.sideLabel}>Invoice #</Text>
            <Text style={forestStyles.sideMetaValue}>{data.invoiceNumber}</Text>
          </View>
          <View style={forestStyles.sideMeta}>
            <Text style={forestStyles.sideLabel}>Issue Date</Text>
            <Text style={forestStyles.sideMetaValue}>{data.date}</Text>
          </View>
          <View style={forestStyles.sideMeta}>
            <Text style={forestStyles.sideLabel}>Due Date</Text>
            <Text style={forestStyles.sideMetaValue}>{data.dueDate}</Text>
          </View>

          <View style={forestStyles.sideDivider} />

          <Text style={forestStyles.sideLabel}>Bill To</Text>
          <Text style={forestStyles.sidePartyName}>{data.customerName}</Text>
          {data.customerEmail && <Text style={forestStyles.sidePartySub}>{data.customerEmail}</Text>}
          {data.customerPhone && <Text style={forestStyles.sidePartySub}>{data.customerPhone}</Text>}
          {data.customerAddress && <Text style={forestStyles.sidePartySub}>{data.customerAddress}</Text>}

          {data.customization.bankDetails && (
            <>
              <View style={forestStyles.sideDivider} />
              <Text style={forestStyles.sideLabel}>Bank Details</Text>
              <Text style={[forestStyles.sidePartySub, { lineHeight: 1.6 }]}>{data.customization.bankDetails}</Text>
            </>
          )}
        </View>

        {/* Main Content */}
        <View style={forestStyles.main}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View>
              <Text style={[forestStyles.invoiceTitle, { color: primary }]}>INVOICE</Text>
              <Text style={forestStyles.invoiceNum}>#{data.invoiceNumber}</Text>
            </View>
            {data.customization.logoDataUrl && data.customization.logoPosition === "right" && (
              <Image src={data.customization.logoDataUrl} style={{ width: 80, height: 40, objectFit: "contain" }} />
            )}
          </View>

          <View style={[forestStyles.thRow, { backgroundColor: primary }]}>
            <Text style={[forestStyles.thText, forestStyles.colDesc]}>Description</Text>
            <Text style={[forestStyles.thText, forestStyles.colQty, { textAlign: "center" }]}>Qty</Text>
            <Text style={[forestStyles.thText, forestStyles.colPrice, { textAlign: "right" }]}>Unit Price</Text>
            <Text style={[forestStyles.thText, forestStyles.colAmt, { textAlign: "right" }]}>Amount</Text>
          </View>
          {data.items.map((item, i) => (
            <View key={i} style={[forestStyles.row, i % 2 === 1 ? { backgroundColor: "#fafafa" } : {}]}>
              <Text style={[forestStyles.td, forestStyles.colDesc]}>{item.description}</Text>
              <Text style={[forestStyles.td, forestStyles.colQty, { textAlign: "center" }]}>{item.quantity}</Text>
              <Text style={[forestStyles.td, forestStyles.colPrice, { textAlign: "right" }]}>{fmt(item.unitPrice, data.currencySymbol)}</Text>
              <Text style={[forestStyles.td, forestStyles.colAmt, { textAlign: "right" }]}>{fmt(item.quantity * item.unitPrice, data.currencySymbol)}</Text>
            </View>
          ))}

          <View style={forestStyles.totals}>
            <View style={forestStyles.tRow}>
              <Text style={forestStyles.tLabel}>Subtotal</Text>
              <Text style={forestStyles.tValue}>{fmt(data.subtotal, data.currencySymbol)}</Text>
            </View>
            {data.taxAmount > 0 && (
              <View style={forestStyles.tRow}>
                <Text style={forestStyles.tLabel}>Tax</Text>
                <Text style={forestStyles.tValue}>{fmt(data.taxAmount, data.currencySymbol)}</Text>
              </View>
            )}
            {data.discountAmount > 0 && (
              <View style={forestStyles.tRow}>
                <Text style={forestStyles.tLabel}>Discount</Text>
                <Text style={forestStyles.tValue}>-{fmt(data.discountAmount, data.currencySymbol)}</Text>
              </View>
            )}
            <View style={[forestStyles.grandRow, { backgroundColor: primary }]}>
              <Text style={forestStyles.grandLabel}>TOTAL DUE</Text>
              <Text style={forestStyles.grandValue}>{fmt(data.total, data.currencySymbol)}</Text>
            </View>
          </View>

          {data.notes && (
            <View style={forestStyles.notesBox}>
              <Text style={[forestStyles.notesLabel, { color: primary }]}>Notes</Text>
              <Text style={forestStyles.notesText}>{data.notes}</Text>
            </View>
          )}
        </View>

        <View style={forestStyles.footer}>
          <Text style={forestStyles.footerText}>{data.customization.footerText || `Thank you for your business — ${data.orgName}`}</Text>
          <Text style={forestStyles.footerText}>{data.invoiceNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}

// ─── DISPATCHER ─────────────────────────────────────────────────────────────
export function InvoicePDFDocument({ data }: { data: PDFInvoiceData }) {
  switch (data.customization.themeId) {
    case "modern":    return <ModernPDF data={data} />;
    case "minimal":   return <MinimalPDF data={data} />;
    case "obsidian":  return <ObsidianPDF data={data} />;
    case "forest":    return <ForestPDF data={data} />;
    default:          return <ClassicPDF data={data} />;
  }
}
