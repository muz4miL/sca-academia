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

  // Watermark
  academyWatermark: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%) rotate(-30deg)",
    fontSize: 48,
    fontWeight: 700,
    color: "rgba(37, 99, 235, 0.08)",
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
    color: "#dc2626",
    marginTop: 2,
    fontWeight: 500,
  },
  headerRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  titleBadge: {
    backgroundColor: "#2563eb",
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 3,
    marginBottom: 3,
    alignSelf: "flex-end",
  },
  titleBadgeText: {
    fontSize: 9,
    fontWeight: 700,
    color: "#ffffff",
    letterSpacing: 2,
  },
  receiptBox: {
    border: "2pt solid #1a365d",
    backgroundColor: "#f8fafc",
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 3,
    alignSelf: "flex-end",
  },
  receiptIdText: {
    fontSize: 9,
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

  // Left Column — Person details + Payment purpose
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

  // Payment Purpose Section
  purposeSection: {
    flexDirection: "column",
    gap: 6,
    paddingTop: 8,
    borderTop: "1pt solid #e5e7eb",
  },
  purposeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  purposeTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  purposeBadge: {
    backgroundColor: "#dbeafe",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 3,
  },
  purposeBadgeText: {
    fontSize: 9,
    fontWeight: 700,
    color: "#1e40af",
  },
  purposeDescription: {
    fontSize: 8,
    color: "#4b5563",
    lineHeight: 1.4,
  },

  // Student/Walk-in Info
  personInfoSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 8,
    borderTop: "1pt dashed #d1d5db",
  },
  infoLabel: {
    fontSize: 7,
    fontWeight: 700,
    color: "#6b7280",
    letterSpacing: 1,
  },
  infoValue: {
    fontSize: 11,
    fontWeight: 700,
    color: "#1a365d",
  },
  walkInBadge: {
    backgroundColor: "#fef3c7",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 3,
  },
  walkInText: {
    fontSize: 8,
    fontWeight: 700,
    color: "#92400e",
    letterSpacing: 0.5,
  },

  // Right Column — Payment box + Signature
  rightColumn: {
    flex: 2,
    flexDirection: "column",
    justifyContent: "space-between",
  },
  paymentBox: {
    width: "100%",
    border: "2pt solid #2563eb",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
  },
  paymentHeader: {
    backgroundColor: "#2563eb",
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
    backgroundColor: "#eff6ff",
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
    borderTop: "1pt solid #bfdbfe",
    paddingTop: 6,
    marginTop: 2,
  },
  amountColor: {
    color: "#16a34a",
    fontSize: 11,
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
    color: "#2563eb",
  },
  footerAddress: {
    fontSize: 7,
    color: "#6b7280",
    textAlign: "right",
    maxWidth: 220,
  },
});

// ==================== INTERFACES ====================
export interface MiscPaymentPDFData {
  receiptId: string;
  studentId: string;
  studentName: string;
  fatherName: string;
  class: string;
  contact: string;
  paymentType: string;
  category: string;
  amount: number;
  description: string;
  paymentMethod: string;
  paymentDate: Date | string;
  collectedBy: string;
}

interface MiscPaymentPDFProps {
  data: MiscPaymentPDFData;
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
export const MiscPaymentPDF = ({
  data,
  logoDataUrl,
}: MiscPaymentPDFProps) => {
  const isWalkIn = data.studentId === "WALK-IN";

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
              <View style={styles.titleBadge}>
                <Text style={styles.titleBadgeText}>PAYMENT RECEIPT</Text>
              </View>
              <View style={styles.receiptBox}>
                <Text style={styles.receiptIdText}>{data.receiptId}</Text>
              </View>
              <Text style={styles.dateText}>
                Date: {formatDate(data.paymentDate)}
              </Text>
            </View>
          </View>

          {/* ==================== MAIN CONTENT ==================== */}
          <View style={styles.mainContent}>
            {/* Left Column — Person Details & Payment Info */}
            <View style={styles.leftColumn}>
              {/* Person Details */}
              <View style={styles.detailsSection}>
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Name</Text>
                    <Text style={styles.detailValue}>{data.studentName}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Father's Name</Text>
                    <Text style={styles.detailValue}>{data.fatherName}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Contact</Text>
                    <Text style={styles.detailValue}>{data.contact}</Text>
                  </View>
                </View>
              </View>

              {/* Payment Purpose */}
              <View style={styles.purposeSection}>
                <View style={styles.purposeRow}>
                  <Text style={styles.purposeTitle}>Payment For</Text>
                  <View style={styles.purposeBadge}>
                    <Text style={styles.purposeBadgeText}>
                      {data.paymentType}
                    </Text>
                  </View>
                </View>
                {data.description && (
                  <Text style={styles.purposeDescription}>
                    {data.description}
                  </Text>
                )}
              </View>

              {/* Student ID or Walk-in Indicator */}
              <View style={styles.personInfoSection}>
                <Text style={styles.infoLabel}>
                  {isWalkIn ? "TYPE:" : "STUDENT ID:"}
                </Text>
                {isWalkIn ? (
                  <View style={styles.walkInBadge}>
                    <Text style={styles.walkInText}>WALK-IN / OUTSIDER</Text>
                  </View>
                ) : (
                  <Text style={styles.infoValue}>{data.studentId}</Text>
                )}
              </View>
            </View>

            {/* Right Column — Payment Box & Signature */}
            <View style={styles.rightColumn}>
              <View style={styles.paymentBox}>
                <View style={styles.paymentHeader}>
                  <Text style={styles.paymentHeaderLabel}>PAYMENT STATUS</Text>
                  <Text style={styles.paymentHeaderValue}>RECEIVED</Text>
                </View>

                <View style={styles.paymentDetails}>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentRowLabel}>Type:</Text>
                    <Text style={styles.paymentRowValue}>
                      {data.paymentType}
                    </Text>
                  </View>

                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentRowLabel}>Method:</Text>
                    <Text style={styles.paymentRowValue}>
                      {data.paymentMethod}
                    </Text>
                  </View>

                  <View style={styles.paymentRowDivider}>
                    <View style={styles.paymentRow}>
                      <Text
                        style={[styles.paymentRowLabel, { fontWeight: 700 }]}
                      >
                        Amount Paid:
                      </Text>
                      <Text style={[styles.paymentRowValue, styles.amountColor]}>
                        {formatCurrency(data.amount)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.signatureSection}>
                <Text style={styles.signatureLabel}>Authorized Signature</Text>
                <View style={styles.signatureLine} />
              </View>
            </View>
          </View>

          {/* ==================== FOOTER ==================== */}
          <View style={styles.footer}>
            <Text style={styles.footerWarning}>Non-refundable payment</Text>
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

export default MiscPaymentPDF;