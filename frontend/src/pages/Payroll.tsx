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
  Filter,
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

  // Manual Credit State
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditNote, setCreditNote] = useState("");

  // Filter State
  const [sessionFilter, setSessionFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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

  // Redirect non-owners
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

  // Fetch payroll dashboard data
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
  });

  const payTeacherMutation = useMutation({
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

  // Manual Credit Mutation
  const manualCreditMutation = useMutation({
    mutationFn: async ({ teacherId, amount, description }: any) => {
      const res = await fetch(`${API_BASE_URL}/payroll/credit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ teacherId, amount, description }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to credit teacher");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Credit Added",
        description: data.message,
      });
      setCreditDialogOpen(false);
      setSelectedTeacher(null);
      setCreditAmount("");
      setCreditNote("");
      queryClient.invalidateQueries({ queryKey: ["payroll-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "history"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Credit Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const dashboard = dashboardData?.data || {
    activeSession: null,
    totalPaidSession: 0,
    teachersWithBalances: [],
    totalTeacherLiability: 0,
  };

  const sessions = sessionsData?.data || [];
  const classes = classesData?.data || [];

  // Filter teachers based on search and filters
  const filteredTeachers = dashboard.teachersWithBalances.filter((teacher: any) => {
    // Search filter
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Liability
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    Rs. {dashboard.totalTeacherLiability.toLocaleString()}
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
                    Rs. {dashboard.totalPaidSession.toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-emerald-500" />
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
                    {dashboard.teachersWithBalances.filter(
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
          <CardContent>
            {/* Filters */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={sessionFilter} onValueChange={setSessionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Session" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sessions</SelectItem>
                  {sessions.map((session: any) => (
                    <SelectItem key={session._id} value={session._id}>
                      {session.sessionName}
                      {session.status === "active" && " (Active)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls: any) => (
                    <SelectItem key={cls._id} value={cls._id}>
                      {cls.classTitle || cls.className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    <TableHead>Teacher</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Compensation</TableHead>
                    <TableHead className="text-right">Total Earned</TableHead>
                    <TableHead className="text-right">Total Withdrawn</TableHead>
                    <TableHead className="text-right">Net Payable</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.map((teacher: any) => (
                    <TableRow key={teacher._id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {teacher.name}
                      </TableCell>
                      <TableCell className="capitalize">
                        {teacher.subject || "-"}
                      </TableCell>
                      <TableCell className="capitalize">
                        {teacher.compensation?.type || "percentage"}
                      </TableCell>
                      <TableCell className="text-right">
                        Rs. {(teacher.totalEarned || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        Rs. {(teacher.totalWithdrawn || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        Rs. {(teacher.netPayable || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setSelectedTeacher(teacher);
                              setCreditDialogOpen(true);
                            }}
                          >
                            <PlusCircle className="h-3.5 w-3.5 mr-1" />
                            Credit
                          </Button>
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
                  ))}
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
              {dashboard.teachersWithBalances.map((teacher: any) => (
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



      {/* Manual Credit Dialog */}
      <Dialog
        open={creditDialogOpen}
        onOpenChange={(open) => {
          setCreditDialogOpen(open);
          if (!open) {
            setSelectedTeacher(null);
            setCreditAmount("");
            setCreditNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Manual Credit</DialogTitle>
            <DialogDescription>
              {selectedTeacher
                ? `Credit ${selectedTeacher.name}'s balance. This records a liability (debt owed), not a cash payout.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (PKR) *</label>
              <Input
                type="number"
                placeholder="e.g. 14000"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Note / Description *</label>
              <Textarea
                placeholder="e.g. Jan Session Share, Chemistry Classes Dec..."
                value={creditNote}
                onChange={(e) => setCreditNote(e.target.value)}
              />
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <strong>Note:</strong> This will increase the teacher's payable balance.
              The amount will appear in their Payroll as owed. Use the "Pay" button
              to record actual cash payouts.
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() =>
                manualCreditMutation.mutate({
                  teacherId: selectedTeacher?._id,
                  amount: Number(creditAmount),
                  description: creditNote,
                })
              }
              disabled={
                !selectedTeacher ||
                !creditAmount ||
                Number(creditAmount) <= 0 ||
                !creditNote.trim() ||
                manualCreditMutation.isPending
              }
            >
              {manualCreditMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Crediting...
                </>
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Credit
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
