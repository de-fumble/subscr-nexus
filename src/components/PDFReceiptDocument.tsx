import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer";

// Register a web-safe font
Font.register({
  family: "Open Sans",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-regular.ttf",
    },
    {
      src: "https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-600.ttf",
      fontWeight: 600,
    },
    {
      src: "https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-700.ttf",
      fontWeight: 700,
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Open Sans",
    padding: 40,
    backgroundColor: "#ffffff",
    color: "#1f2937",
  },
  header: {
    textAlign: "center",
    marginBottom: 30,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginHorizontal: "auto",
    marginBottom: 12,
    objectFit: "cover",
  },
  orgName: {
    fontSize: 20,
    fontWeight: 700,
    color: "#111827",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
  },
  statusBadge: {
    backgroundColor: "#dcfce7",
    color: "#166534",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 10,
    fontWeight: 600,
    marginHorizontal: "auto",
    textTransform: "uppercase",
  },
  statusBadgeFailed: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    marginVertical: 20,
  },
  amountSection: {
    backgroundColor: "#f9fafb",
    padding: 20,
    borderRadius: 8,
    textAlign: "center",
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 10,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  amount: {
    fontSize: 28,
    fontWeight: 700,
    color: "#111827",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 11,
    color: "#6b7280",
  },
  value: {
    fontSize: 11,
    fontWeight: 600,
    color: "#1f2937",
    textAlign: "right",
    maxWidth: "60%",
  },
  referenceValue: {
    fontSize: 9,
    fontFamily: "Courier",
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: "center",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  footerText: {
    fontSize: 9,
    color: "#9ca3af",
  },
  receiptNumber: {
    fontSize: 9,
    color: "#9ca3af",
    marginTop: 4,
  },
});

export interface PDFReceiptProps {
  reference: string;
  amount: number;
  currency: string;
  status: string;
  customerName: string;
  customerEmail: string;
  paidAt: string;
  plan: string;
  organizationName: string;
  organizationEmail?: string;
  organizationLogo?: string | null;
}

export function PDFReceiptDocument({
  reference,
  amount,
  currency,
  status,
  customerName,
  customerEmail,
  paidAt,
  plan,
  organizationName,
  organizationEmail,
  organizationLogo,
}: PDFReceiptProps) {
  const isSuccess = status === "success";
  const formattedDate = new Date(paidAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = new Date(paidAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const formattedAmount = new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  // Generate a receipt number based on reference
  const receiptNumber = `RCP-${reference.slice(-8).toUpperCase()}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {organizationLogo && (
            <Image src={organizationLogo} style={styles.logo} />
          )}
          <Text style={styles.orgName}>{organizationName}</Text>
          <Text style={styles.subtitle}>Payment Receipt</Text>
          <View
            style={[
              styles.statusBadge,
              !isSuccess && styles.statusBadgeFailed,
            ]}
          >
            <Text>{isSuccess ? "✓ Payment Successful" : "✗ " + status}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Amount Section */}
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Amount Paid</Text>
          <Text style={styles.amount}>
            {currency} {formattedAmount}
          </Text>
        </View>

        {/* Transaction Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Reference</Text>
            <Text style={[styles.value, styles.referenceValue]}>{reference}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{formattedDate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Time</Text>
            <Text style={styles.value}>{formattedTime}</Text>
          </View>
          {plan && plan !== "N/A" && (
            <View style={[styles.row, styles.rowLast]}>
              <Text style={styles.label}>Plan / Item</Text>
              <Text style={styles.value}>{plan}</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* Customer Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{customerName || "N/A"}</Text>
          </View>
          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{customerEmail}</Text>
          </View>
        </View>

        {/* Organization Contact */}
        {organizationEmail && (
          <>
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Merchant Contact</Text>
              <View style={[styles.row, styles.rowLast]}>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.value}>{organizationEmail}</Text>
              </View>
            </View>
          </>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Powered by Recurra • Secure payments by Paystack
          </Text>
          <Text style={styles.receiptNumber}>Receipt No: {receiptNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}
