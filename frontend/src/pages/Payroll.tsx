import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pdf } from "@react-pdf/renderer";
import {
  Banknote,
  Users,
  TrendingUp,
  AlertCircle,
  Loader2,
  PlusCircle,
  Search,
  ChevronDown,
  ChevronRight,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TeacherPaymentPDF,
  type TeacherPaymentPDFData,
} from "@/components/print/TeacherPaymentPDF";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Payroll() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payNotes, setPayNotes] = useState("");

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");

  // Expanded teacher breakdown rows
  const [expandedTeachers, setExpandedTeachers] = useState<Set<string>>(new Set());

  // Logo cache for PDF
  const [cachedLogo, setCachedLogo] = useState<string | null>(null);

  const loadLogo = useCallback(async (): Promise<string> => {
    if (cachedLogo) return cachedLogo;
    try {
      const response = await fetch("/logo.png");
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const url = reader.result as string;
          setCachedLogo(url);
          resolve(url);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return "";
    }
  }, [cachedLogo]);

  const generatePaymentPDF = useCallback(
    async (data: TeacherPaymentPDFData) => {
      try {
        const logoUrl = await loadLogo();
        const pdfDoc = <TeacherPaymentPDF data={data} logoDataUrl={logoUrl} />;
        const blob = await pdf(pdfDoc).toBlob();
        const pdfUrl = URL.createObjectURL(blob);
        const newTab = window.open(pdfUrl, "_blank");

        if (!newTab) {
          // Fallback: download if popup blocked
          const link = document.createElement("a");
          link.href = pdfUrl;
          link.download = `Payment-${data.voucherId}.pdf`;
          link.click();
        }

        setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);
      } catch (error) {
        console.error("Error generating payment PDF:", error);
      }
    },
    [loadLogo],
  );

  // Fetch payroll dashboard data - hooks must be before any conditional returns
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["payroll-dashboard"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/payroll/dashboard`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch payroll data");
      return res.json();
    },
  });

  // Fetch real-time earnings breakdown (from enrollment data)
  const { data: earningsData, isLoading: earningsLoading, refetch: refetchEarnings } = useQuery({
    queryKey: ["payroll-earnings-breakdown"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/payroll/earnings-breakdown`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch earnings breakdown");
      return res.json();
    },
  });

  // Fetch sessions for filter
  const { data: sessionsData } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/sessions`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
    enabled: false,
  });

  // Fetch classes for filter
  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/classes`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch classes");
      return res.json();
    },
    enabled: false,
  });

  const payTeacherMutation= useMutation({
    mutationFn: async ({ teacherId, amount, notes }: any) => {
      const res = await fetch(`${API_BASE_URL}/finance/teacher-payout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ teacherId, amount, notes }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to process payout");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Payout Processed",
        description: data.message,
      });
      if (data?.data?.voucher) {
        const receiptData: TeacherPaymentPDFData = {
          voucherId: data.data.voucher.voucherId,
          teacherName: data.data.voucher.teacherName,
          subject: data.data.voucher.subject,
          amountPaid: data.data.voucher.amountPaid,
          remainingBalance: data.data.remainingBalance || 0,
          paymentDate: new Date(data.data.voucher.paymentDate),
          description: data.data.voucher.notes || "Teacher payout",
          sessionName: data.data.voucher.sessionName || "N/A",
          compensationType: selectedTeacher?.compensation?.type || "percentage",
        };
        generatePaymentPDF(receiptData);
      }
      setPayDialogOpen(false);
      setSelectedTeacher(null);
      setPayAmount("");
      setPayNotes("");
      queryClient.invalidateQueries({ queryKey: ["payroll-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "history"] });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("notifications:refresh"));
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Payout Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });


  // Redirect non-owners (AFTER all hooks to avoid React hooks order violation)
  if (user?.role !== "OWNER") {
    return (
      <DashboardLayout title="Payroll">
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <AlertCircle className="h-16 w-16 text-red-500" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">
            Only the Owner can access the Payroll dashboard.
          </p>
          <Button onClick={() => navigate("/")}>Go to Dashboard</Button>
        </div>
      </DashboardLayout>
    );
  }

  const dashboard = dashboardData?.data || {};
  const totalTeacherLiability = dashboard.totalTeacherLiability || 0;
  const totalPaidSession = dashboard.totalPaidSession || 0;
  const teachersWithBalances = dashboard.teachersWithBalances || [];

  const earningsTeachers = earningsData?.data?.teachers || [];
  const totalAcademyPool = earningsData?.data?.totalAcademyPool || 0;

  // Build earnings lookup by teacherId
  const earningsMap = new Map(
    earningsTeachers.map((t: any) => [t.teacherId?.toString(), t])
  );

  // Toggle expanded breakdown row
  const toggleExpanded = (teacherId: string) => {
    setExpandedTeachers((prev) => {
      const next = new Set(prev);
      if (next.has(teacherId)) next.delete(teacherId);
      else next.add(teacherId);
      return next;
    });
  };

  // Filter teachers based on search
  const filteredTeachers = teachersWithBalances.filter((teacher: any) => {
    if (searchQuery && !teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !teacher.subject?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <DashboardLayout title="Payroll Management">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Payroll Management">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Liability
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    Rs. {totalTeacherLiability.toLocaleString()}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Paid This Session
                  </p>
                  <p className="text-2xl font-bold text-emerald-600">
                    Rs. {totalPaidSession.toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Academy Pool
                  </p>
                  <p className="text-2xl font-bold text-amber-600">
                    Rs. {totalAcademyPool.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">from active enrollments</p>
                </div>
                <Banknote className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Teachers With Payable
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    {teachersWithBalances.filter(
                      (t: any) => (t.netPayable || 0) > 0,
                    ).length}
                  </p>
                </div>
                <Banknote className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Teachers Payroll
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {/* Filters */}
            <div className="mb-6">
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {filteredTeachers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No teachers found matching filters</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary/5">
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Compensation</TableHead>
                    <TableHead className="text-right">Calculated Earning</TableHead>
                    <TableHead className="text-right">Total Earned</TableHead>
                    <TableHead className="text-right">Net Payable</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.map((teacher: any) => {
                    const earnings = earningsMap.get(teacher._id?.toString());
                    const isExpanded = expandedTeachers.has(teacher._id?.toString());
                    return (
                      <>
                        <TableRow key={teacher._id} className="hover:bg-muted/50">
                          <TableCell>
                            {earnings?.breakdown?.length > 0 && (
                              <button
                                onClick={() => toggleExpanded(teacher._id?.toString())}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {teacher.name}
                          </TableCell>
                          <TableCell className="capitalize">
                            {teacher.subject || "-"}
                          </TableCell>
                          <TableCell className="capitalize">
                            {(() => {
                              const bd = earnings?.breakdown || [];
                              const hasFixedRate = bd.some((b: any) => b.isFixedRate);
                              const hasPercentage = bd.some((b: any) => !b.isFixedRate && b.calculatedEarning > 0) ||
                                (!bd.some((b: any) => b.isFixedRate) && bd.some((b: any) => !b.isFixedRate));
                              const baseType = teacher.compensation?.type || "percentage";
                              const shareVal = teacher.compensation?.teacherShare || teacher.compensation?.profitShare || 70;
                              return (
                                <div className="flex flex-wrap gap-1">
                                  {(hasPercentage || (!hasFixedRate && baseType !== "fixed")) && baseType !== "fixed" && (
                                    <Badge variant="outline" className="text-xs">
                                      {baseType === "hybrid" ? "hybrid" : "percentage"}
                                      {` (${shareVal}%)`}
                                    </Badge>
                                  )}
                                  {hasFixedRate && (
                                    <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">
                                      {bd.find((b: any) => b.isFixedRate)?.ratePerStudent
                                        ? `Rs. ${(bd.find((b: any) => b.isFixedRate)?.ratePerStudent).toLocaleString()}/student`
                                        : "fixed/student"}
                                    </Badge>
                                  )}
                                  {baseType === "fixed" && (
                                    <Badge variant="outline" className="text-xs">
                                      fixed salary
                                    </Badge>
                                  )}
                                </div>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-right">
                            {earningsLoading ? (
                              <Skeleton className="h-4 w-20 ml-auto" />
                            ) : earnings ? (
                              <span className="font-semibold text-blue-600">
                                Rs. {(earnings.calculatedEarning || 0).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            Rs. {(teacher.totalEarned || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            Rs. {(teacher.netPayable || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                  setSelectedTeacher(teacher);
                                  setPayDialogOpen(true);
                                }}
                                disabled={(teacher.netPayable || 0) <= 0}
                              >
                                Pay
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {/* Expandable Earnings Breakdown */}
                        {isExpanded && earnings?.breakdown?.length > 0 && (
                          <TableRow key={`${teacher._id}-breakdown`} className="bg-blue-50/50">
                            <TableCell colSpan={8} className="py-0">
                              <div className="p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <Calculator className="h-4 w-4 text-blue-600" />
                                  <span className="font-medium text-sm text-blue-700">
                                    Earnings Calculation Breakdown — {teacher.name}
                                  </span>
                                  {earnings.compensationType === "hybrid" && earnings.baseSalary > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      + Rs. {earnings.baseSalary.toLocaleString()} base salary
                                    </Badge>
                                  )}
                                </div>
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-muted-foreground border-b">
                                      <th className="text-left pb-1 font-medium">Class</th>
                                      <th className="text-left pb-1 font-medium">Subject(s)</th>
                                      <th className="text-center pb-1 font-medium">Students</th>
                                      <th className="text-right pb-1 font-medium">Fee/Student</th>
                                      <th className="text-right pb-1 font-medium">Total Revenue</th>
                                      <th className="text-right pb-1 font-medium">Share %</th>
                                      <th className="text-right pb-1 font-medium text-blue-700">Teacher Earning</th>
                                      <th className="text-right pb-1 font-medium text-amber-600">Academy Share</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {earnings.breakdown.map((row: any, idx: number) => (
                                      <tr key={idx} className="border-b border-dashed last:border-0">
                                        <td className="py-1.5">
                                          <span className="font-medium">{row.classTitle}</span>
                                          {row.gradeLevel && (
                                            <span className="text-muted-foreground ml-1 text-xs">({row.gradeLevel})</span>
                                          )}
                                          {row.isMultiTeacher && (
                                            <Badge variant="outline" className="ml-1 text-xs py-0">Multi-Teacher</Badge>
                                          )}
                                          {row.isFixedRate && (
                                            <Badge variant="outline" className="ml-1 text-xs py-0 border-orange-300 text-orange-600">
                                              FIXED RATE
                                            </Badge>
                                          )}
                                        </td>
                                        <td className="py-1.5 text-muted-foreground max-w-[200px] truncate">
                                          {row.subject}
                                        </td>
                                        <td className="py-1.5 text-center">{row.studentCount}</td>
                                        <td className="py-1.5 text-right">
                                          {row.isFixedRate ? (
                                            <span className="text-orange-600">Rs. {(row.ratePerStudent || 0).toLocaleString()}/student</span>
                                          ) : (
                                            <>Rs. {(row.subjectFee || 0).toLocaleString()}</>
                                          )}
                                        </td>
                                        <td className="py-1.5 text-right">Rs. {(row.subjectRevenue || 0).toLocaleString()}</td>
                                        <td className="py-1.5 text-right">
                                          {row.isFixedRate ? (
                                            <span className="text-orange-600 font-semibold">FIXED</span>
                                          ) : (
                                            <>{row.teacherSharePct}%</>
                                          )}
                                        </td>
                                        <td className="py-1.5 text-right font-semibold text-blue-600">
                                          Rs. {(row.calculatedEarning || 0).toLocaleString()}
                                        </td>
                                        <td className="py-1.5 text-right font-semibold text-amber-600">
                                          Rs. {(row.academyShare || 0).toLocaleString()}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr className="border-t-2 font-semibold">
                                      <td colSpan={6} className="pt-2 text-right text-sm">
                                        Total Calculated Earning:
                                      </td>
                                      <td className="pt-2 text-right text-blue-700">
                                        Rs. {(earnings.calculatedEarning || 0).toLocaleString()}
                                      </td>
                                      <td className="pt-2 text-right text-amber-600">
                                        Rs. {(earnings.totalAcademyShare || 0).toLocaleString()}
                                      </td>
                                    </tr>
                                    {teacher.netPayable > 0 && (
                                      <tr>
                                        <td colSpan={6} className="pt-0.5 text-right text-xs text-muted-foreground">
                                          Already in Pending Balance:
                                        </td>
                                        <td className="pt-0.5 text-right text-xs text-muted-foreground">
                                          Rs. {(earnings.alreadyCredited || 0).toLocaleString()}
                                        </td>
                                        <td></td>
                                      </tr>
                                    )}
                                  </tfoot>
                                </table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Teacher Profiles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teachersWithBalances.map((teacher: any) => (
                <div
                  key={teacher._id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/teachers/${teacher._id}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{teacher.name}</span>
                    <Badge className="capitalize">{teacher.subject}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Payable</span>
                    <span className="font-semibold text-green-600">
                      Rs. {(teacher.netPayable || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pay Teacher Dialog */}
      <Dialog
        open={payDialogOpen}
        onOpenChange={(open) => {
          setPayDialogOpen(open);
          if (!open) {
            setSelectedTeacher(null);
            setPayAmount("");
            setPayNotes("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay Teacher</DialogTitle>
            <DialogDescription>
              {selectedTeacher
                ? `Pay ${selectedTeacher.name} (Available: Rs. ${(selectedTeacher.netPayable || 0).toLocaleString()})`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (PKR)</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Textarea
                placeholder="Cash payment, bank transfer, etc."
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPayDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() =>
                payTeacherMutation.mutate({
                  teacherId: selectedTeacher?._id,
                  amount: Number(payAmount),
                  notes: payNotes,
                })
              }
              disabled={
                !selectedTeacher ||
                !payAmount ||
                Number(payAmount) <= 0 ||
                Number(payAmount) > (selectedTeacher.netPayable || 0) ||
                payTeacherMutation.isPending
              }
            >
              {payTeacherMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Pay Now"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}