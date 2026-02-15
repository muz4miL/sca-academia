import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

// ==================== STYLES ====================
const styles = StyleSheet.create({
  page: {
    width: "8.5in",
    height: "5.5in",
    padding: 20,
    fontFamily: "Helvetica",
    fontSize: 10,
    backgroundColor: "#ffffff",
  },
  container: {
    border: "2pt solid #1a365d",
    borderRadius: 4,
    padding: 16,
    height: "100%",
    position: "relative",
  },

  // Subtle academy watermark
  academyWatermark: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%) rotate(-30deg)",
    fontSize: 48,
    fontWeight: 700,
    color: "rgba(184, 134, 11, 0.15)",
    letterSpacing: 10,
    zIndex: 10,
  },

  // ==================== HEADER ====================
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "2pt solid #1a365d",
    paddingBottom: 8,
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 44,
    height: 44,
    objectFit: "contain",
  },
  academyInfo: {
    flexDirection: "column",
  },
  academyName: {
    fontSize: 16,
    fontWeight: 700,
    color: "#1a365d",
    letterSpacing: 0.5,
  },
  contactText: {
    fontSize: 8,
    color: "#0056b3",
    marginTop: 2,
    fontWeight: 500,
  },
  headerCenter: {
    alignItems: "center",
  },
  voucherBadge: {
    backgroundColor: "#b8860b",
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 3,
    marginBottom: 3,
  },
  voucherBadgeText: {
    fontSize: 9,
    fontWeight: 700,
    color: "#ffffff",
    letterSpacing: 2,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  voucherBox: {
    border: "2pt solid #1a365d",
    backgroundColor: "#f8fafc",
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 3,
  },
  voucherIdText: {
    fontSize: 11,
    fontWeight: 700,
    color: "#1a365d",
    fontFamily: "Courier",
  },
  dateText: {
    fontSize: 8,
    color: "#4b5563",
    marginTop: 2,
  },

  // ==================== MAIN CONTENT ====================
  mainContent: {
    flexDirection: "row",
    gap: 14,
    flex: 1,
  },

  // Left Section - Teacher Details
  leftSection: {
    flex: 1.2,
    flexDirection: "column",
  },
  detailsGrid: {
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 5,
  },
  detailItem: {
    flex: 1,
    flexDirection: "row",
  },
  detailLabel: {
    width: 58,
    fontSize: 8,
    fontWeight: 700,
    color: "#374151",
  },
  detailValue: {
    flex: 1,
    fontSize: 10,
    color: "#111827",
    borderBottom: "1pt solid #d1d5db",
    paddingBottom: 3,
  },

  // Notes section
  notesSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTop: "1pt solid #e5e7eb",
  },
  notesTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: "#374151",
    marginBottom: 3,
  },
  notesText: {
    fontSize: 9,
    color: "#4b5563",
  },

  // Center Section - Voucher ID
  centerSection: {
    flex: 0.5,
    alignItems: "center",
    justifyContent: "center",
    borderLeft: "1pt dashed #9ca3af",
    borderRight: "1pt dashed #9ca3af",
    paddingHorizontal: 10,
  },
  centerLabel: {
    fontSize: 7,
    fontWeight: 700,
    color: "#4b5563",
    marginBottom: 5,
    letterSpacing: 1,
  },
  centerValue: {
    fontSize: 11,
    fontWeight: 700,
    color: "#1a365d",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  centerHint: {
    fontSize: 7,
    color: "#6b7280",
    marginTop: 4,
  },

  // Right Section - Financial Box
  rightSection: {
    flex: 0.9,
    alignItems: "center",
  },
  feeBox: {
    width: "100%",
    border: "2pt solid #b8860b",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  feeStatusHeader: {
    backgroundColor: "#b8860b",
    paddingVertical: 5,
    alignItems: "center",
  },
  feeStatusLabel: {
    fontSize: 7,
    fontWeight: 700,
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  feeStatusValue: {
    fontSize: 14,
    fontWeight: 700,
    color: "#ffffff",
  },
  feeDetails: {
    padding: 8,
    backgroundColor: "#fffef5",
  },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  feeRowLabel: {
    fontSize: 8,
    color: "#4b5563",
  },
  feeRowValue: {
    fontSize: 9,
    fontWeight: 700,
    color: "#111827",
  },
  feeRowTotal: {
    borderTop: "1pt solid #d1d5db",
    marginTop: 4,
    paddingTop: 4,
  },
  balanceBefore: {
    color: "#ea580c",
  },
  amountPaid: {
    color: "#16a34a",
  },
  remainingPositive: {
    color: "#ea580c",
  },
  remainingZero: {
    color: "#16a34a",
  },

  // Signature
  signatureSection: {
    marginTop: "auto",
    alignItems: "flex-end",
    paddingTop: 8,
  },
  signatureLabel: {
    fontSize: 7,
    color: "#6b7280",
    marginBottom: 18,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  signatureLine: {
    width: 120,
    borderBottom: "1.5pt solid #1a365d",
    height: 1,
  },

  // ==================== FOOTER ====================
  footer: {
    position: "absolute",
    bottom: 8,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTop: "1pt solid #e5e7eb",
    paddingTop: 6,
  },
  footerWarning: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#b8860b",
  },
  footerReceipt: {
    fontSize: 7,
    color: "#9ca3af",
  },
  footerAddress: {
    fontSize: 7,
    color: "#6b7280",
    textAlign: "right",
    maxWidth: 200,
  },
});

// ==================== INTERFACES ====================
export interface TeacherPaymentPDFData {
  voucherId: string;
  teacherName: string;
  subject: string;
  amountPaid: number;
  remainingBalance: number;
  paymentDate: Date | string;
  description?: string;
  sessionName?: string;
  compensationType?: string;
}

interface TeacherPaymentPDFProps {
  data: TeacherPaymentPDFData;
  logoDataUrl?: string;
}

// ==================== HELPERS ====================
const formatCurrency = (amount: number): string => {
  return `PKR ${(amount || 0).toLocaleString()}`;
};

const formatDate = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ==================== COMPONENT ====================
export const TeacherPaymentPDF = ({
  data,
  logoDataUrl,
}: TeacherPaymentPDFProps) => {
  const balanceBefore = data.remainingBalance + data.amountPaid;
  const isPaidOff = data.remainingBalance === 0;

  return (
    <Document>
      <Page size={[612, 396]} style={styles.page}>
        <View style={styles.container}>
          {/* ==================== HEADER ==================== */}
          <View style={styles.header}>
            {/* Left: Logo & Academy Name */}
            <View style={styles.headerLeft}>
              {logoDataUrl ? (
                <Image src={logoDataUrl} style={styles.logo} />
              ) : (
                <Image src="/logo.png" style={styles.logo} />
              )}
              <View style={styles.academyInfo}>
                <Text style={styles.academyName}>
                  SCIENCES COACHING ACADEMY
                </Text>
                <Text style={styles.contactText}>
                  Contact: 091-5601600 / 0334-5852326
                </Text>
              </View>
            </View>

            {/* Center: Voucher Badge */}
            <View style={styles.headerCenter}>
              <View style={styles.voucherBadge}>
                <Text style={styles.voucherBadgeText}>PAYMENT VOUCHER</Text>
              </View>
            </View>

            {/* Right: Voucher No & Date */}
            <View style={styles.headerRight}>
              <View style={styles.voucherBox}>
                <Text style={styles.voucherIdText}>{data.voucherId}</Text>
              </View>
              <Text style={styles.dateText}>
                Date: {formatDate(data.paymentDate)}
              </Text>
            </View>
          </View>

          {/* ==================== MAIN CONTENT ==================== */}
          <View style={styles.mainContent}>
            {/* Left Section - Teacher Details */}
            <View style={styles.leftSection}>
              <View style={styles.detailsGrid}>
                {/* Row 1: Paid To */}
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Paid To:</Text>
                    <Text style={styles.detailValue}>{data.teacherName}</Text>
                  </View>
                </View>

                {/* Row 2: Subject | Type */}
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Subject:</Text>
                    <Text style={styles.detailValue}>
                      {data.subject
                        ? data.subject.charAt(0).toUpperCase() +
                          data.subject.slice(1)
                        : "-"}
                    </Text>
                  </View>
                  <View style={[styles.detailItem, { marginLeft: 14 }]}>
                    <Text style={styles.detailLabel}>Type:</Text>
                    <Text style={styles.detailValue}>
                      {data.compensationType
                        ? data.compensationType.charAt(0).toUpperCase() +
                          data.compensationType.slice(1)
                        : "Percentage"}
                    </Text>
                  </View>
                </View>

                {/* Row 3: Session */}
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Session:</Text>
                    <Text style={styles.detailValue}>
                      {data.sessionName || "N/A"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Notes */}
              {data.description && (
                <View style={styles.notesSection}>
                  <Text style={styles.notesTitle}>Payment Notes:</Text>
                  <Text style={styles.notesText}>{data.description}</Text>
                </View>
              )}
            </View>

            {/* Center Section - Voucher Ref */}
            <View style={styles.centerSection}>
              <Text style={styles.centerLabel}>VOUCHER REF</Text>
              <Text style={styles.centerValue}>{data.voucherId}</Text>
              <Text style={styles.centerHint}>For record verification</Text>
            </View>

            {/* Right Section - Financial Box */}
            <View style={styles.rightSection}>
              <View style={styles.feeBox}>
                {/* Status Header */}
                <View style={styles.feeStatusHeader}>
                  <Text style={styles.feeStatusLabel}>PAYMENT STATUS</Text>
                  <Text style={styles.feeStatusValue}>
                    {isPaidOff ? "SETTLED" : "PARTIAL"}
                  </Text>
                </View>

                {/* Financial Details */}
                <View style={styles.feeDetails}>
                  <View style={styles.feeRow}>
                    <Text style={styles.feeRowLabel}>Balance Before:</Text>
                    <Text style={[styles.feeRowValue, styles.balanceBefore]}>
                      {formatCurrency(balanceBefore)}
                    </Text>
                  </View>

                  <View style={styles.feeRow}>
                    <Text style={styles.feeRowLabel}>Amount Paid:</Text>
                    <Text style={[styles.feeRowValue, styles.amountPaid]}>
                      {formatCurrency(data.amountPaid)}
                    </Text>
                  </View>

                  <View style={[styles.feeRow, styles.feeRowTotal]}>
                    <Text style={[styles.feeRowLabel, { fontWeight: 700 }]}>
                      Remaining:
                    </Text>
                    <Text
                      style={[
                        styles.feeRowValue,
                        data.remainingBalance > 0
                          ? styles.remainingPositive
                          : styles.remainingZero,
                      ]}
                    >
                      {formatCurrency(data.remainingBalance)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Signature */}
              <View style={styles.signatureSection}>
                <Text style={styles.signatureLabel}>Authorized Signature</Text>
                <View style={styles.signatureLine} />
              </View>
            </View>
          </View>

          {/* ==================== FOOTER ==================== */}
          <View style={styles.footer}>
            <Text style={styles.footerWarning}>
              Computer-generated voucher
            </Text>
            <Text style={styles.footerReceipt}>Ref: {data.voucherId}</Text>
            <Text style={styles.footerAddress}>
              Opp. Islamia College, Danishabad, University Road, Peshawar
            </Text>
          </View>

          {/* Watermark - rendered last to appear on top */}
          <Text style={styles.academyWatermark}>SCIENCES COACHING ACADEMY</Text>
        </View>
      </Page>
    </Document>
  );
};

export default TeacherPaymentPDF;
