import { forwardRef } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FeeReceiptProps {
  receiptNumber: string;
  studentName: string;
  fatherName: string;
  studentId?: string;
  className: string;
  subject: string;
  professorName: string;
  amount: number;
  month: string;
  date: string;
  collectedBy?: string;
  studentPhone?: string;
  time?: string;
  splitBreakdown?: {
    teacherShare: number;
    academyShare: number;
    teacherPercentage: number;
    academyPercentage: number;
  };
  showSplit?: boolean;
  onPrint?: () => void;
}

// Printable Fee Receipt - STANDARD COACHING ACADEMY
const FeeReceipt = forwardRef<HTMLDivElement, FeeReceiptProps>(
  (
    {
      receiptNumber,
      studentName,
      fatherName,
      studentId,
      className,
      subject,
      professorName,
      amount,
      month,
      date,
      collectedBy,
      studentPhone,
      time,
      splitBreakdown,
      showSplit = false,
      onPrint,
    },
    ref,
  ) => {
    const serialNumber =
      receiptNumber?.match(/\d+$/)?.[0] || receiptNumber?.slice(-4) || "----";

    return (
      <div className="space-y-4">
        {/* Receipt Card */}
        <div
          ref={ref}
          className="relative bg-white w-full max-w-[700px] mx-auto shadow-lg print:shadow-none overflow-hidden border border-gray-200"
          style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
        >
          {/* Top Border */}
          <div className="h-2 bg-blue-700" />

          <div className="flex">
            {/* Left Accent */}
            <div className="w-1.5 bg-blue-700" />

            {/* Content */}
            <div className="flex-1 px-6 py-5">
              {/* Watermark */}
              <div
                className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none"
                aria-hidden="true"
              >
                <div className="text-6xl font-bold text-[#1A237E] tracking-widest rotate-[-25deg]">
                  SCA
                </div>
              </div>

              {/* Header */}
              <div className="relative z-10 flex items-start justify-between mb-5 pb-4 border-b-2 border-[#1A237E]">
                {/* Logo + Title */}
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full border-2 border-[#1A237E] flex items-center justify-center bg-gradient-to-b from-amber-50 to-white flex-shrink-0">
                    <img
                      src="/logo.png"
                      alt="SCA"
                      className="w-10 h-10 object-contain"
                    />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold leading-tight">
                      <span className="text-[#1A237E] font-serif italic">Standard </span>
                      <span className="text-[#1A237E] tracking-wide">COACHING </span>
                      <span className="text-gray-900">Academy</span>
                    </h1>
                    <p className="text-[#1A237E] font-semibold text-xs mt-1">
                      Contact: 091-5601600 / 0334-5852326
                    </p>
                  </div>
                </div>

                {/* S.No Box + Date */}
                <div className="text-right flex-shrink-0 ml-4">
                  <div className="inline-block border-2 border-gray-800 bg-white">
                    <div className="px-2 py-0.5 border-b border-gray-400 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                      S.No.
                    </div>
                    <div className="px-5 py-1.5 text-xl font-bold text-gray-900 min-w-[70px] text-center">
                      {serialNumber}
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1.5">Date: {date}</p>
                </div>
              </div>

              {/* Form Fields - Clean Table Layout */}
              <div className="relative z-10 mb-4">
                <table className="w-full text-sm" style={{ borderCollapse: "separate", borderSpacing: "0 6px" }}>
                  <tbody>
                    <tr>
                      <td className="font-semibold text-gray-600 w-[80px] pr-2 whitespace-nowrap align-middle">Professor:</td>
                      <td className="border-b border-gray-300 px-2 py-1 uppercase font-bold text-blue-800">{professorName || "—"}</td>
                      <td className="font-semibold text-gray-600 w-[70px] pr-2 pl-6 whitespace-nowrap align-middle">TIME:</td>
                      <td className="border-b border-gray-300 px-2 py-1">{time || "—"}</td>
                    </tr>
                    <tr>
                      <td className="font-semibold text-gray-600 pr-2 whitespace-nowrap align-middle">Name:</td>
                      <td className="border-b border-gray-300 px-2 py-1">{studentName}</td>
                      <td className="font-semibold text-gray-600 pr-2 pl-6 whitespace-nowrap align-middle">Roll No.:</td>
                      <td className="border-b border-gray-300 px-2 py-1">{studentId || "—"}</td>
                    </tr>
                    <tr>
                      <td className="font-semibold text-gray-600 pr-2 whitespace-nowrap align-middle">Father:</td>
                      <td className="border-b border-gray-300 px-2 py-1">{fatherName}</td>
                      <td className="font-semibold text-gray-600 pr-2 pl-6 whitespace-nowrap align-middle">Cell#:</td>
                      <td className="border-b border-gray-300 px-2 py-1">{studentPhone || "—"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Subject + Class Row */}
              <div className="relative z-10 flex items-center justify-between mb-4 gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-600 text-sm">Subject:</span>
                  <span className="bg-yellow-300 px-4 py-1 font-bold uppercase text-sm border border-gray-700 shadow-sm">
                    {subject || "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-600 text-sm">Class:</span>
                  <div className="flex gap-1.5">
                    <span
                      className={`px-3 py-1 border border-gray-400 text-xs rounded-sm ${className?.toLowerCase().includes("first") ? "bg-yellow-200 font-bold border-gray-700" : "bg-white"}`}
                    >
                      1st Year
                    </span>
                    <span
                      className={`px-3 py-1 border border-gray-400 text-xs rounded-sm ${className?.toLowerCase().includes("second") ? "bg-yellow-200 font-bold border-gray-700" : "bg-white"}`}
                    >
                      2nd Year
                    </span>
                  </div>
                </div>
              </div>

              {/* Amount Section */}
              <div className="relative z-10 flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 border border-green-300 rounded-md">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-600 text-sm">Month:</span>
                  <span className="font-bold text-base">{month}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-600 text-sm">Amount:</span>
                  <span className="font-bold text-2xl text-green-700">
                    Rs. {amount?.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Split Breakdown (internal use) */}
              {showSplit && splitBreakdown && (
                <div className="relative z-10 mt-2 p-2.5 bg-blue-50 border border-blue-200 rounded text-xs">
                  <div className="flex justify-between">
                    <span>Teacher ({splitBreakdown.teacherPercentage}%):</span>
                    <span className="font-semibold">
                      Rs. {splitBreakdown.teacherShare?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span>Academy ({splitBreakdown.academyPercentage}%):</span>
                    <span className="font-semibold">
                      Rs. {splitBreakdown.academyShare?.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="relative z-10 mt-5 pt-3 border-t border-gray-300 flex justify-between items-end">
                <div className="border-2 border-blue-600 px-3 py-1.5 bg-blue-50 rounded-sm">
                  <p className="text-[10px] font-bold text-blue-700 uppercase leading-tight">
                    Fee is non-refundable in any case
                  </p>
                </div>
                <div className="text-center">
                  <div className="border-t border-gray-800 w-28 mb-1" />
                  <p className="text-[10px] text-gray-500">Signature</p>
                </div>
              </div>

              {/* Address */}
              <div className="relative z-10 text-center text-[9px] text-gray-400 mt-3 pt-2 border-t border-gray-100">
                <p>
                  Opp. Islamia College, Danishabad, University Road, Peshawar
                </p>
                <p className="mt-0.5 italic text-[8px]">
                  Can't Be Used For Legal Purpose
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Border */}
          <div className="h-1 bg-blue-600" />
        </div>

        {/* Print Button */}
        {onPrint && (
          <div className="flex justify-center print:hidden">
            <Button onClick={onPrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print Receipt
            </Button>
          </div>
        )}
      </div>
    );
  },
);

FeeReceipt.displayName = "FeeReceipt";

export default FeeReceipt;
export { FeeReceipt };
