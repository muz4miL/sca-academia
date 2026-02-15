/**
 * Student Portal - "Luxury Academic" Premium Edition
 *
 * Prestigious Gold/Bronze Theme with Warm Glass Aesthetic
 */

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
  Moon,
  Sun,
  ShieldCheck,
  TrendingUp,
  Calendar,
  Sparkles,
  Timer,
  ArrowRight,
  FileQuestion,
  Armchair,
  FileText,
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

// Motion Variants
const waterfall = {
  initial: { y: 40, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 40,
      damping: 15,
      mass: 1,
    },
  },
};

const ripple = {
  whileHover: {
    scale: 1.01,
    transition: { type: "spring" as const, stiffness: 400, damping: 10 },
  },
  whileTap: { scale: 0.99 },
};

// Spotlight effect component - Warm Gold Glow
const Spotlight = ({ mouseX, mouseY }: { mouseX: any; mouseY: any }) => {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-0 transition duration-300"
      style={{
        background: `radial-gradient(600px circle at ${mouseX}px ${mouseY}px, rgba(180, 83, 9, 0.1), transparent 40%)`,
      }}
    />
  );
};

export function StudentPortal() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [activeSubject, setActiveSubject] = useState<string | null>(null);

  // Mouse position for spotlight effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { stiffness: 100, damping: 20 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 100, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

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



  // Fetch student schedule/timetable (Role-Based — filtered by student's class)
  const studentClassId = profile?.classRef?._id || profile?.classRef;
  const { data: scheduleData } = useQuery({
    queryKey: ["student-timetable", token, studentClassId],
    queryFn: async () => {
      const classFilter = studentClassId ? `?classId=${studentClassId}` : "";
      const res = await fetch(`${API_BASE_URL}/api/timetable${classFilter}`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch timetable");
      return res.json();
    },
    enabled: isLoggedIn && !!token,
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



  // --- UI HELPERS ---
  const MagneticWrapper = ({ children }: { children: React.ReactNode }) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const mouseX = useSpring(x, { stiffness: 150, damping: 15 });
    const mouseY = useSpring(y, { stiffness: 150, damping: 15 });

    function onMouseMove(event: React.MouseEvent<HTMLDivElement>) {
      const { left, top, width, height } =
        event.currentTarget.getBoundingClientRect();
      const offsetX = event.clientX - left - width / 2;
      const offsetY = event.clientY - top - height / 2;
      x.set(offsetX / 8);
      y.set(offsetY / 8);
    }
    function onMouseLeave() {
      x.set(0);
      y.set(0);
    }

    return (
      <motion.div
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        style={{ x: mouseX, y: mouseY }}
        className="h-full w-full"
      >
        {children}
      </motion.div>
    );
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
          {...waterfall}
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

                <motion.div {...ripple}>
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
                </motion.div>
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
          {...waterfall}
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
                  <motion.div {...ripple}>
                    <Button
                      onClick={handleRefreshStatus}
                      className="w-full h-16 bg-brand-gold hover:bg-brand-gold/90 text-white font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-brand-gold/20"
                    >
                      <RefreshCw className="mr-3 h-5 w-5" />
                      Check Status
                    </Button>
                  </motion.div>
                  <motion.div {...ripple}>
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      className="w-full h-16 border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 font-black uppercase tracking-[0.2em] rounded-2xl transition-all"
                    >
                      <LogOut className="mr-3 h-5 w-5" />
                      Sign Out
                    </Button>
                  </motion.div>
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

  // MAIN DASHBOARD - LUXURY ACADEMIC AESTHETIC
  return (
    <div
      className="min-h-screen bg-brand-primary text-white relative overflow-hidden font-sans selection:bg-brand-gold/30"
      onMouseMove={handleMouseMove}
    >
      {/* Liquid Mesh Background */}
      <div className="fixed inset-0 liquid-mesh opacity-40" />
      <div className="fixed inset-0 bg-brand-primary/60 backdrop-blur-[2px]" />

      {/* Spotlight Effect */}
      <Spotlight mouseX={smoothMouseX} mouseY={smoothMouseY} />

      {/* Glass Header with Gold Border */}
      <header className="sticky top-0 z-50 glass-ethereal border-b border-white/10">
        <div className="max-w-[1800px] mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="p-2 rounded-xl bg-brand-primary border border-white/10 shadow-2xl">
              <img
                src="/logo.png"
                alt="SCIENCES COACHING ACADEMY"
                className="h-10 w-auto object-contain drop-shadow-[0_0_8px_rgba(180,83,9,0.3)]"
              />
            </div>
            <div className="hidden sm:block">
              <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em]">
                Student Portal
              </p>
              <p className="text-xs text-slate-400 font-serif italic">
                Institutional Access
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-8 mr-4">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Current Status
                </span>
                <span className="text-sm font-bold text-brand-gold flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" />
                  Verified Student
                </span>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-3 hover:bg-white/5 h-14 px-4 rounded-2xl border border-transparent hover:border-white/10 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-gold overflow-hidden flex items-center justify-center shadow-lg shadow-brand-gold/20">
                    {profile?.photo ? (
                      <img
                        src={profile.photo}
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
                    <p className="text-sm font-bold text-white leading-none">
                      {profile?.name}
                    </p>
                    <p className="text-[10px] text-brand-gold/70 font-mono tracking-wider mt-1">
                      {profile?.barcodeId || profile?.studentId}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 bg-brand-primary/95 backdrop-blur-2xl border-white/10 rounded-2xl p-2 shadow-2xl"
              >
                <DropdownMenuLabel className="text-slate-400 text-[10px] font-black uppercase tracking-widest px-3 py-2">
                  Academy Account
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem className="text-slate-200 focus:bg-brand-gold/10 focus:text-brand-gold rounded-xl py-3 cursor-pointer">
                  <User className="mr-3 h-4 w-4" />
                  <span className="font-bold">Institutional Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    // Save student info to localStorage for seat selection page
                    if (profile) {
                      const studentInfo = {
                        _id: profile._id,
                        name: profile.name || (profile as any).studentName,
                        studentId: profile.studentId,
                        gender: (profile as any).gender || "Male",
                        class: profile.class,
                        classId: profile.classRef?._id || profile.classRef,
                        session: profile.session ? {
                          _id: typeof profile.session === "string" ? profile.session : (profile.session as any)?._id,
                          name: typeof profile.session === "string" ? profile.session : (profile.session as any)?.name || (profile.session as any)?.sessionName,
                        } : undefined,
                      };
                      localStorage.setItem("studentInfo", JSON.stringify(studentInfo));
                    }
                    navigate("/student-portal/seat-selection");
                  }}
                  className="text-slate-200 focus:bg-brand-gold/10 focus:text-brand-gold rounded-xl py-3 cursor-pointer"
                >
                  <Armchair className="mr-3 h-4 w-4" />
                  <span className="font-bold">Book Seat</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-slate-200 focus:bg-brand-gold/10 focus:text-brand-gold rounded-xl py-3 cursor-pointer">
                  <CreditCard className="mr-3 h-4 w-4" />
                  <span className="font-bold">
                    Fee Status: {profile?.feeStatus}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-400 focus:bg-red-500/10 focus:text-red-400 rounded-xl py-3 cursor-pointer"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  <span className="font-bold">Secure Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-6 py-10 relative z-10">
        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Hero Section - Span 8 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="md:col-span-8"
          >
            <Card className="h-full glass-ethereal border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.4)] relative overflow-hidden rounded-[3rem]">
              <div className="absolute top-0 left-0 w-full h-1 bg-brand-gold opacity-50" />
              <CardContent className="p-10 md:p-14 h-full flex flex-col justify-between relative z-10">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-brand-gold/10 border border-brand-gold/20">
                      <Sparkles className="h-4 w-4 text-brand-gold" />
                    </div>
                    <span className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">
                      {getGreeting()}
                    </span>
                  </div>
                  <h2 className="text-5xl md:text-7xl font-serif font-black mb-6 tracking-tight leading-[1.1]">
                    <span className="text-white">Welcome, </span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-gold via-brand-gold/80 to-brand-gold shadow-sm">
                      {profile?.name?.split(" ")[0] || "Scholar"}
                    </span>
                    <span className="text-brand-gold">.</span>
                  </h2>
                  <p className="text-xl text-slate-400 mb-12 max-w-2xl leading-relaxed">
                    Your portal to excellence is ready. Continue your academic
                    journey with the SCIENCES COACHING ACADEMY elite curriculum.
                  </p>

                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 transition-all hover:bg-white/10 group">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 group-hover:text-brand-gold transition-colors">
                        Current Enrollment
                      </p>
                      <p className="text-2xl font-serif font-bold text-white">
                        {profile?.class}{" "}
                        <span className="text-brand-gold mx-2">•</span>{" "}
                        {profile?.group}
                      </p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 transition-all hover:bg-white/10 group">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 group-hover:text-brand-gold transition-colors">
                        Active Courses
                      </p>
                      <p className="text-2xl font-serif font-bold text-white">
                        {profile?.subjects?.length || 0} Professional Subjects
                      </p>
                    </div>
                  </div>
                </div>

                {/* Session Card - Dynamic from Schedule API */}
                <div className="mt-10 bg-brand-gold/10 border border-brand-gold/20 rounded-[2rem] p-8 transition-all hover:bg-brand-gold/15 group">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div
                      className={cn(
                        "w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl",
                        currentSession
                          ? "bg-emerald-500 shadow-emerald-500/20"
                          : "bg-brand-gold shadow-brand-gold/20",
                      )}
                    >
                      {currentSession ? (
                        <Play className="h-8 w-8 text-white animate-pulse" />
                      ) : (
                        <Clock className="h-8 w-8 text-brand-primary" />
                      )}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em] mb-1">
                        {currentSession
                          ? "Live Now: Ongoing Session"
                          : "Up Next in Your Schedule"}
                      </p>
                      {currentSession || nextSession ? (
                        <div>
                          <p className="text-2xl font-serif font-bold text-white">
                            {(currentSession || nextSession)?.subject}
                            {currentSession && (
                              <span className="ml-3 px-3 py-1 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                                Active
                              </span>
                            )}
                          </p>
                          <p className="text-slate-400 font-medium mt-1">
                            {(currentSession || nextSession)?.startTime} —{" "}
                            {(currentSession || nextSession)?.endTime}
                            <span className="mx-2 opacity-30">|</span>
                            {(currentSession || nextSession)?.room || "TBA"}
                            <span className="mx-2 opacity-30">|</span>
                            {(currentSession || nextSession)?.teacherId?.name ||
                              "Academic Expert"}
                          </p>
                        </div>
                      ) : (
                        <p className="text-2xl font-serif font-bold text-slate-500">
                          No upcoming sessions scheduled
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() =>
                        document
                          .getElementById("timetable-section")
                          ?.scrollIntoView({ behavior: "smooth" })
                      }
                      className="bg-brand-gold hover:bg-brand-gold/90 text-brand-primary font-black uppercase tracking-widest h-14 px-8 rounded-2xl shadow-lg shadow-brand-gold/20"
                    >
                      View Timetable
                    </Button>
                  </div>
                </div>
              </CardContent>

              {/* Background Watermark */}
              <div className="absolute -bottom-20 -right-20 opacity-[0.03] pointer-events-none rotate-12">
                <GraduationCap className="h-96 w-96 text-white" />
              </div>
            </Card>
          </motion.div>

          {/* Stats Column - Span 4 */}
          <div className="md:col-span-4 space-y-6">
            {/* Finance Widget with Glowing Shield */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="glass-ethereal border-white/10 rounded-[2rem] overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                      Financial Standing
                    </h3>
                    {profile?.feeStatus === "paid" ? (
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                          Cleared
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/20">
                        <Clock className="h-4 w-4 text-brand-gold" />
                        <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest">
                          Pending
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-center mb-8 relative">
                    <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
                      <p className="text-4xl font-serif font-black text-white">
                        {feePercentage}%
                      </p>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Paid
                      </p>
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={[
                            { value: feePercentage },
                            { value: 100 - feePercentage },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={75}
                          paddingAngle={8}
                          dataKey="value"
                          stroke="none"
                        >
                          <Cell
                            fill={
                              profile?.feeStatus === "paid"
                                ? "#10b981"
                                : "#B45309"
                            }
                            className="drop-shadow-[0_0_10px_rgba(180,83,9,0.3)]"
                          />
                          <Cell fill="rgba(255,255,255,0.05)" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="text-center space-y-4">
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                        Account Balance
                      </p>
                      <p className="text-2xl font-serif font-bold text-white">
                        PKR {profile?.balance?.toLocaleString() || 0}
                      </p>
                    </div>
                    {profile?.feeStatus !== "paid" && (
                      <Button className="w-full h-12 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest text-xs rounded-xl">
                        View Statement
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Student Profile Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="glass-ethereal border-white/10 rounded-[2rem] overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-brand-gold/10">
                      <UserCircle className="h-4 w-4 text-brand-gold" />
                    </div>
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                      Student Profile
                    </h3>
                  </div>

                  {/* Profile Photo */}
                  <div className="flex flex-col items-center mb-6">
                    <div className="w-24 h-24 rounded-[1.5rem] overflow-hidden border-2 border-brand-gold/30 shadow-xl shadow-brand-gold/10 mb-4">
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
                          className="w-full h-full object-cover bg-brand-gold/5"
                        />
                      )}
                    </div>
                    <p className="text-lg font-serif font-bold text-white text-center">
                      {profile?.name}
                    </p>
                    <p className="text-[10px] font-black text-brand-gold/70 uppercase tracking-widest mt-1 font-mono">
                      {profile?.barcodeId || profile?.studentId}
                    </p>
                  </div>

                  {/* Quick Info */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Father</span>
                      <span className="text-xs font-bold text-slate-300">{profile?.fatherName}</span>
                    </div>
                    <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Session</span>
                      <span className="text-xs font-bold text-slate-300">{profile?.session?.name || "Not Assigned"}</span>
                    </div>
                    <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</span>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-400">{profile?.studentStatus}</span>
                      </div>
                    </div>
                  </div>

                  {/* Admission Slip Button */}
                  <Button
                    onClick={() => {
                      toast.info("Admission Slip", {
                        description: "Please visit the administration office or contact your class coordinator to obtain your official admission slip.",
                      });
                    }}
                    className="w-full h-12 bg-brand-gold/10 hover:bg-brand-gold/20 border border-brand-gold/20 text-brand-gold font-black uppercase tracking-widest text-xs rounded-xl transition-all group"
                  >
                    <FileText className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                    View Admission Slip
                  </Button>
                </CardContent>
              </Card>
            </motion.div>


          </div>

          {/* Weekly Timetable - Full Width */}
          <div id="timetable-section" className="md:col-span-12 mt-4">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-3xl font-serif font-black text-white flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-brand-gold/10 border border-brand-gold/20">
                  <Calendar className="h-6 w-6 text-brand-gold" />
                </div>
                Academic <span className="text-brand-gold">Schedule</span>
              </h3>
              <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">
                Week of Excellence
              </p>
            </div>

            <Card className="glass-ethereal border-white/10 rounded-[3rem] overflow-hidden">
              <CardContent className="p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
                  {[
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ].map((day) => {
                    const daySchedule = timetable.filter((s) => s.day === day);
                    const isScheduled = daySchedule.length > 0;
                    const today = [
                      "Sunday",
                      "Monday",
                      "Tuesday",
                      "Wednesday",
                      "Thursday",
                      "Friday",
                      "Saturday",
                    ][new Date().getDay()];
                    const isToday = day === today;

                    return (
                      <div
                        key={day}
                        className={cn(
                          "relative rounded-3xl p-6 transition-all duration-500 min-h-[160px] group",
                          isScheduled
                            ? "bg-brand-gold/10 border border-brand-gold/20 shadow-xl shadow-brand-gold/5"
                            : "bg-white/5 border border-white/5 opacity-50 hover:opacity-100",
                          isToday &&
                          "ring-2 ring-brand-gold ring-offset-4 ring-offset-brand-primary scale-105 z-10",
                        )}
                      >
                        {/* Day Header */}
                        <div
                          className={cn(
                            "text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center justify-between",
                            isScheduled ? "text-brand-gold" : "text-slate-500",
                          )}
                        >
                          {day.substring(0, 3)}
                          {isToday && (
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" />
                          )}
                        </div>

                        {isScheduled ? (
                          <div className="space-y-4">
                            {daySchedule.map((entry, idx) => (
                              <div
                                key={idx}
                                className={cn(
                                  "pt-3",
                                  idx !== 0 && "border-t border-white/5",
                                )}
                              >
                                <p className="text-lg font-serif font-bold text-white leading-none">
                                  {entry.startTime}
                                </p>
                                <p className="text-[10px] text-brand-gold/80 font-bold uppercase tracking-widest mt-1">
                                  {entry.subject}
                                </p>
                                {entry.teacherId?.name && (
                                  <p className="text-[9px] text-slate-300/70 font-medium mt-1">
                                    {entry.teacherId.name}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-2 opacity-60">
                                  <Clock className="h-2.5 w-2.5 text-slate-400" />
                                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                    {entry.startTime} — {entry.endTime} | Room {entry.room || "TBA"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-24 opacity-20 group-hover:opacity-40 transition-opacity">
                            <Sparkles className="h-8 w-8 text-slate-500 mb-2" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                              Self Study
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subject Cards - Full Width */}
          <div className="md:col-span-12 mt-12">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-3xl font-serif font-black text-white flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-brand-gold/10 border border-brand-gold/20">
                  <BookOpen className="h-6 w-6 text-brand-gold" />
                </div>
                Your <span className="text-brand-gold">Curriculum</span>
              </h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                Institutional Subjects
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* All Courses Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveSubject(null)}
                className="cursor-pointer"
              >
                <MagneticWrapper>
                  <Card
                    className={cn(
                      "glass-ethereal border transition-all duration-500 rounded-[2rem] overflow-hidden group h-full",
                      activeSubject === null
                        ? "border-brand-gold/50 shadow-2xl shadow-brand-gold/10 bg-brand-gold/5"
                        : "border-white/10 hover:border-white/20",
                    )}
                  >
                    <CardContent className="p-8">
                      <div className="flex items-center justify-between mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center group-hover:bg-brand-gold transition-colors duration-500 shadow-lg">
                          <span className="text-3xl group-hover:scale-110 transition-transform">
                            📚
                          </span>
                        </div>
                        <Badge
                          variant="secondary"
                          className="font-black bg-white/5 text-white border-white/10 px-3 h-6 uppercase tracking-widest text-[10px]"
                        >
                          All Subjects
                        </Badge>
                      </div>
                      <h4 className="font-serif font-bold text-2xl text-white mb-2 group-hover:text-brand-gold transition-colors">
                        Full Library
                      </h4>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">
                        Complete Academic Content
                      </p>
                    </CardContent>
                  </Card>
                </MagneticWrapper>
              </motion.div>

              {/* Subject Cards */}
              {profile?.subjects?.map((subject, index) => {
                const colors =
                  SUBJECT_COLORS[subject.name] || SUBJECT_COLORS.Mathematics;
                return (
                  <motion.div
                    key={subject.name}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveSubject(subject.name)}
                    className="cursor-pointer group"
                  >
                    <MagneticWrapper>
                      <Card
                        className={cn(
                          "glass-ethereal border transition-all duration-500 rounded-[2rem] overflow-hidden h-full",
                          activeSubject === subject.name
                            ? "border-brand-gold/50 shadow-2xl shadow-brand-gold/10 bg-brand-gold/5"
                            : "border-white/10 hover:border-white/20",
                          colors.glow,
                        )}
                      >
                        <CardContent className="p-8 relative overflow-hidden">
                          <div className="flex items-center justify-between mb-6 relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 backdrop-blur-md flex items-center justify-center border border-white/10 group-hover:bg-brand-gold transition-colors duration-500 shadow-lg">
                              <span className="text-3xl group-hover:scale-110 transition-transform">
                                {colors.icon}
                              </span>
                            </div>
                            <Badge
                              variant="secondary"
                              className="font-black bg-white/5 text-white border-white/10 px-3 h-6 uppercase tracking-widest text-[10px]"
                            >
                              Enrolled
                            </Badge>
                          </div>
                          <h4 className="font-serif font-bold text-2xl text-white mb-2 relative z-10 group-hover:text-brand-gold transition-colors">
                            {subject.name}
                          </h4>
                          <div className="flex items-center gap-2 relative z-10">
                            <ShieldCheck className="h-3 w-3 text-emerald-400" />
                            <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">
                              Course Verified
                            </p>
                          </div>

                          {/* Watermark Icon */}
                          <div className="absolute -bottom-6 -right-6 opacity-[0.05] group-hover:opacity-10 transition-opacity duration-700 pointer-events-none">
                            <span className="text-9xl">{colors.icon}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </MagneticWrapper>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default StudentPortal;
