import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  logo: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a2e",
  },
  invoiceTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a2e",
    textAlign: "right",
  },
  invoiceDetails: {
    textAlign: "right",
    color: "#666",
    marginTop: 5,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#888",
    marginBottom: 5,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  label: {
    color: "#666",
  },
  value: {
    fontWeight: "bold",
  },
  table: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  tableRow: {
    flexDirection: "row",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  colDescription: {
    width: "50%",
  },
  colQty: {
    width: "15%",
    textAlign: "center",
  },
  colPrice: {
    width: "17%",
    textAlign: "right",
  },
  colTotal: {
    width: "18%",
    textAlign: "right",
  },
  headerText: {
    fontWeight: "bold",
    fontSize: 10,
    color: "#666",
    textTransform: "uppercase",
  },
  totalsSection: {
    marginTop: 20,
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    width: 200,
    justifyContent: "space-between",
    marginBottom: 5,
    paddingVertical: 3,
  },
  grandTotal: {
    borderTopWidth: 2,
    borderTopColor: "#1a1a2e",
    paddingTop: 8,
    marginTop: 5,
  },
  grandTotalText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1a1a2e",
  },
  notes: {
    marginTop: 40,
    padding: 15,
    backgroundColor: "#f8f9fa",
    borderRadius: 5,
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 5,
  },
  notesText: {
    color: "#666",
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: "center",
    color: "#888",
    fontSize: 9,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 15,
  },
});

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  customerName: string;
  customerEmail: string;
  orgName: string;
  orgEmail: string;
  items: InvoiceItem[];
  subtotal: number;
  total: number;
  notes: string;
}

export function InvoicePDFDocument({ data }: { data: InvoiceData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>{data.orgName}</Text>
            <Text style={{ color: "#666", marginTop: 5 }}>{data.orgEmail}</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceDetails}>#{data.invoiceNumber}</Text>
          </View>
        </View>

        {/* Bill To & Invoice Details */}
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <Text style={styles.value}>{data.customerName}</Text>
            {data.customerEmail && <Text style={styles.label}>{data.customerEmail}</Text>}
          </View>
          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.label}>Invoice Date: </Text>
              <Text style={styles.value}>{data.date}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Due Date: </Text>
              <Text style={styles.value}>{data.dueDate}</Text>
            </View>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.colDescription]}>Description</Text>
            <Text style={[styles.headerText, styles.colQty]}>Qty</Text>
            <Text style={[styles.headerText, styles.colPrice]}>Unit Price</Text>
            <Text style={[styles.headerText, styles.colTotal]}>Amount</Text>
          </View>
          {data.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.colDescription}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>₦{item.unitPrice.toLocaleString()}</Text>
              <Text style={styles.colTotal}>
                ₦{(item.quantity * item.unitPrice).toLocaleString()}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.label}>Subtotal</Text>
            <Text>₦{data.subtotal.toLocaleString()}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.grandTotalText}>Total</Text>
            <Text style={styles.grandTotalText}>₦{data.total.toLocaleString()}</Text>
          </View>
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Thank you for your business! • Generated by {data.orgName}
        </Text>
      </Page>
    </Document>
  );
}
