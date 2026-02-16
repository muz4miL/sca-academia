/**
 * Student Portal - "Luxury Academic" Premium Edition
 *
 * Prestigious Gold/Bronze Theme with Warm Glass Aesthetic
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  GraduationCap,
  BookOpen,
  Play,
  Clock,
  CreditCard,
  User,
  LogOut,
  Loader2,
  Eye,
  Lock,
  Hourglass,
  RefreshCw,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

interface StudentProfile {
  _id: string;
  studentId: string;
  barcodeId: string;
  name: string;
  fatherName: string;
  class: string;
  group: string;
  subjects: Array<{ name: string; fee: number }>;
  photo?: string;
  email?: string;
  feeStatus: string;
  totalFee: number;
  paidAmount: number;
  balance: number;
  studentStatus: string;
  session?: { name: string; startDate: string; endDate: string };
  classRef?: any;
}

interface TimetableEntry {
  entryId: string;
  subject: string;
  day: string;
  startTime: string;
  endTime: string;
  room?: string;
  teacherId?: {
    name: string;
  };
}



// Subject color mapping with gradients
const SUBJECT_COLORS: Record<
  string,
  { gradient: string; icon: string; glow: string; border?: string }
> = {
  Biology: {
    gradient: "from-emerald-500/20 via-emerald-500/10 to-teal-500/5",
    icon: "🧬",
    glow: "shadow-emerald-500/20",
    border: "group-hover:border-emerald-500/50",
  },
  Physics: {
    gradient: "from-amber-500/10 via-amber-500/5 to-yellow-500/5",
    icon: "⚛️",
    glow: "shadow-amber-500/10",
    border: "group-hover:border-amber-500/50",
  },
  Chemistry: {
    gradient: "from-amber-500/10 via-amber-500/5 to-orange-500/5",
    icon: "🧪",
    glow: "shadow-amber-500/10",
    border: "group-hover:border-amber-500/50",
  },
  Mathematics: {
    gradient: "from-yellow-500/10 via-yellow-500/5 to-pink-500/5",
    icon: "📐",
    glow: "shadow-yellow-500/10",
    border: "group-hover:border-yellow-500/50",
  },
  English: {
    gradient: "from-cyan-500/10 via-cyan-500/5 to-blue-500/5",
    icon: "📚",
    glow: "shadow-cyan-500/10",
    border: "group-hover:border-cyan-500/50",
  },
};



export function StudentPortal() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: typeof loginForm) => {
      const res = await fetch(`${API_BASE_URL}/api/student-portal/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Login failed");
      return result;
    },
    onSuccess: (data) => {
      setIsLoggedIn(true);
      setToken(data.token);
      setProfile(data.student);
      toast.success(data.message);
    },
    onError: (error: any) => {
      toast.error(error.message || "Login failed");
    },
  });



  // Fetch student schedule/timetable from student-portal endpoint (properly authenticated)
  const { data: scheduleData } = useQuery({
    queryKey: ["student-timetable", token],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/student-portal/schedule`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch timetable");
      return res.json();
    },
    enabled: isLoggedIn && !!token,
    refetchInterval: 30000, // Auto-refresh every 30s for real-time sync
  });

  const timetable: TimetableEntry[] = scheduleData?.data || [];

  // Helper to find current/next session
  const getCurrentSession = () => {
    const now = new Date();
    const pakistanTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Karachi" }),
    );
    const currentDay = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ][pakistanTime.getDay()];
    const currentMinutes =
      pakistanTime.getHours() * 60 + pakistanTime.getMinutes();

    const parseTime = (t: string) => {
      const match = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!match) return 0;
      let h = parseInt(match[1]);
      if (match[3].toUpperCase() === "PM" && h !== 12) h += 12;
      if (match[3].toUpperCase() === "AM" && h === 12) h = 0;
      return h * 60 + parseInt(match[2]);
    };

    const todayClasses = timetable.filter((e) => e.day === currentDay);

    let current = null;
    let next = null;

    for (const entry of todayClasses) {
      const start = parseTime(entry.startTime);
      const end = parseTime(entry.endTime);

      if (currentMinutes >= start && currentMinutes <= end) {
        current = entry;
        break;
      }
      if (start > currentMinutes) {
        if (!next || start < parseTime(next.startTime)) {
          next = entry;
        }
      }
    }

    return { current, next };
  };

  const { current: currentSession, next: nextSession } = getCurrentSession();



  // Handle login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.username || !loginForm.password) {
      toast.error("Please enter username and password");
      return;
    }
    loginMutation.mutate(loginForm);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/student-portal/logout`, {
        method: "POST",
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { }
    setIsLoggedIn(false);
    setToken(null);
    setProfile(null);
    setLoginForm({ username: "", password: "" });
  };

  // Handle refresh status
  const handleRefreshStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/student-portal/me`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.student);
        if (data.student.studentStatus === "Active") {
          toast.success("Your account has been approved!");
        } else {
          toast.info("Still pending approval");
        }
      }
    } catch (error) {
      toast.error("Failed to refresh status");
    }
  };




  // LOGIN SCREEN
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-primary liquid-mesh relative overflow-hidden font-sans">
        <div className="absolute inset-0 bg-brand-primary/60 backdrop-blur-[2px]" />

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-brand-gold/5 -skew-x-12 transform origin-top-right backdrop-blur-3xl" />
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-brand-navy/30 rounded-full blur-3xl"
        />

        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 40, damping: 15 }}
          className="w-full max-w-md mx-4 relative z-10"
        >
          <div className="glass-ethereal rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.4)] overflow-hidden border-white/10">
            <div className="bg-brand-gold h-2 opacity-80" />
            <div className="p-10 md:p-12">
              <div className="text-center space-y-4 mb-10">
                <motion.div
                  whileHover={{ rotate: 10, scale: 1.1 }}
                  className="mx-auto w-20 h-20 rounded-[2rem] bg-brand-primary flex items-center justify-center shadow-2xl border border-white/10"
                >
                  <img
                    src="/logo.png"
                    alt="SCIENCES COACHING ACADEMY"
                    className="h-16 w-16 object-contain drop-shadow-[0_0_10px_rgba(180,83,9,0.3)]"
                  />
                </motion.div>
                <div>
                  <h1 className="text-4xl font-serif font-black text-white tracking-tight leading-tight">
                    Welcome Back
                  </h1>
                  <p className="text-slate-400 font-medium mt-2">
                    Sign in to your Student Portal
                  </p>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="username"
                    className="text-slate-300 text-xs font-bold uppercase tracking-[0.2em] ml-2"
                  >
                    Student / Barcode ID
                  </Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="e.g. EA-2024-001"
                      value={loginForm.username}
                      onChange={(e) =>
                        setLoginForm({ ...loginForm, username: e.target.value })
                      }
                      required
                      disabled={loginMutation.isPending}
                      className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:bg-white/10 focus:ring-brand-gold h-14 pl-12 rounded-2xl transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-slate-300 text-xs font-bold uppercase tracking-[0.2em] ml-2"
                  >
                    Portal Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) =>
                        setLoginForm({ ...loginForm, password: e.target.value })
                      }
                      required
                      disabled={loginMutation.isPending}
                      className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:bg-white/10 focus:ring-brand-gold h-14 pl-12 rounded-2xl transition-all font-bold"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="w-full h-16 bg-brand-gold hover:bg-brand-gold/90 text-white text-lg font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-2xl shadow-brand-gold/20"
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Access Portal"
                  )}
                </Button>
              </form>

              <div className="text-center mt-10 border-t border-white/5 pt-8">
                <p className="text-sm text-slate-500 font-medium">
                  New student? Contact the academy for admission.
                </p>
              </div>
            </div>
          </div>
          <p className="text-center text-[10px] text-slate-600 uppercase tracking-[0.4em] mt-8">
            Institutional Access Only • Protected by SCIENCES COACHING ACADEMY Security
          </p>
        </motion.div>
      </div>
    );
  }

  // LOADING STATE
  if (isLoggedIn && !profile) {
    return (
      <div className="min-h-screen bg-[#030711] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
      </div>
    );
  }

  // VERIFICATION PENDING SCREEN
  if (isLoggedIn && profile && profile.studentStatus !== "Active") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-primary liquid-mesh relative overflow-hidden font-sans">
        <div className="absolute inset-0 bg-brand-primary/60 backdrop-blur-[2px]" />

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-brand-gold/5 -skew-x-12 transform origin-top-right backdrop-blur-3xl" />
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-brand-navy/30 rounded-full blur-3xl"
        />

        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 40, damping: 15 }}
          className="w-full max-w-2xl mx-4 relative z-10"
        >
          <div className="glass-ethereal rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.4)] overflow-hidden border-white/10">
            <div className="bg-brand-gold h-2 opacity-80" />
            <div className="p-10 md:p-12">
              <div className="text-center space-y-8">
                <div className="mx-auto w-32 h-32 rounded-[2.5rem] bg-brand-primary/50 border border-brand-gold/30 flex items-center justify-center relative group overflow-hidden shadow-2xl">
                  {profile.photo ? (
                    <img
                      src={profile.photo}
                      alt={profile.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.studentId}`}
                      alt={profile.name}
                      className="w-full h-full object-cover opacity-80"
                    />
                  )}
                  <div className="absolute inset-0 bg-brand-gold/10 animate-pulse group-hover:animate-none transition-all pointer-events-none" />
                </div>

                <div className="space-y-4">
                  <h1 className="text-4xl md:text-5xl font-serif font-black text-white tracking-tight leading-tight">
                    Verification{" "}
                    <span className="text-brand-gold">Pending</span>
                  </h1>
                  <p className="text-slate-400 text-lg font-medium max-w-md mx-auto">
                    Your institutional access is being processed by the Office
                    of Admissions.
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center">
                      <User className="h-8 w-8 text-brand-gold" />
                    </div>
                    <div className="text-center md:text-left">
                      <h3 className="text-2xl font-serif font-bold text-white">
                        {profile.name}
                      </h3>
                      <p className="text-brand-gold/70 font-mono text-sm tracking-widest mt-1">
                        ID: {profile.barcodeId || profile.studentId}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={handleRefreshStatus}
                    className="w-full h-16 bg-brand-gold hover:bg-brand-gold/90 text-white font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-brand-gold/20"
                  >
                    <RefreshCw className="mr-3 h-5 w-5" />
                    Check Status
                  </Button>
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="w-full h-16 border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 font-black uppercase tracking-[0.2em] rounded-2xl transition-all"
                  >
                    <LogOut className="mr-3 h-5 w-5" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-[10px] text-slate-600 uppercase tracking-[0.4em] mt-8">
            Admissions Department • SCIENCES COACHING ACADEMY Executive Office
          </p>
        </motion.div>
      </div>
    );
  }

  // Calculate fee percentage (cap at 100% to prevent overpayment display issues)
  const feePercentage = profile && profile.totalFee > 0
    ? Math.min(100, Math.round((profile.paidAmount / profile.totalFee) * 100))
    : 0;

  // MAIN DASHBOARD - Clean Warm Academic Design
  return (
    <div
      className="min-h-screen bg-[#0C1222] text-white relative overflow-hidden font-sans selection:bg-brand-gold/30"
    >
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0C1222] via-[#111B2E] to-[#0C1222]" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0C1222]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08]">
              <img
                src="/logo.png"
                alt="SCA"
                className="h-9 w-auto object-contain"
              />
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-brand-gold tracking-wide">
                Student Portal
              </p>
              <p className="text-[11px] text-slate-500">
                Sciences Coaching Academy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/15">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-emerald-400">Active</span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-3 hover:bg-white/5 h-12 px-3 rounded-xl border border-transparent hover:border-white/10 transition-all"
                >
                  <div className="w-9 h-9 rounded-lg overflow-hidden ring-2 ring-brand-gold/30">
                    {profile?.photo ? (
                      <img
                        src={profile.photo.startsWith('http') ? profile.photo : `${API_BASE_URL}${profile.photo}`}
                        alt={profile.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.studentId}`}
                        alt={profile?.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold text-white leading-none">
                      {profile?.name}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {profile?.barcodeId || profile?.studentId}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-[#151D2E]/95 backdrop-blur-2xl border-white/10 rounded-xl p-1.5 shadow-2xl"
              >
                <DropdownMenuLabel className="text-slate-400 text-[10px] font-bold uppercase tracking-widest px-3 py-2">
                  Account
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem className="text-slate-200 focus:bg-white/5 focus:text-white rounded-lg py-2.5 cursor-pointer">
                  <User className="mr-3 h-4 w-4 text-slate-400" />
                  <span className="font-medium">Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-slate-200 focus:bg-white/5 focus:text-white rounded-lg py-2.5 cursor-pointer">
                  <CreditCard className="mr-3 h-4 w-4 text-slate-400" />
                  <span className="font-medium">
                    Fee: <span className="capitalize text-brand-gold">{profile?.feeStatus}</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-400 focus:bg-red-500/10 focus:text-red-400 rounded-lg py-2.5 cursor-pointer"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  <span className="font-medium">Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {/* Welcome + Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Welcome Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-2"
          >
            <div className="bg-gradient-to-br from-[#151D2E] to-[#1A2540] rounded-2xl border border-white/[0.06] p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-brand-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
              <div className="relative z-10">
                <p className="text-xs font-semibold text-brand-gold/80 uppercase tracking-widest mb-2">
                  {getGreeting()}
                </p>
                <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
                  <span className="text-white">Welcome, </span>
                  <span className="text-brand-gold">
                    {profile?.name?.split(" ")[0] || "Scholar"}
                  </span>
                </h2>
                <p className="text-slate-400 text-base max-w-xl leading-relaxed">
                  Continue your academic journey with Sciences Coaching Academy.
                </p>

                {/* Quick Info Chips */}
                <div className="flex flex-wrap gap-3 mt-6">
                  <div className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-lg px-4 py-2.5">
                    <GraduationCap className="h-4 w-4 text-brand-gold" />
                    <span className="text-sm font-medium text-slate-200">
                      {profile?.class} &middot; {profile?.group}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-lg px-4 py-2.5">
                    <BookOpen className="h-4 w-4 text-teal-400" />
                    <span className="text-sm font-medium text-slate-200">
                      {profile?.subjects?.length || 0} Subjects
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Finance Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="bg-[#151D2E] rounded-2xl border border-white/[0.06] p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Fee Status
                </h3>
                {profile?.feeStatus === "paid" ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-[10px] font-bold text-emerald-400 uppercase">Cleared</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20">
                    <Clock className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-[10px] font-bold text-amber-400 uppercase">Pending</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center my-4 relative">
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-3xl font-bold text-white">{feePercentage}%</p>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Paid</p>
                </div>
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie
                      data={[
                        { value: feePercentage },
                        { value: 100 - feePercentage },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={60}
                      paddingAngle={6}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill={profile?.feeStatus === "paid" ? "#10b981" : "#C8860A"} />
                      <Cell fill="rgba(255,255,255,0.04)" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white/[0.04] rounded-xl p-3 border border-white/[0.06] text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Balance</p>
                <p className="text-lg font-bold text-white">
                  PKR {profile?.balance?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Live Session Banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mb-8"
        >
          <div className={cn(
            "rounded-2xl border p-6 transition-all",
            currentSession
              ? "bg-emerald-500/10 border-emerald-500/20"
              : "bg-white/[0.03] border-white/[0.06]",
          )}>
            <div className="flex flex-col md:flex-row items-center gap-5">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                currentSession
                  ? "bg-emerald-500 shadow-lg shadow-emerald-500/20"
                  : "bg-brand-gold/20",
              )}>
                {currentSession ? (
                  <Play className="h-5 w-5 text-white" />
                ) : (
                  <Clock className="h-5 w-5 text-brand-gold" />
                )}
              </div>
              <div className="flex-1 text-center md:text-left">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-slate-400">
                  {currentSession ? "In Session Now" : "Up Next"}
                </p>
                {currentSession || nextSession ? (
                  <div>
                    <p className="text-xl font-bold text-white">
                      {(currentSession || nextSession)?.subject}
                      {currentSession && (
                        <span className="ml-2 px-2 py-0.5 bg-emerald-500 text-white rounded text-[10px] font-bold uppercase">
                          Live
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      {(currentSession || nextSession)?.startTime} — {(currentSession || nextSession)?.endTime}
                      <span className="mx-2 text-slate-600">|</span>
                      Room {(currentSession || nextSession)?.room || "TBA"}
                      {(currentSession || nextSession)?.teacherId?.name && (
                        <>
                          <span className="mx-2 text-slate-600">|</span>
                          {(currentSession || nextSession)?.teacherId?.name}
                        </>
                      )}
                    </p>
                  </div>
                ) : (
                  <p className="text-lg font-semibold text-slate-500">
                    No upcoming sessions scheduled
                  </p>
                )}
              </div>
              <Button
                onClick={() =>
                  document.getElementById("timetable-section")?.scrollIntoView({ behavior: "smooth" })
                }
                variant="outline"
                className="bg-white/[0.06] hover:bg-white/[0.1] border-white/[0.1] text-white font-semibold h-10 px-6 rounded-lg"
              >
                <Calendar className="mr-2 h-4 w-4" />
                View Timetable
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Profile + Timetable Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Student Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="lg:col-span-3"
          >
            <div className="bg-[#151D2E] rounded-2xl border border-white/[0.06] p-6 h-full">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-2">
                <UserCircle className="h-3.5 w-3.5" />
                Profile
              </h3>

              <div className="flex flex-col items-center mb-5">
                <div className="w-20 h-20 rounded-xl overflow-hidden ring-2 ring-brand-gold/20 mb-3">
                  {profile?.photo ? (
                    <img
                      src={profile.photo.startsWith('http') ? profile.photo : `${API_BASE_URL}${profile.photo}`}
                      alt={profile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.studentId}`}
                      alt={profile?.name}
                      className="w-full h-full object-cover bg-slate-800"
                    />
                  )}
                </div>
                <p className="text-base font-bold text-white text-center">{profile?.name}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {profile?.barcodeId || profile?.studentId}
                </p>
              </div>

              <div className="space-y-2">
                {[
                  { label: "Father", value: profile?.fatherName },
                  { label: "Session", value: profile?.session?.name || "Not Assigned" },
                  { label: "Class", value: `${profile?.class} - ${profile?.group}` },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.04]">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.label}</span>
                    <span className="text-xs font-medium text-slate-300">{item.value}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.04]">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</span>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-400">{profile?.studentStatus}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Weekly Timetable */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            id="timetable-section"
            className="lg:col-span-9"
          >
            <div className="bg-[#151D2E] rounded-2xl border border-white/[0.06] p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-brand-gold" />
                  Weekly Schedule
                </h3>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {timetable.length} session{timetable.length !== 1 ? 's' : ''} this week
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => {
                  const daySchedule = timetable.filter((s) => s.day === day);
                  const isScheduled = daySchedule.length > 0;
                  const today = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
                  const isToday = day === today;

                  return (
                    <div
                      key={day}
                      className={cn(
                        "rounded-xl p-4 transition-all min-h-[140px] relative",
                        isScheduled
                          ? "bg-white/[0.04] border border-white/[0.08]"
                          : "bg-white/[0.02] border border-white/[0.04] opacity-40",
                        isToday && "ring-2 ring-brand-gold/50 ring-offset-2 ring-offset-[#151D2E] opacity-100",
                      )}
                    >
                      <div className={cn(
                        "text-[11px] font-bold uppercase tracking-wider mb-3 flex items-center justify-between",
                        isToday ? "text-brand-gold" : isScheduled ? "text-slate-300" : "text-slate-600",
                      )}>
                        {day.substring(0, 3)}
                        {isToday && (
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" />
                        )}
                      </div>

                      {isScheduled ? (
                        <div className="space-y-3">
                          {daySchedule.map((entry, idx) => {
                            const subjectColor = SUBJECT_COLORS[entry.subject];
                            return (
                              <div key={idx} className={cn("", idx !== 0 && "pt-3 border-t border-white/[0.06]")}>
                                <p className="text-sm font-bold text-white leading-tight">
                                  {entry.subject}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium mt-1">
                                  {entry.startTime} — {entry.endTime}
                                </p>
                                {entry.teacherId?.name && (
                                  <p className="text-[10px] text-slate-500 mt-0.5">
                                    {entry.teacherId.name}
                                  </p>
                                )}
                                {entry.room && (
                                  <p className="text-[9px] text-slate-600 mt-0.5">
                                    Room {entry.room}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-20 text-center">
                          <span className="text-[10px] text-slate-600 font-medium">
                            No classes
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Subjects Grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-brand-gold" />
              Your Subjects
            </h3>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {profile?.subjects?.length || 0} Enrolled
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {profile?.subjects?.map((subject, index) => {
              const colors = SUBJECT_COLORS[subject.name] || {
                icon: "📖",
                glow: "",
                gradient: "from-slate-500/10 via-slate-500/5 to-slate-500/5",
              };
              return (
                <motion.div
                  key={subject.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ y: -2 }}
                  className="group"
                >
                  <div className="bg-[#151D2E] rounded-xl border border-white/[0.06] p-5 transition-all group-hover:border-white/[0.12] group-hover:bg-[#1A2540] h-full">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-11 h-11 rounded-lg bg-white/[0.06] flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
                        {colors.icon}
                      </div>
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-bold uppercase">
                        Enrolled
                      </Badge>
                    </div>
                    <h4 className="text-lg font-bold text-white group-hover:text-brand-gold transition-colors">
                      {subject.name}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-2">
                      <ShieldCheck className="h-3 w-3 text-emerald-400" />
                      <p className="text-[10px] text-emerald-400/70 font-semibold uppercase tracking-wider">
                        Active
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </main>
    </div>
  );
}

export default StudentPortal;
