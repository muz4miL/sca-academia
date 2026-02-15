import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HeaderBanner } from "@/components/dashboard/HeaderBanner";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Search,
  Download,
  Loader2,
  DollarSign,
  Receipt,
  CheckCircle,
  Printer,
  KeyRound,
  EyeOff,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentApi, sessionApi, classApi } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
// Import CRUD Modals
import { ViewEditStudentModal } from "@/components/dashboard/ViewEditStudentModal";
import { DeleteStudentDialog } from "@/components/dashboard/DeleteStudentDialog";
// Import PDF Receipt System (replaces react-to-print)
import { usePDFReceipt } from "@/hooks/usePDFReceipt";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// Helper function to get initials from name
const getInitials = (name: string): string => {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// TASK 3: Helper to get subject name from string or object
const getSubjectName = (subject: any): string => {
  try {
    if (typeof subject === "string") return subject;
    if (typeof subject === "object" && subject?.name) return subject.name;
    return "";
  } catch (e) {
    console.warn("Error getting subject name:", e);
    return "";
  }
};

const Students = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // PDF Receipt Hook (replaces react-to-print)
  const { isPrinting, generatePDF } = usePDFReceipt();

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");

  // TASK 4: Peshawar Session Filter
  const [sessionFilter, setSessionFilter] = useState("all");

  // Modal states
  const [isViewEditModalOpen, setIsViewEditModalOpen] = useState(false);
  const [viewEditMode, setViewEditMode] = useState<"view" | "edit">("view");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  // Fee Collection Modal State
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [feeStudent, setFeeStudent] = useState<any | null>(null);
  const [feeAmount, setFeeAmount] = useState("");
  const [feeMonth, setFeeMonth] = useState("");
  const [feeSuccess, setFeeSuccess] = useState<any | null>(null);

  // Credential Modal State
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false);
  const [credentialStudent, setCredentialStudent] = useState<any | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedCredField, setCopiedCredField] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // TASK 4: Fetch all sessions for filter dropdown
  const { data: sessionsData } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => sessionApi.getAll(),
  });

  const sessions = sessionsData?.data || [];

  // Fetch all classes for filter dropdown (dynamic)
  const { data: classesData } = useQuery({
    queryKey: ["classes-filter"],
    queryFn: () => classApi.getAll({ status: "active" }),
  });

  const classOptions = classesData?.data || [];

  // Fetch students with React Query - include session filter
  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      "students",
      {
        class: classFilter,
        group: groupFilter,
        search: searchTerm,
        session: sessionFilter,
      },
    ],
    queryFn: () =>
      studentApi.getAll({
        class: classFilter !== "all" ? classFilter : undefined,
        group: groupFilter !== "all" ? groupFilter : undefined,
        search: searchTerm || undefined,
        sessionRef: sessionFilter !== "all" ? sessionFilter : undefined,
      }),
  });

  const students = data?.data || [];

  // Delete mutation
  const deleteStudentMutation = useMutation({
    mutationFn: studentApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student Deleted", {
        description: "Student record has been removed successfully",
        duration: 3000,
      });
      setIsDeleteDialogOpen(false);
      setSelectedStudent(null);
    },
    onError: (error: any) => {
      toast.error("Delete Failed", {
        description: error.message || "Failed to delete student",
        duration: 4000,
      });
    },
  });

  // Fee Collection mutation
  const collectFeeMutation = useMutation({
    mutationFn: async ({
      studentId,
      amount,
      month,
    }: {
      studentId: string;
      amount: number;
      month: string;
    }) => {
      const res = await fetch(
        `${API_BASE_URL}/api/students/${studentId}/collect-fee`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ amount, month }),
        },
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to collect fee");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setFeeSuccess(data.data);
    },
    onError: (error: any) => {
      toast.error("Fee Collection Failed", {
        description: error.message || "Failed to collect fee",
        duration: 4000,
      });
    },
  });

  // Generate month options (current month + next 11 months)
  const getMonthOptions = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthStr = date.toLocaleString("default", {
        month: "long",
        year: "numeric",
      });
      months.push(monthStr);
    }
    return months;
  };

  // Handlers
  const handleView = (student: any) => {
    // Navigate to full Student Profile page
    navigate(`/students/${student._id}`);
  };

  const handleQuickView = (student: any) => {
    // Quick modal view (for backward compatibility)
    setSelectedStudent(student);
    setViewEditMode("view");
    setIsViewEditModalOpen(true);
  };

  const handleEdit = (student: any) => {
    setSelectedStudent(student);
    setViewEditMode("edit");
    setIsViewEditModalOpen(true);
  };

  const handleDelete = (student: any) => {
    setSelectedStudent(student);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedStudent?._id) {
      deleteStudentMutation.mutate(selectedStudent._id);
    }
  };

  // Fee collection handler
  const handleCollectFee = (student: any) => {
    try {
      if (!student || !student._id) {
        toast.error("Invalid Student", {
          description: "Student data is missing. Please refresh and try again.",
          duration: 3000,
        });
        return;
      }

      setFeeStudent(student);
      setFeeAmount("");
      setFeeMonth(getMonthOptions()[0] || "");
      setFeeSuccess(null);
      setIsFeeModalOpen(true);
    } catch (error) {
      console.error("❌ Error in handleCollectFee:", error);
      toast.error("Error", {
        description: "Failed to open fee collection modal. Please try again.",
        duration: 3000,
      });
    }
  };

  const submitFeeCollection = () => {
    if (!feeStudent || !feeStudent._id) {
      toast.error("Invalid Student", {
        description: "Student information is missing.",
        duration: 3000,
      });
      return;
    }

    if (!feeAmount || parseFloat(feeAmount) <= 0) {
      toast.error("Invalid Amount", {
        description: "Please enter a valid fee amount greater than 0.",
        duration: 3000,
      });
      return;
    }

    if (!feeMonth) {
      toast.error("Missing Month", {
        description: "Please select a month for this fee collection.",
        duration: 3000,
      });
      return;
    }

    try {
      collectFeeMutation.mutate({
        studentId: feeStudent._id,
        amount: parseFloat(feeAmount),
        month: feeMonth,
      });
    } catch (error) {
      console.error("❌ Error submitting fee collection:", error);
      toast.error("Error", {
        description: "Failed to submit fee collection. Please try again.",
        duration: 3000,
      });
    }
  };

  const closeFeeModal = () => {
    try {
      setIsFeeModalOpen(false);
      setFeeStudent(null);
      setFeeSuccess(null);
      setFeeAmount("");
      setFeeMonth("");
    } catch (error) {
      console.warn("Error closing fee modal:", error);
    }
  };

  // Credential modal handlers
  const handleShowCredentials = (student: any) => {
    setCredentialStudent(student);
    setShowPassword(false);
    setCopiedCredField(null);
    setResetPasswordValue("");
    setResetSuccess(false);
    setIsCredentialModalOpen(true);
  };

  const copyCredential = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedCredField(field);
    setTimeout(() => setCopiedCredField(null), 2000);
  };

  const handleResetStudentPassword = async () => {
    if (!credentialStudent || !resetPasswordValue || resetPasswordValue.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    try {
      setIsResettingPassword(true);
      // Try multiple identifiers: barcodeId, studentId, or username
      const username = credentialStudent.barcodeId || credentialStudent.studentId || credentialStudent.username;
      console.log('🔑 Resetting password for student:', { username, student: credentialStudent });
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: username, newPassword: resetPasswordValue }),
      });
      const data = await res.json();
      console.log('📡 Reset password response:', data);
      if (data.success) {
        setResetSuccess(true);
        setCredentialStudent({ ...credentialStudent, plainPassword: resetPasswordValue });
        toast.success(`Password updated for ${credentialStudent.studentName}. You can now print the updated slip.`);
      } else {
        toast.error(data.message || "Failed to reset password.");
      }
    } catch (err: any) {
      console.error('❌ Reset password error:', err);
      toast.error(err.message || "Server error.");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handlePrintLoginSlip = () => {
    if (!credentialStudent) return;
    const slipWindow = window.open("", "_blank", "width=400,height=500");
    if (slipWindow) {
      slipWindow.document.write(`
        <html>
          <head><title>Login Slip - ${credentialStudent.studentName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
            .header { font-size: 20px; font-weight: bold; margin-bottom: 8px; }
            .sub { color: #666; font-size: 12px; margin-bottom: 24px; }
            .field { text-align: left; margin: 16px 0; padding: 12px; background: #f9f9f9; border-radius: 8px; }
            .label { font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 1px; }
            .value { font-size: 16px; font-weight: bold; font-family: monospace; margin-top: 4px; }
            .warning { margin-top: 24px; font-size: 11px; color: #d97706; padding: 12px; background: #fffbeb; border-radius: 8px; }
            .footer { margin-top: 24px; font-size: 10px; color: #aaa; }
          </style></head>
          <body>
            <div class="header">SCIENCES COACHING ACADEMY</div>
            <div class="sub">Student Portal Login Credentials</div>
            <hr/>
            <div class="field"><div class="label">Student Name</div><div class="value">${credentialStudent.studentName}</div></div>
            <div class="field"><div class="label">Student ID</div><div class="value">${credentialStudent.studentId || "N/A"}</div></div>
            <div class="field"><div class="label">Username</div><div class="value">${credentialStudent.studentId || "N/A"}</div></div>
            <div class="field"><div class="label">Password</div><div class="value">${credentialStudent.plainPassword || "Contact Admin"}</div></div>
            <div class="field"><div class="label">Role</div><div class="value">Student</div></div>
            <div class="warning">⚠️ Keep this slip secure. Do not share your password with anyone.</div>
            <div class="footer">Generated on ${new Date().toLocaleDateString()}</div>
            <script>window.onload = function() { window.print(); }</script>
          </body>
        </html>
      `);
      slipWindow.document.close();
    }
  };

  return (
    <DashboardLayout title="Students">
      <HeaderBanner
        title="Student Management"
        subtitle={`Total Students: ${students.length} | Active: ${students.filter((s: any) => s.status === "active").length}`}
      >
        <Button
          className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          onClick={() => navigate("/admissions")}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add Student
        </Button>
      </HeaderBanner>

      {/* Filters - All in one row */}
      <div className="mt-6 rounded-xl border border-border bg-card p-4 card-shadow">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>

          {/* Session Filter - Integrated */}
          <Select value={sessionFilter} onValueChange={setSessionFilter}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="All Sessions" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All Sessions</SelectItem>
              {sessions.map((session: any) => (
                <SelectItem key={session._id} value={session._id}>
                  {session.sessionName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-[150px] bg-background">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All Classes</SelectItem>
              {classOptions.map((cls: any) => (
                <SelectItem key={cls._id} value={cls.classTitle || cls.className}>
                  {cls.classTitle || cls.className}
                  {cls.group ? ` (${cls.group})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="w-[170px] bg-background">
              <SelectValue placeholder="All Groups" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All Groups</SelectItem>
              <SelectItem value="Pre-Medical">Pre-Medical</SelectItem>
              <SelectItem value="Pre-Engineering">Pre-Engineering</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Students Table */}
      <div className="mt-6 rounded-xl border border-border bg-card card-shadow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">
              Loading students...
            </span>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center p-12">
            <p className="text-destructive font-semibold">
              Error loading students
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {(error as any)?.message || "Failed to fetch students"}
            </p>
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12">
            <p className="text-muted-foreground font-semibold">
              No students found
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {sessionFilter !== "all"
                ? "No students in this session. Try selecting 'All Sessions'."
                : "Add your first student to get started"}
            </p>
            <Button className="mt-4" onClick={() => navigate("/admissions")}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add First Student
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary hover:bg-secondary">
                <TableHead className="font-semibold">ID</TableHead>
                <TableHead className="font-semibold">Student</TableHead>
                <TableHead className="font-semibold">Class</TableHead>
                <TableHead className="font-semibold">Group</TableHead>
                <TableHead className="font-semibold">Subjects</TableHead>
                <TableHead className="font-semibold text-center">
                  Status
                </TableHead>
                <TableHead className="font-semibold text-center">
                  Fee Status
                </TableHead>
                <TableHead className="font-semibold text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students && students.length > 0 ? (
                students.map((student: any) => {
                  try {
                    const initials = getInitials(student?.studentName || "NA");
                    const subjects = student?.subjects || [];

                    return (
                      <TableRow
                        key={student?._id || Math.random()}
                        className="hover:bg-secondary/50"
                      >
                        <TableCell className="font-medium font-mono text-xs text-muted-foreground">
                          {student.studentId}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white font-bold text-sm shadow-md">
                              <span className="flex items-center justify-center">
                                {initials}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">
                                {student.studentName}
                              </p>
                              {student.fatherName === "To be updated" ? (
                                <p className="text-[11px] italic text-slate-400">
                                  {student.fatherName}
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  {student.fatherName}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {student.class}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {student.group}
                          </span>
                        </TableCell>
                        <TableCell>
                          {/* TASK 3: Enterprise Subject Pills - Handles both string and object format */}
                          <div className="flex flex-wrap gap-1.5">
                            {subjects.length > 0 ? (
                              <>
                                {subjects
                                  .slice(0, 2)
                                  .map((subject: any, idx: number) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 border border-slate-200 text-slate-700"
                                    >
                                      {getSubjectName(subject)}
                                    </span>
                                  ))}
                                {subjects.length > 2 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 border border-sky-200 text-sky-700">
                                    +{subjects.length - 2}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                No subjects
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div
                            className="inline-flex items-center justify-center"
                            style={{
                              filter:
                                student.status === "active"
                                  ? "drop-shadow(0 0 8px rgba(34, 197, 94, 0.3))"
                                  : "drop-shadow(0 0 8px rgba(148, 163, 184, 0.2))",
                            }}
                          >
                            <StatusBadge status={student.status} />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div
                            className="inline-flex items-center justify-center"
                            style={{
                              filter:
                                student.feeStatus === "paid" ||
                                student.feeStatus === "Paid"
                                  ? "drop-shadow(0 0 8px rgba(34, 197, 94, 0.3))"
                                  : "drop-shadow(0 0 8px rgba(217, 119, 6, 0.3))",
                            }}
                          >
                            <StatusBadge status={student.feeStatus} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-amber-50 hover:text-amber-600"
                              onClick={() => handleShowCredentials(student)}
                              title="View Credentials"
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-purple-50 hover:text-purple-600"
                              onClick={() =>
                                generatePDF(student._id, "reprint")
                              }
                              disabled={isPrinting}
                              title="Print Receipt"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-green-50 hover:text-green-600"
                              onClick={() => handleCollectFee(student)}
                              title="Collect Fee"
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-sky-50 hover:text-sky-600"
                              onClick={() => handleView(student)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                              onClick={() => handleEdit(student)}
                              title="Edit Student"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                              onClick={() => handleDelete(student)}
                              disabled={deleteStudentMutation.isPending}
                              title="Delete Student"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  } catch (error) {
                    console.error(
                      "Error rendering student row:",
                      student,
                      error,
                    );
                    return null;
                  }
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center">
                    <p className="text-muted-foreground">
                      No students to display
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* CRUD Modals */}
      <ViewEditStudentModal
        open={isViewEditModalOpen}
        onOpenChange={setIsViewEditModalOpen}
        student={selectedStudent}
        mode={viewEditMode}
      />

      <DeleteStudentDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDelete}
        studentName={selectedStudent?.studentName || ""}
        studentId={selectedStudent?.studentId || ""}
        isDeleting={deleteStudentMutation.isPending}
      />

      {/* Fee Collection Modal */}
      <Dialog
        open={isFeeModalOpen}
        onOpenChange={(open) => !open && closeFeeModal()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Collect Fee
            </DialogTitle>
            <DialogDescription>
              {feeStudent
                ? `Collecting fee for ${feeStudent?.studentName || feeStudent?.name || "Student"} (${feeStudent?.studentId || "N/A"})`
                : "Loading student information..."}
            </DialogDescription>
          </DialogHeader>

          {feeSuccess ? (
            // Success state - Simple checkmark + details
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-6">
                <CheckCircle className="h-20 w-20 text-green-500 mb-3" />
                <h3 className="text-xl font-bold text-green-700">
                  Fee Collected!
                </h3>
              </div>

              <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">
                    Amount Collected
                  </span>
                  <span className="text-lg font-bold text-green-700 dark:text-green-300">
                    Rs. {feeSuccess?.feeRecord?.amount?.toLocaleString() || "0"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">
                    Collection Month
                  </span>
                  <span className="font-semibold text-foreground">
                    {feeSuccess?.feeRecord?.month || "N/A"}
                  </span>
                </div>
              </div>

              <DialogFooter>
                <Button onClick={closeFeeModal} className="w-full bg-green-600 hover:bg-green-700">
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            // Collection form
            <div className="space-y-4">
              {/* Student Financial Status */}
              {feeStudent && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Total Fee</p>
                      <p className="font-semibold text-blue-700 dark:text-blue-300">
                        Rs. {Number(feeStudent.totalFee || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Paid Amount</p>
                      <p className="font-semibold text-green-700 dark:text-green-300">
                        Rs. {Number(feeStudent.paidAmount || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-muted-foreground mb-1">Remaining Balance</p>
                      <p className="font-bold text-lg text-purple-700 dark:text-purple-300">
                        Rs. {(Number(feeStudent.totalFee || 0) - Number(feeStudent.paidAmount || 0)).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Month - Auto-set, read-only */}
              <div className="space-y-2">
                <Label htmlFor="feeMonth" className="text-sm font-medium">
                  Collection Month
                </Label>
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border rounded-md">
                  <span className="text-sm font-medium text-muted-foreground">
                    {feeMonth}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    (Current Month)
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feeAmount">Amount (Rs.)</Label>
                <Input
                  id="feeAmount"
                  type="number"
                  placeholder="Enter fee amount"
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(e.target.value)}
                  min={0}
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-sm">
                <p className="text-blue-700 dark:text-blue-300">
                  <strong>Note:</strong> Fee will be automatically split:
                </p>
                <ul className="mt-1 text-blue-600 dark:text-blue-400 text-xs space-y-0.5">
                  <li>• 70% → Teacher's Unverified Balance</li>
                  <li>• 30% → Academy's Unverified Balance</li>
                </ul>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={closeFeeModal}>
                  Cancel
                </Button>
                <Button
                  onClick={submitFeeCollection}
                  disabled={
                    !feeAmount ||
                    parseFloat(feeAmount) <= 0 ||
                    collectFeeMutation.isPending
                  }
                >
                  {collectFeeMutation.isPending ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="mr-2 h-4 w-4" />
                      Collect Fee
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PDF Receipt is now generated programmatically - no hidden DOM template needed */}

      {/* Credential Modal */}
      <Dialog
        open={isCredentialModalOpen}
        onOpenChange={setIsCredentialModalOpen}
      >
        <DialogContent className="sm:max-w-[440px] overflow-hidden p-0">
          <div className="bg-gradient-to-br from-amber-50 to-white p-6 text-center border-b border-amber-100">
            <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <KeyRound className="h-7 w-7" />
            </div>
            <DialogTitle className="text-lg font-bold text-gray-900">
              Student Credentials
            </DialogTitle>
            <DialogDescription className="text-gray-500 mt-1 text-sm">
              {credentialStudent?.studentName} — Login details for Student
              Portal
            </DialogDescription>
          </div>

          <div className="p-6 space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Username
              </Label>
              <div className="flex">
                <div className="flex-1 px-4 py-2.5 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg font-mono text-sm text-gray-700">
                  {credentialStudent?.barcodeId || credentialStudent?.studentId || "N/A"}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-l-none border border-l-0 border-gray-200 h-auto"
                  onClick={() =>
                    copyCredential(
                      credentialStudent?.barcodeId || credentialStudent?.studentId || "",
                      "username",
                    )
                  }
                >
                  {copiedCredField === "username" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Password
              </Label>
              <div className="flex">
                <div className="flex-1 px-4 py-2.5 bg-amber-50 border border-r-0 border-amber-100 rounded-l-lg font-mono text-sm text-amber-900">
                  {credentialStudent?.plainPassword
                    ? showPassword
                      ? credentialStudent.plainPassword
                      : "••••••••"
                    : "Not Available"}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-none border-y border-amber-200 bg-amber-50 hover:bg-amber-100 h-auto"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-amber-700" />
                  ) : (
                    <Eye className="h-4 w-4 text-amber-700" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-l-none border border-l-0 border-amber-200 bg-amber-50 hover:bg-amber-100 h-auto"
                  onClick={() =>
                    copyCredential(
                      credentialStudent?.plainPassword || "",
                      "password",
                    )
                  }
                >
                  {copiedCredField === "password" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-amber-700" />
                  )}
                </Button>
              </div>
            </div>

            {/* Reset Password */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Reset Password
              </Label>
              {resetSuccess ? (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700 font-medium">Password updated successfully!</span>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Enter new password (min 6 chars)"
                    value={resetPasswordValue}
                    onChange={(e: any) => setResetPasswordValue(e.target.value)}
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={handleResetStudentPassword}
                    disabled={isResettingPassword || resetPasswordValue.length < 6}
                    className="bg-amber-600 hover:bg-amber-700 text-white h-auto px-4"
                  >
                    {isResettingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset"}
                  </Button>
                </div>
              )}
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Role
              </Label>
              <div className="px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-lg text-sm font-medium text-blue-700">
                Student
              </div>
            </div>
          </div>

          <div className="p-6 pt-0 flex gap-3">
            <Button
              variant="outline"
              onClick={handlePrintLoginSlip}
              className="flex-1"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Login Slip
            </Button>
            <Button
              onClick={() => setIsCredentialModalOpen(false)}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Students;
