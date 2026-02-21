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
    marginBottom: 16,
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
  headerRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  voucherBadge: {
    backgroundColor: "#b8860b",
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 3,
    marginBottom: 3,
    alignSelf: "flex-end",
  },
  voucherBadgeText: {
    fontSize: 9,
    fontWeight: 700,
    color: "#ffffff",
    letterSpacing: 2,
  },
  voucherBox: {
    border: "2pt solid #1a365d",
    backgroundColor: "#f8fafc",
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 3,
    alignSelf: "flex-end",
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
    alignSelf: "flex-end",
  },

  // ==================== MAIN CONTENT (2-column) ====================
  mainContent: {
    flexDirection: "row",
    gap: 20,
    flex: 1,
    marginBottom: 8,
  },

  // Left Column — Payment Details
  leftColumn: {
    flex: 3,
    flexDirection: "column",
    gap: 12,
  },
  
  // Details Section
  detailsSection: {
    flexDirection: "column",
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    gap: 20,
  },
  detailItem: {
    flex: 1,
    flexDirection: "column",
    gap: 2,
  },
  detailLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 10,
    color: "#111827",
    fontWeight: 600,
    paddingBottom: 2,
  },

  // Notes Section
  notesSection: {
    flexDirection: "column",
    gap: 6,
    paddingTop: 8,
    borderTop: "1pt solid #e5e7eb",
  },
  notesTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 9,
    color: "#4b5563",
    lineHeight: 1.4,
  },

  // Right Column — Payment Box + Signature
  rightColumn: {
    flex: 2,
    flexDirection: "column",
    justifyContent: "space-between",
  },
  paymentBox: {
    width: "100%",
    border: "2pt solid #b8860b",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
  },
  paymentHeader: {
    backgroundColor: "#b8860b",
    paddingVertical: 6,
    alignItems: "center",
  },
  paymentHeaderLabel: {
    fontSize: 7,
    fontWeight: 700,
    color: "#ffffff",
    letterSpacing: 1,
  },
  paymentHeaderValue: {
    fontSize: 14,
    fontWeight: 700,
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  paymentDetails: {
    padding: 10,
    backgroundColor: "#fffef5",
    gap: 6,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentRowLabel: {
    fontSize: 8,
    color: "#4b5563",
    fontWeight: 600,
  },
  paymentRowValue: {
    fontSize: 10,
    fontWeight: 700,
    color: "#111827",
  },
  paymentRowDivider: {
    borderTop: "1pt solid #fde68a",
    paddingTop: 6,
    marginTop: 2,
  },
  balanceColor: {
    color: "#ea580c",
  },
  paidColor: {
    color: "#16a34a",
  },
  remainingColor: {
    color: "#ea580c",
  },
  settledColor: {
    color: "#16a34a",
  },

  // Signature
  signatureSection: {
    alignItems: "flex-end",
    paddingTop: 8,
  },
  signatureLabel: {
    fontSize: 7,
    color: "#6b7280",
    marginBottom: 20,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  signatureLine: {
    width: 140,
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
    alignItems: "center",
    borderTop: "1pt solid #e5e7eb",
    paddingTop: 5,
    backgroundColor: "#ffffff",
  },
  footerWarning: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#b8860b",
  },
  footerAddress: {
    fontSize: 7,
    color: "#6b7280",
    textAlign: "right",
    maxWidth: 220,
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

const capitalizeFirst = (str: string): string => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// ==================== COMPONENT ====================
export const TeacherPaymentPDF = ({
  data,
  logoDataUrl,
}: TeacherPaymentPDFProps) => {
  const balanceBefore = data.remainingBalance + data.amountPaid;
  const isSettled = data.remainingBalance === 0;

  return (
    <Document>
      <Page size={[612, 396]} style={styles.page}>
        <View style={styles.container}>
          {/* ==================== HEADER ==================== */}
          <View style={styles.header}>
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

            <View style={styles.headerRight}>
              <View style={styles.voucherBadge}>
                <Text style={styles.voucherBadgeText}>PAYMENT VOUCHER</Text>
              </View>
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
            {/* Left Column — Payment Details */}
            <View style={styles.leftColumn}>
              {/* Teacher & Payment Info */}
              <View style={styles.detailsSection}>
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Paid To</Text>
                    <Text style={styles.detailValue}>{data.teacherName}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Subject</Text>
                    <Text style={styles.detailValue}>
                      {capitalizeFirst(data.subject)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Session</Text>
                    <Text style={styles.detailValue}>
                      {data.sessionName || "Tuition"}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Payment Type</Text>
                    <Text style={styles.detailValue}>
                      {capitalizeFirst(data.compensationType || "Percentage")}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Payment Notes */}
              {data.description && (
                <View style={styles.notesSection}>
                  <Text style={styles.notesTitle}>Payment Notes</Text>
                  <Text style={styles.notesText}>{data.description}</Text>
                </View>
              )}
            </View>

            {/* Right Column — Payment Box & Signature */}
            <View style={styles.rightColumn}>
              <View style={styles.paymentBox}>
                {/* Status Header */}
                <View style={styles.paymentHeader}>
                  <Text style={styles.paymentHeaderLabel}>PAYMENT STATUS</Text>
                  <Text style={styles.paymentHeaderValue}>
                    {isSettled ? "SETTLED" : "PARTIAL"}
                  </Text>
                </View>

                {/* Financial Details */}
                <View style={styles.paymentDetails}>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentRowLabel}>Balance Before:</Text>
                    <Text style={[styles.paymentRowValue, styles.balanceColor]}>
                      {formatCurrency(balanceBefore)}
                    </Text>
                  </View>

                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentRowLabel}>Amount Paid:</Text>
                    <Text style={[styles.paymentRowValue, styles.paidColor]}>
                      {formatCurrency(data.amountPaid)}
                    </Text>
                  </View>

                  <View style={styles.paymentRowDivider}>
                    <View style={styles.paymentRow}>
                      <Text style={[styles.paymentRowLabel, { fontWeight: 700 }]}>
                        Remaining:
                      </Text>
                      <Text
                        style={[
                          styles.paymentRowValue,
                          isSettled ? styles.settledColor : styles.remainingColor,
                        ]}
                      >
                        {formatCurrency(data.remainingBalance)}
                      </Text>
                    </View>
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
            <Text style={styles.footerWarning}>Computer-generated voucher</Text>
            <Text style={styles.footerAddress}>
              Opp. Islamia College, Danishabad, University Road, Peshawar
            </Text>
          </View>

          {/* Watermark */}
          <Text style={styles.academyWatermark}>SCIENCES COACHING ACADEMY</Text>
        </View>
      </Page>
    </Document>
  );
};

export default TeacherPaymentPDF;