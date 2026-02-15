import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  AlertCircle,
  ClipboardCheck,
  CalendarDays,
  Loader2,
  Search,
  RefreshCw,
  Download,
  CheckCircle2,
  XCircle,
  Filter,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// API Base URL
const getApiBaseUrl = () => {
  if (
    typeof window !== "undefined" &&
    window.location.hostname.includes(".app.github.dev")
  ) {
    const hostname = window.location.hostname;
    const codespaceBase = hostname.replace(/-\d+\.app\.github\.dev$/, "");
    return `https://${codespaceBase}-5000.app.github.dev/api`;
  }
  return "http://localhost:5000/api";
};
const API_BASE_URL = getApiBaseUrl();

// Types
interface AttendanceRecord {
  _id: string;
  student: {
    _id: string;
    studentName: string;
    studentId: string;
    class: string;
    group?: string;
    photo?: string;
    imageUrl?: string;
    feeStatus?: string;
  };
  studentId: string;
  studentName: string;
  class: string;
  date: string;
  status: "Present" | "Absent" | "Late" | "Excused";
  checkInTime?: string;
  checkOutTime?: string;
  markedBy: "Gatekeeper" | "Admin" | "System";
  notes?: string;
}

interface AttendanceStats {
  total: number;
  present: number;
  late: number;
  excused: number;
  absent: number;
  attendanceRate: number;
}

interface ClassOption {
  _id: string;
  classTitle?: string;
  className?: string;
}

// Status color mapping
const statusColors: Record<string, string> = {
  Present: "bg-green-100 text-green-800 border-green-200",
  Absent: "bg-red-100 text-red-800 border-red-200",
  Late: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Excused: "bg-blue-100 text-blue-800 border-blue-200",
};

const statusIcons: Record<string, React.ReactNode> = {
  Present: <CheckCircle2 className="w-4 h-4 text-green-600" />,
  Absent: <XCircle className="w-4 h-4 text-red-600" />,
  Late: <Clock className="w-4 h-4 text-yellow-600" />,
  Excused: <AlertCircle className="w-4 h-4 text-blue-600" />,
};

export default function Attendance() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    total: 0,
    present: 0,
    late: 0,
    excused: 0,
    absent: 0,
    attendanceRate: 0,
  });
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classFilter, setClassFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [markAbsentLoading, setMarkAbsentLoading] = useState(false);
  const [studentDetailDialog, setStudentDetailDialog] = useState(false);
  const [studentHistory, setStudentHistory] = useState<any>(null);
  const [studentHistoryLoading, setStudentHistoryLoading] = useState(false);

  // Date states for range view
  const [viewMode, setViewMode] = useState<"today" | "range" | "student">("today");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [rangeRecords, setRangeRecords] = useState<AttendanceRecord[]>([]);
  const [rangeSummary, setRangeSummary] = useState<Record<string, any>>({});

  // Fetch classes for filter dropdown
  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/classes`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setClasses(data.classes);
      }
    } catch (err) {
      console.error("Failed to fetch classes:", err);
    }
  }, []);

  // Fetch today's attendance
  const fetchTodayAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const url = `${API_BASE_URL}/attendance/today${classFilter !== "all" ? `?classFilter=${classFilter}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setRecords(data.records);
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch attendance:", err);
      toast({
        title: "Error",
        description: "Failed to fetch attendance data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [classFilter]);

  // Fetch date range attendance
  const fetchRangeAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const url = `${API_BASE_URL}/attendance/range?from=${dateFrom}&to=${dateTo}${classFilter !== "all" ? `&classFilter=${classFilter}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setRangeRecords(data.records);
        setRangeSummary(data.dailySummary);
      }
    } catch (err) {
      console.error("Failed to fetch range:", err);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, classFilter]);

  // Fetch student attendance history
  const fetchStudentHistory = async (studentId: string) => {
    setStudentHistoryLoading(true);
    setStudentDetailDialog(true);
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/student/${studentId}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setStudentHistory(data);
      }
    } catch (err) {
      console.error("Failed to fetch student history:", err);
    } finally {
      setStudentHistoryLoading(false);
    }
  };

  // Mark absentees
  const handleMarkAbsentees = async () => {
    setMarkAbsentLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/mark-absent`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classFilter: classFilter !== "all" ? classFilter : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: "Absentees Marked",
          description: `${data.markedCount} students marked as absent. ${data.alreadyCheckedIn} already checked in.`,
        });
        fetchTodayAttendance();
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to mark absentees",
        variant: "destructive",
      });
    } finally {
      setMarkAbsentLoading(false);
    }
  };

  // Update attendance status
  const handleUpdateStatus = async (recordId: string, newStatus: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/${recordId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Updated", description: data.message });
        fetchTodayAttendance();
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    if (viewMode === "today") {
      fetchTodayAttendance();
    } else if (viewMode === "range") {
      fetchRangeAttendance();
    }
  }, [viewMode, fetchTodayAttendance, fetchRangeAttendance]);

  // Auto-refresh every 30 seconds for today view
  useEffect(() => {
    if (viewMode !== "today") return;
    const interval = setInterval(fetchTodayAttendance, 30000);
    return () => clearInterval(interval);
  }, [viewMode, fetchTodayAttendance]);

  // Filter records by search query
  const filteredRecords = records.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.studentName?.toLowerCase().includes(q) ||
      r.studentId?.toLowerCase().includes(q) ||
      r.class?.toLowerCase().includes(q)
    );
  });

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return "—";
    return new Date(timeStr).toLocaleTimeString("en-PK", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Karachi",
    });
  };

  return (
    <DashboardLayout title="Attendance Management">
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardCheck className="w-7 h-7 text-primary" />
              Attendance Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track student attendance — auto-marked via Gatekeeper or manually
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-muted rounded-lg p-1">
              <button
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === "today"
                    ? "bg-white text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setViewMode("today")}
              >
                Today
              </button>
              <button
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === "range"
                    ? "bg-white text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setViewMode("range")}
              >
                Date Range
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => viewMode === "today" ? fetchTodayAttendance() : fetchRangeAttendance()}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards — Today View Only */}
        {viewMode === "today" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-5 gap-4"
          >
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Students</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <UserCheck className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Present</p>
                    <p className="text-2xl font-bold text-green-600">{stats.present}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-yellow-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Late</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <UserX className="w-8 h-8 text-red-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Absent</p>
                    <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <ClipboardCheck className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Rate</p>
                    <p className="text-2xl font-bold text-primary">{stats.attendanceRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Filters & Actions Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 w-full md:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ID, or class..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Class Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c._id} value={c.classTitle || c.className || c._id}>
                        {c.classTitle || c.className}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date range pickers (range mode) */}
              {viewMode === "range" && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-[150px]"
                  />
                  <span className="text-sm text-muted-foreground">to</span>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-[150px]"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 ml-auto">
                {viewMode === "today" && (user?.role === "OWNER" || user?.role === "ADMIN") && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleMarkAbsentees}
                    disabled={markAbsentLoading}
                  >
                    {markAbsentLoading ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <UserX className="w-4 h-4 mr-1" />
                    )}
                    Mark Absentees
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        {loading ? (
          <Card>
            <CardContent className="p-12 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Loading attendance data...</span>
            </CardContent>
          </Card>
        ) : viewMode === "today" ? (
          /* Today's Attendance Table */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" />
                  Today's Attendance
                  <Badge variant="secondary" className="ml-2">
                    {new Date().toLocaleDateString("en-PK", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {filteredRecords.length} record{filteredRecords.length !== 1 ? "s" : ""} found
                  {searchQuery && ` matching "${searchQuery}"`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredRecords.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">No attendance records yet</p>
                    <p className="text-sm">
                      Students will appear here as they scan at the Gatekeeper station
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>ID</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Check In</TableHead>
                          <TableHead>Marked By</TableHead>
                          {(user?.role === "OWNER" || user?.role === "ADMIN") && (
                            <TableHead className="text-right">Actions</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {filteredRecords.map((record, index) => (
                            <motion.tr
                              key={record._id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.02 }}
                              className="group hover:bg-muted/30 transition-colors"
                            >
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {index + 1}
                              </TableCell>
                              <TableCell>
                                <button
                                  className="font-medium text-left hover:text-primary transition-colors hover:underline"
                                  onClick={() =>
                                    fetchStudentHistory(
                                      record.student?._id || record.studentId
                                    )
                                  }
                                >
                                  {record.studentName}
                                </button>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {record.studentId}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{record.class}</Badge>
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                    statusColors[record.status]
                                  }`}
                                >
                                  {statusIcons[record.status]}
                                  {record.status}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm">
                                {formatTime(record.checkInTime)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {record.markedBy}
                                </Badge>
                              </TableCell>
                              {(user?.role === "OWNER" ||
                                user?.role === "ADMIN") && (
                                <TableCell className="text-right">
                                  <Select
                                    value={record.status}
                                    onValueChange={(val) =>
                                      handleUpdateStatus(record._id, val)
                                    }
                                  >
                                    <SelectTrigger className="w-[100px] h-7 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Present">
                                        Present
                                      </SelectItem>
                                      <SelectItem value="Absent">
                                        Absent
                                      </SelectItem>
                                      <SelectItem value="Late">Late</SelectItem>
                                      <SelectItem value="Excused">
                                        Excused
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                              )}
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          /* Date Range View */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" />
                  Attendance Report
                  <Badge variant="secondary" className="ml-2">
                    {dateFrom} to {dateTo}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {rangeRecords.length} total records across{" "}
                  {Object.keys(rangeSummary).length} day(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Daily Summary Cards */}
                {Object.keys(rangeSummary).length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
                    {Object.entries(rangeSummary)
                      .sort(([a], [b]) => b.localeCompare(a))
                      .map(([date, summary]: [string, any]) => (
                        <div
                          key={date}
                          className="border rounded-lg p-3 text-center hover:bg-muted/30 transition-colors"
                        >
                          <p className="text-xs text-muted-foreground font-medium">
                            {new Date(date + "T00:00:00").toLocaleDateString("en-PK", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          <p className="text-lg font-bold text-green-600">
                            {summary.present}
                            <span className="text-xs text-muted-foreground font-normal">
                              /{summary.total}
                            </span>
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {summary.total > 0
                              ? Math.round((summary.present / summary.total) * 100)
                              : 0}
                            % present
                          </p>
                        </div>
                      ))}
                  </div>
                )}

                {/* Range Records Table */}
                {rangeRecords.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No records found for this date range</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 sticky top-0">
                          <TableHead>Date</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>ID</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Check In</TableHead>
                          <TableHead>Marked By</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rangeRecords.map((record) => (
                          <TableRow key={record._id} className="hover:bg-muted/30">
                            <TableCell className="text-sm">
                              {new Date(record.date).toLocaleDateString("en-PK", {
                                month: "short",
                                day: "numeric",
                              })}
                            </TableCell>
                            <TableCell className="font-medium">
                              {record.studentName}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {record.studentId}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{record.class}</Badge>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                                  statusColors[record.status]
                                }`}
                              >
                                {record.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatTime(record.checkInTime)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {record.markedBy}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Student History Dialog */}
        <Dialog open={studentDetailDialog} onOpenChange={setStudentDetailDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary" />
                Student Attendance History
              </DialogTitle>
              <DialogDescription>
                {studentHistory?.student
                  ? `${studentHistory.student.name} (${studentHistory.student.studentId}) — ${studentHistory.student.class}`
                  : "Loading..."}
              </DialogDescription>
            </DialogHeader>

            {studentHistoryLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : studentHistory ? (
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xl font-bold text-green-600">
                      {studentHistory.stats.present}
                    </p>
                    <p className="text-xs text-green-700">Present</p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <p className="text-xl font-bold text-yellow-600">
                      {studentHistory.stats.late}
                    </p>
                    <p className="text-xs text-yellow-700">Late</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <p className="text-xl font-bold text-red-600">
                      {studentHistory.stats.absent}
                    </p>
                    <p className="text-xs text-red-700">Absent</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-xl font-bold text-blue-600">
                      {studentHistory.stats.attendanceRate}%
                    </p>
                    <p className="text-xs text-blue-700">Rate</p>
                  </div>
                </div>

                {/* Recent Records */}
                <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 sticky top-0">
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentHistory.records.map((r: any) => (
                        <TableRow key={r._id}>
                          <TableCell className="text-sm">
                            {new Date(r.date).toLocaleDateString("en-PK", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                                statusColors[r.status as keyof typeof statusColors]
                              }`}
                            >
                              {r.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatTime(r.checkInTime)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {r.markedBy}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No data available</p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStudentDetailDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
