import { useState, useCallback } from "react";
import { pdf } from "@react-pdf/renderer";
import { toast } from "sonner";
import JsBarcode from "jsbarcode";
import {
  ReceiptPDF,
  StudentPDFData,
  ReceiptPDFConfig,
} from "@/components/print/ReceiptPDF";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

type PrintReason = "admission" | "verification" | "reprint" | "lost";

interface PrintReceiptResult {
  student: StudentPDFData;
  receiptConfig: ReceiptPDFConfig;
}

/**
 * Load logo image and convert to Base64 Data URL
 * Needed because react-pdf cannot load images from public paths directly
 */
async function loadLogoAsDataUrl(): Promise<string> {
  try {
    const response = await fetch("/logo.png");
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error loading logo:", error);
    return "";
  }
}

// Cache the logo data URL to avoid repeated fetches
let cachedLogoDataUrl: string | null = null;

/**
 * Generate a barcode as a Base64 Data URL using JsBarcode
 * Uses the numeric studentId for scanner compatibility (CODE39 format)
 */
function generateBarcodeDataUrl(value: string): string {
  try {
    const canvas = document.createElement("canvas");
    JsBarcode(canvas, value, {
      format: "CODE128",
      width: 2,
      height: 40,
      displayValue: false, // We show the ID separately below
      margin: 4,
      background: "#ffffff",
      lineColor: "#000000",
    });
    return canvas.toDataURL("image/png");
  } catch (error) {
    console.error("Error generating barcode:", error);
    return "";
  }
}

/**
 * usePDFReceipt - Universal hook for generating PDF receipts
 *
 * Uses @react-pdf/renderer to generate clean receipts.
 * Opens the generated PDF in a new browser tab for printing/saving.
 *
 * Features:
 * 1. Calls backend to generate unique receipt ID and track prints
 * 2. Creates PDF using @react-pdf/renderer
 * 3. Opens PDF in new tab
 */
export function usePDFReceipt() {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printData, setPrintData] = useState<PrintReceiptResult | null>(null);

  /**
   * Track print in backend and get unique receipt ID
   */
  const trackPrint = useCallback(
    async (
      studentId: string,
      reason: PrintReason = "reprint",
    ): Promise<PrintReceiptResult | null> => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/students/${studentId}/print`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              reason,
              printedBy: "System",
            }),
          },
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to generate receipt");
        }

        const result = await response.json();

        const receiptData: PrintReceiptResult = {
          student: result.data.student,
          receiptConfig: {
            receiptId: result.data.receiptId,
            version: result.data.version,
            isOriginal: result.data.isOriginal,
            printedAt: result.data.printedAt,
          },
        };

        return receiptData;
      } catch (error: any) {
        console.error("Error tracking print:", error);
        throw error;
      }
    },
    [],
  );

  /**
   * Generate PDF blob and open in new tab
   */
  const generateAndOpenPDF = useCallback(
    async (data: PrintReceiptResult): Promise<void> => {
      try {
        // Load logo as data URL if not cached
        if (!cachedLogoDataUrl) {
          cachedLogoDataUrl = await loadLogoAsDataUrl();
        }

        // Generate barcode as Base64 data URL using the numeric studentId
        const barcodeDataUrl = generateBarcodeDataUrl(data.student.studentId);

        // Create PDF document with barcode
        const pdfDoc = (
          <ReceiptPDF
            student={data.student}
            receiptConfig={data.receiptConfig}
            barcodeDataUrl={barcodeDataUrl || undefined}
            logoDataUrl={cachedLogoDataUrl}
          />
        );

        // Generate PDF blob
        const blob = await pdf(pdfDoc).toBlob();

        // Create object URL and open in new tab
        const pdfUrl = URL.createObjectURL(blob);
        const newTab = window.open(pdfUrl, "_blank");

        if (newTab) {
          // Set tab title for clarity
          newTab.document.title = `Receipt-${data.student.studentId}-V${data.receiptConfig.version}`;
        } else {
          // Fallback: download the file if popup blocked
          const link = document.createElement("a");
          link.href = pdfUrl;
          link.download = `Receipt-${data.student.studentId}-V${data.receiptConfig.version}.pdf`;
          link.click();
          toast.info("PDF downloaded", {
            description:
              "Pop-up was blocked. The PDF has been downloaded instead.",
          });
        }

        // Cleanup URL after a delay
        setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);
      } catch (error) {
        console.error("Error generating PDF:", error);
        throw error;
      }
    },
    [],
  );

  /**
   * Main function: Track print + Generate PDF + Open in new tab
   */
  const generatePDF = useCallback(
    async (studentId: string, reason: PrintReason = "reprint") => {
      setIsPrinting(true);

      try {
        // Step 1: Track print and get receipt data
        const data = await trackPrint(studentId, reason);

        if (!data) {
          throw new Error("Failed to get receipt data");
        }

        setPrintData(data);

        // Step 2: Generate and open PDF
        await generateAndOpenPDF(data);

        toast.success("Receipt generated successfully", {
          description: `${data.student.studentName} - Version ${data.receiptConfig.version}`,
        });
      } catch (error: any) {
        console.error("Error in generatePDF:", error);
        toast.error("Failed to generate receipt", {
          description: error.message || "Please try again",
        });
      } finally {
        setIsPrinting(false);
      }
    },
    [trackPrint, generateAndOpenPDF],
  );

  /**
   * Generate PDF with existing data (no tracking)
   */
  const generatePDFWithData = useCallback(
    async (data: PrintReceiptResult) => {
      setIsPrinting(true);

      try {
        setPrintData(data);
        await generateAndOpenPDF(data);

        toast.success("Receipt generated successfully", {
          description: `${data.student.studentName} - Version ${data.receiptConfig.version}`,
        });
      } catch (error: any) {
        console.error("Error in generatePDFWithData:", error);
        toast.error("Failed to generate receipt", {
          description: error.message || "Please try again",
        });
      } finally {
        setIsPrinting(false);
      }
    },
    [generateAndOpenPDF],
  );

  return {
    isPrinting,
    printData,
    generatePDF,
    generatePDFWithData,
    trackPrint,
  };
}

export type {
  StudentPDFData,
  ReceiptPDFConfig,
  PrintReceiptResult,
  PrintReason,
};
