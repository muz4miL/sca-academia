import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HeaderBanner } from "@/components/dashboard/HeaderBanner";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
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
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  UserPlus,
  Loader2,
  Trash2,
  KeyRound,
  Eye as EyeIcon,
  EyeOff,
  Copy,
  CheckCircle2,
  Printer,
} from "lucide-react";
// Import the Modals and API
import { Input } from "@/components/ui/input";
import { AddTeacherModal } from "@/components/dashboard/AddTeacherModal";
import { ViewEditTeacherModal } from "@/components/dashboard/ViewEditTeacherModal";
import { DeleteTeacherDialog } from "@/components/dashboard/DeleteTeacherDialog";
import { TeacherFinanceModal } from "@/components/dashboard/TeacherFinanceModal";
import { teacherApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// Helper function to capitalize subject names
const capitalizeSubject = (subject: string) => {
  const subjectMap: Record<string, string> = {
    biology: "Biology",
    chemistry: "Chemistry",
    physics: "Physics",
    math: "Mathematics",
    english: "English",
  };
  return (
    subjectMap[subject] || subject.charAt(0).toUpperCase() + subject.slice(1)
  );
};

const Teachers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewEditModalOpen, setIsViewEditModalOpen] = useState(false);
  const [viewEditMode, setViewEditMode] = useState<"view" | "edit">("view");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFinanceModalOpen, setIsFinanceModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null);

  // Credential Modal State
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false);
  const [credentialTeacher, setCredentialTeacher] = useState<any | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedCredField, setCopiedCredField] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Fetch teachers from MongoDB using React Query
  const { data: teachersResponse, isLoading } = useQuery({
    queryKey: ["teachers"],
    queryFn: () => teacherApi.getAll(),
  });

  const teachers = (teachersResponse as any)?.data || [];
  const teacherCount = (teachersResponse as any)?.count || 0;

  // Delete mutation
  const deleteTeacherMutation = useMutation({
    mutationFn: teacherApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast({
        title: "✅ Teacher Deleted",
        description: "Teacher record has been removed successfully.",
        className: "bg-green-50 border-green-200",
      });
      setIsDeleteDialogOpen(false);
      setSelectedTeacher(null);
    },
    onError: (error: any) => {
      toast({
        title: "❌ Delete Failed",
        description: error.message || "Could not delete teacher.",
        variant: "destructive",
      });
    },
  });

  const handleView = (teacher: any) => {
    // Navigate to full Teacher Profile page
    navigate(`/teachers/${teacher._id}`);
  };

  const handleQuickView = (teacher: any) => {
    // Quick modal view (for backward compatibility)
    setSelectedTeacher(teacher);
    setViewEditMode("view");
    setIsViewEditModalOpen(true);
  };

  const handleEdit = (teacher: any) => {
    setSelectedTeacher(teacher);
    setViewEditMode("edit");
    setIsViewEditModalOpen(true);
  };

  const handleDelete = (teacher: any) => {
    setSelectedTeacher(teacher);
    setIsDeleteDialogOpen(true);
  };

  const handleWallet = (teacher: any) => {
    setSelectedTeacher(teacher);
    setIsFinanceModalOpen(true);
  };

  const confirmDelete = () => {
    if (selectedTeacher?._id) {
      deleteTeacherMutation.mutate(selectedTeacher._id);
    }
  };

  // Credential modal handlers
  const handleShowCredentials = (teacher: any) => {
    setCredentialTeacher(teacher);
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

  const handleResetPassword = async () => {
    if (!credentialTeacher || !resetPasswordValue || resetPasswordValue.length < 6) {
      toast({ title: "Invalid Password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    try {
      setIsResettingPassword(true);
      const username = credentialTeacher.username;
      const res = await fetch(`http://localhost:5000/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: username, newPassword: resetPasswordValue }),
      });
      const data = await res.json();
      if (data.success) {
        setResetSuccess(true);
        setCredentialTeacher({ ...credentialTeacher, plainPassword: resetPasswordValue });
        toast({ title: "\u2705 Password Reset", description: `Password updated for ${credentialTeacher.name}. You can now print the updated slip.`, className: "bg-green-50 border-green-200" });
      } else {
        toast({ title: "\u274c Reset Failed", description: data.message || "Failed to reset password.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "\u274c Error", description: err.message || "Server error.", variant: "destructive" });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handlePrintLoginSlip = () => {
    if (!credentialTeacher) return;
    const username = credentialTeacher.username || "N/A";
    const slipWindow = window.open("", "_blank", "width=400,height=500");
    if (slipWindow) {
      slipWindow.document.write(`
        <html>
          <head><title>Login Slip - ${credentialTeacher.name}</title>
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
            <div class="sub">Staff Login Credentials</div>
            <hr/>
            <div class="field"><div class="label">Name</div><div class="value">${credentialTeacher.name}</div></div>
            <div class="field"><div class="label">Subject</div><div class="value">${capitalizeSubject(credentialTeacher.subject || "N/A")}</div></div>
            <div class="field"><div class="label">Username</div><div class="value">${username}</div></div>
            <div class="field"><div class="label">Password</div><div class="value">${credentialTeacher.plainPassword || "Set at creation — contact admin"}</div></div>
            <div class="field"><div class="label">Role</div><div class="value">Teacher / Staff</div></div>
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
    <DashboardLayout title="Teachers">
      <HeaderBanner
        title="Teacher Management"
        subtitle={
          isLoading
            ? "Loading teachers..."
            : `Total Teachers: ${teacherCount} | ${teacherCount > 0 ? "All Active" : "No Teachers Yet"}`
        }
      >
        {/* Updated Button to match Hub Design */}
        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
          style={{ borderRadius: "0.75rem" }}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add Teacher
        </Button>
      </HeaderBanner>

      {/* Teacher Stats - Premium Grid with Dynamic Subjects */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card p-4 card-shadow animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-20 mb-2"></div>
                    <div className="h-5 bg-muted rounded w-24"></div>
                  </div>
                  <div className="h-10 w-10 bg-muted rounded-lg"></div>
                </div>
                <div className="mt-2 h-4 bg-muted rounded w-32"></div>
              </div>
            ))
          : (() => {
              // Extract unique subjects from teachers (only show subjects with teachers)
              const uniqueSubjects = Array.from(
                new Set(teachers.map((t: any) => t.subject).filter(Boolean)),
              );

              // Capitalize subject names properly
              const formatSubjectName = (subject: string) => {
                const subjectMap: Record<string, string> = {
                  biology: "Biology",
                  chemistry: "Chemistry",
                  physics: "Physics",
                  math: "Mathematics",
                  english: "English",
                };
                return (
                  subjectMap[subject] ||
                  subject.charAt(0).toUpperCase() + subject.slice(1)
                );
              };

              return uniqueSubjects.map((subjectKey: string) => {
                const teacher = teachers.find(
                  (t: any) => t.subject === subjectKey,
                );
                const displayName = formatSubjectName(subjectKey);

                return (
                  <div
                    key={subjectKey}
                    className="rounded-xl border border-border bg-card p-4 card-shadow"
                    style={{ borderRadius: "0.75rem" }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {displayName}
                        </p>
                        <p className="text-lg font-semibold text-foreground">
                          {teacher ? teacher.name.split(" ").slice(-1) : "—"}
                        </p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light">
                        <span className="text-lg font-bold text-primary">
                          {teacher ? "✓" : "—"}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {teacher ? (
                        <span className="text-xs font-medium text-foreground">
                          {teacher.status === "active" ? "Active" : "Inactive"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          No teacher assigned
                        </span>
                      )}
                    </p>
                  </div>
                );
              });
            })()}
      </div>

      {/* Teachers Table */}
      <div className="mt-6 rounded-xl border border-border bg-card card-shadow overflow-hidden">
        {isLoading ? (
          // Loading State
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">
              Loading teachers...
            </span>
          </div>
        ) : teachers.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary-light">
              <UserPlus className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No Teachers Found
            </h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Get started by adding your first teacher to the system. They will
              appear here once registered.
            </p>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
              style={{ borderRadius: "0.75rem" }}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add Your First Teacher
            </Button>
          </div>
        ) : (
          // Table with Data
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary hover:bg-secondary">
                <TableHead className="font-semibold">Teacher</TableHead>
                <TableHead className="font-semibold">Subject</TableHead>
                <TableHead className="font-semibold">Contact</TableHead>
                <TableHead className="font-semibold">Joining Date</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map((teacher: any) => (
                <TableRow key={teacher._id} className="hover:bg-secondary/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {teacher.profileImage ? (
                        <img
                          src={teacher.profileImage}
                          alt={teacher.name}
                          className="h-9 w-9 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success text-success-foreground font-medium">
                          {teacher.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p
                          className="font-medium text-foreground hover:text-primary hover:underline cursor-pointer transition-colors"
                          onClick={() => handleView(teacher)}
                        >
                          {teacher.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {teacher.phone}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="rounded-full bg-primary-light px-3 py-1 text-sm font-medium text-primary">
                      {capitalizeSubject(teacher.subject)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                      </svg>
                      {teacher.phone}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {new Date(teacher.joiningDate).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        },
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={teacher.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {/* Credentials Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-amber-50 hover:text-amber-600"
                        onClick={() => handleShowCredentials(teacher)}
                        title="View Credentials"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>

                      {/* View Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                        onClick={() => handleView(teacher)}
                        title="View Details"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      </Button>

                      {/* Edit Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                        onClick={() => handleEdit(teacher)}
                        title="Edit Teacher"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </Button>

                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDelete(teacher)}
                        title="Delete Teacher"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modals */}
      <AddTeacherModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        defaultMode="percentage"
        defaultTeacherShare="70"
        defaultAcademyShare="30"
        defaultFixedSalary=""
      />

      <ViewEditTeacherModal
        open={isViewEditModalOpen}
        onOpenChange={setIsViewEditModalOpen}
        teacher={selectedTeacher}
        mode={viewEditMode}
      />

      <DeleteTeacherDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDelete}
        teacherName={selectedTeacher?.name || ""}
        isDeleting={deleteTeacherMutation.isPending}
      />

      <TeacherFinanceModal
        open={isFinanceModalOpen}
        onOpenChange={setIsFinanceModalOpen}
        teacher={selectedTeacher}
      />

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
              Teacher Credentials
            </DialogTitle>
            <DialogDescription className="text-gray-500 mt-1 text-sm">
              {credentialTeacher?.name} — Staff login details
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
                  {credentialTeacher?.username || "N/A"}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-l-none border border-l-0 border-gray-200 h-auto"
                  onClick={() =>
                    copyCredential(
                      credentialTeacher?.username || "",
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
                  {credentialTeacher?.plainPassword
                    ? showPassword
                      ? credentialTeacher.plainPassword
                      : "••••••••"
                    : "Set at creation"}
                </div>
                {credentialTeacher?.plainPassword && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="rounded-none border-y border-amber-200 bg-amber-50 hover:bg-amber-100 h-auto"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-amber-700" />
                      ) : (
                        <EyeIcon className="h-4 w-4 text-amber-700" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="rounded-l-none border border-l-0 border-amber-200 bg-amber-50 hover:bg-amber-100 h-auto"
                      onClick={() =>
                        copyCredential(
                          credentialTeacher?.plainPassword || "",
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
                  </>
                )}
                {!credentialTeacher?.plainPassword && (
                  <div className="px-3 py-2.5 bg-gray-100 border border-l-0 border-gray-200 rounded-r-lg">
                    <span className="text-xs text-gray-400">N/A</span>
                  </div>
                )}
              </div>
              {!credentialTeacher?.plainPassword && (
                <p className="text-xs text-amber-600">
                  Password was shown once at creation time. Contact admin to
                  reset.
                </p>
              )}
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
                    onChange={(e) => setResetPasswordValue(e.target.value)}
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={handleResetPassword}
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
                Teacher / Staff
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

export default Teachers;
