/**
 * Student Seat Selection Page
 * Mobile-First Cinema-Style Seat Booking Interface
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  GraduationCap,
  Calendar,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SeatGrid from "@/components/student/SeatGrid";
import { Seat } from "@/services/seatService";
import { useNavigate } from "react-router-dom";

interface StudentInfo {
  _id: string;
  name: string;
  studentId: string;
  gender: "Male" | "Female";
  class: string;
  classId?: string;
  section?: string;
  seatNumber?: string;
  session?: {
    _id: string;
    name: string;
  };
}

export default function StudentSeatSelection() {
  const navigate = useNavigate();
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookedSeatLabel, setBookedSeatLabel] = useState<string | null>(null);

  useEffect(() => {
    // Try to get student info from localStorage
    const storedStudent = localStorage.getItem("studentInfo");
    if (storedStudent) {
      try {
        const parsed = JSON.parse(storedStudent);
        setStudentInfo(parsed);
        if (parsed.seatNumber) {
          setBookedSeatLabel(parsed.seatNumber);
        }
        setLoading(false);
        return;
      } catch {
        // fall through to mock
      }
    }

    // Fallback: mock for demo
    const mockStudent: StudentInfo = {
      _id: "675e55fc5aa09e3a5c51adef",
      name: "Muhammad Muzammil",
      studentId: "STU-2024-001",
      gender: "Male",
      class: "10th Grade",
      session: {
        _id: "675e3bb75aa09e3a5c51adb3",
        name: "2024-2025",
      },
    };
    setTimeout(() => {
      setStudentInfo(mockStudent);
      setLoading(false);
    }, 500);
  }, []);

  const handleSeatBooked = (seat: Seat) => {
    setBookedSeatLabel(seat.seatLabel || `Seat-${seat.seatNumber}`);
    // Update localStorage
    if (studentInfo) {
      const updated = {
        ...studentInfo,
        seatNumber: seat.seatLabel || `Seat-${seat.seatNumber}`,
      };
      localStorage.setItem("studentInfo", JSON.stringify(updated));
    }
  };

  const handleSeatReleased = () => {
    setBookedSeatLabel(null);
    if (studentInfo) {
      const updated = { ...studentInfo, seatNumber: undefined };
      localStorage.setItem("studentInfo", JSON.stringify(updated));
    }
  };

  if (loading || !studentInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 text-amber-500 animate-spin" />
          <p className="text-slate-400 text-sm">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* ── Safe area padding on mobile ── */}
      <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-6 space-y-3 sm:space-y-5">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/student-portal")}
              className="text-slate-400 hover:text-white shrink-0 h-8 w-8 sm:h-9 sm:w-9"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-300 bg-clip-text text-transparent truncate">
                Seat Selection
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-500 hidden sm:block">
                Choose your permanent classroom seat
              </p>
            </div>
          </div>

          {/* Student Badge (compact on mobile) */}
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 text-[10px] sm:text-xs px-2 py-1",
              studentInfo.gender === "Male"
                ? "border-blue-500/40 text-blue-300 bg-blue-500/10"
                : "border-pink-500/40 text-pink-300 bg-pink-500/10"
            )}
          >
            {studentInfo.gender === "Male" ? "👦" : "👧"}{" "}
            <span className="hidden sm:inline">{studentInfo.gender} • </span>
            {studentInfo.gender === "Male" ? "Right" : "Left"} Wing
          </Badge>
        </motion.div>

        {/* ── Student Info Card (Compact Mobile) ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-slate-800/30 border-slate-700/40 backdrop-blur-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 sm:gap-x-6 sm:gap-y-2 text-xs sm:text-sm">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <User className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500 shrink-0" />
                  <span className="truncate max-w-[120px] sm:max-w-none">
                    {studentInfo.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500 shrink-0" />
                  {studentInfo.class}
                </div>
                {studentInfo.session && (
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500 shrink-0" />
                    {studentInfo.session.name}
                  </div>
                )}
                {bookedSeatLabel && (
                  <div className="flex items-center gap-1.5 text-blue-300 font-semibold">
                    <span className="text-blue-400 shrink-0">🪑</span>
                    Seat: {bookedSeatLabel}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Seat Grid Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-slate-800/50 via-slate-900/50 to-slate-800/50 border-amber-500/20 backdrop-blur-sm overflow-hidden">
            <CardHeader className="py-3 sm:py-4 px-3 sm:px-6">
              <CardTitle className="text-center text-base sm:text-xl font-bold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">
                🪑 Select Your Seat
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-4 md:px-6 pb-4 sm:pb-6">
              {studentInfo.session?._id ? (
                <SeatGrid
                  classId={studentInfo.classId || studentInfo.class}
                  sessionId={studentInfo.session._id}
                  studentId={studentInfo._id}
                  onSeatBooked={handleSeatBooked}
                  onSeatReleased={handleSeatReleased}
                />
              ) : (
                <div className="text-center text-slate-400 py-12">
                  <p>Session information not available</p>
                  <p className="text-sm mt-2">
                    Please contact administration
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Help Text (Mobile) ── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-[10px] sm:text-xs text-slate-600 pb-4"
        >
          Tap a green seat to select • Use +/- to zoom •{" "}
          <span className="text-amber-500/60">Scroll horizontally</span> if
          needed
        </motion.p>
      </div>
    </div>
  );
}
