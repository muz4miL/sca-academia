import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Lock,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { seatService, Seat, GetSeatsResponse } from "@/services/seatService";

interface SeatGridProps {
  classId: string;
  sessionId: string;
  studentId: string;
  onSeatBooked?: (seat: Seat) => void;
  onSeatReleased?: () => void;
}

export default function SeatGrid({
  classId,
  sessionId,
  studentId,
  onSeatBooked,
  onSeatReleased,
}: SeatGridProps) {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [allowedSide, setAllowedSide] = useState<"Left" | "Right">("Right");
  const [studentGender, setStudentGender] = useState<"Male" | "Female">("Male");
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [bookedSeat, setBookedSeat] = useState<Seat | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showLegend, setShowLegend] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [seatChangeCount, setSeatChangeCount] = useState(0);
  const [maxChanges] = useState(2);
  const gridRef = useRef<HTMLDivElement>(null);

  // Fetch seats
  const fetchSeats = useCallback(async () => {
    try {
      setLoading(true);
      const data: GetSeatsResponse = await seatService.getSeats(
        classId,
        sessionId,
        studentId
      );
      setSeats(data.seats);
      setAllowedSide(data.allowedSide);
      setStudentGender(data.studentGender);
      
      // Update seat change count if provided
      if (data.seatChangeCount !== undefined) {
        setSeatChangeCount(data.seatChangeCount);
      }

      // Find if student already has a booked seat
      const myBookedSeat = data.seats.find(
        (seat) => seat.isTaken && seat.student?._id === studentId
      );
      if (myBookedSeat) {
        setBookedSeat(myBookedSeat);
        setSelectedSeat(null);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load seats");
    } finally {
      setLoading(false);
    }
  }, [classId, sessionId, studentId]);

  // Auto-refresh seats every 15 seconds
  useEffect(() => {
    fetchSeats();
    const interval = setInterval(fetchSeats, 15000);
    return () => clearInterval(interval);
  }, [fetchSeats]);

  // Handle seat selection
  const handleSeatClick = (seat: Seat) => {
    // Block seat selection if student already has a booked seat
    if (bookedSeat && bookedSeat._id !== seat._id) {
      toast.warning("Please release your current seat before selecting a new one", {
        duration: 4000,
      });
      return;
    }
    
    if (bookedSeat && bookedSeat._id === seat._id) {
      toast.info("This is your current seat");
      return;
    }
    if (seat.isTaken) {
      toast.error("This seat is already taken");
      return;
    }
    if (seat.isReserved) {
      toast.error(
        `Seat reserved${seat.reservedReason ? `: ${seat.reservedReason}` : ""}`
      );
      return;
    }
    if (seat.side !== allowedSide && seat.wing !== allowedSide) {
      const wingName = allowedSide === "Left" ? "Girls Wing (Left)" : "Boys Wing (Right)";
      toast.error(
        `🚫 This seat is in the ${seat.side === "Left" ? "Girls" : "Boys"} Wing. You can only select seats in the ${wingName}.`,
        { duration: 4000 }
      );
      return;
    }
    setSelectedSeat(seat);
    setConfirmOpen(true);
  };

  // Book selected seat
  const handleBookSeat = async () => {
    if (!selectedSeat) return;
    try {
      setBookingInProgress(true);
      const response = await seatService.bookSeat(selectedSeat._id, studentId);
      toast.success(
        `Seat ${response.seat.seatLabel || response.seat.seatNumber} booked!`
      );
      setBookedSeat(response.seat);
      setSelectedSeat(null);
      setConfirmOpen(false);
      await fetchSeats();
      if (onSeatBooked) onSeatBooked(response.seat);
    } catch (error: any) {
      // Revert optimistic updates on error
      setSelectedSeat(null);
      
      if (error.message.includes("release your current seat") || error.message.includes("400")) {
        toast.error("Please release your current seat first before selecting a new one", { duration: 5000 });
      } else if (
        error.message.includes("already taken") ||
        error.message.includes("409")
      ) {
        toast.error("Seat was just taken by someone else!");
      } else if (
        error.message.includes("403") ||
        error.message.includes("Access Denied")
      ) {
        toast.error("You cannot book this seat (gender restriction)");
      } else if (error.message.includes("already selected")) {
        toast.error("You already have a seat assigned");
      } else {
        toast.error(error.message || "Booking failed");
      }
      await fetchSeats();
    } finally {
      setBookingInProgress(false);
      setConfirmOpen(false);
    }
  };

  // Release current seat
  const handleReleaseSeat = async () => {
    if (!bookedSeat) return;
    try {
      setBookingInProgress(true);
      const response = await seatService.releaseSeat(bookedSeat._id, studentId);
      
      // Update change count from response
      if (response.changeCount !== undefined) {
        setSeatChangeCount(response.changeCount);
      }
      
      const remainingChanges = response.remainingChanges ?? (maxChanges - (response.changeCount || 0));
      toast.success(
        `Seat released! ${remainingChanges > 0 ? `${remainingChanges} change${remainingChanges === 1 ? '' : 's'} remaining` : 'No more changes allowed'}`
      );
      
      setBookedSeat(null);
      setSelectedSeat(null);
      await fetchSeats();
      if (onSeatReleased) onSeatReleased();
    } catch (error: any) {
      if (error.message.includes("Maximum") || error.message.includes("403")) {
        toast.error(error.message || "Seat change limit reached. Contact admin.");
      } else {
        toast.error(error.message || "Failed to release seat");
      }
    } finally {
      setBookingInProgress(false);
    }
  };

  // Organize seats by rows
  const seatsByRow = seats.reduce(
    (acc, seat) => {
      const row = seat.position.row;
      if (!acc[row]) acc[row] = [];
      acc[row].push(seat);
      return acc;
    },
    {} as Record<number, Seat[]>
  );

  // Row label
  const getRowLabel = (row: number) => String(row).padStart(2, "0");

  // Get seat color
  const getSeatColor = (seat: Seat) => {
    if (bookedSeat && bookedSeat._id === seat._id) {
      return "bg-blue-500 text-white border-blue-400 ring-2 ring-blue-300 ring-offset-1 ring-offset-slate-900";
    }
    if (selectedSeat && selectedSeat._id === seat._id) {
      return "bg-amber-500 text-white border-amber-400 ring-2 ring-amber-300 ring-offset-1 ring-offset-slate-900 animate-pulse";
    }
    if (seat.isReserved) {
      return "bg-slate-700 text-slate-500 border-slate-600 cursor-not-allowed";
    }
    if (seat.isTaken && seat.student?._id !== studentId) {
      return "bg-red-900/60 text-red-300 border-red-800/60 cursor-not-allowed";
    }
    // Available seats on allowed side
    const isAllowedSide =
      seat.side === allowedSide || seat.wing === allowedSide;
    if (isAllowedSide) {
      return "bg-emerald-600/80 hover:bg-emerald-500 text-white border-emerald-500/60 cursor-pointer active:scale-95 transition-all";
    }
    // Wrong side - disabled
    return "bg-slate-800/50 text-slate-600 border-slate-700/40 cursor-not-allowed opacity-40";
  };

  // Stats
  const availableSeats = seats.filter(
    (s) =>
      !s.isTaken &&
      !s.isReserved &&
      (s.side === allowedSide || s.wing === allowedSide)
  ).length;
  const takenSeats = seats.filter(
    (s) => s.isTaken && (s.side === allowedSide || s.wing === allowedSide)
  ).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
        <p className="text-slate-400 text-sm">Loading seat map...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 sm:space-y-4">
      {/* ── Status Bar (Mobile Optimized) ── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-slate-800/60 rounded-xl p-2 sm:p-3 text-center border border-slate-700/50">
          <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider">
            Available
          </p>
          <p className="text-lg sm:text-2xl font-bold text-emerald-400">
            {availableSeats}
          </p>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-2 sm:p-3 text-center border border-slate-700/50">
          <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider">
            Taken
          </p>
          <p className="text-lg sm:text-2xl font-bold text-red-400">
            {takenSeats}
          </p>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-2 sm:p-3 text-center border border-slate-700/50">
          <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider">
            Your Wing
          </p>
          <p className="text-lg sm:text-2xl font-bold text-amber-400">
            {allowedSide === "Left" ? "👧 L" : "👦 R"}
          </p>
        </div>
      </div>

      {/* ── Wing Labels ── */}
      <div className="flex items-center justify-center gap-1 sm:gap-2">
        <div
          className={cn(
            "flex-1 text-center py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-semibold tracking-wide border transition-all",
            allowedSide === "Left"
              ? "bg-pink-500/20 text-pink-300 border-pink-500/40"
              : "bg-slate-800/40 text-slate-500 border-slate-700/30"
          )}
        >
          👧 Girls Wing
          {allowedSide !== "Left" && (
            <Lock className="inline-block h-3 w-3 ml-1 text-red-500" />
          )}
        </div>
        <div className="px-1 sm:px-2 text-[10px] text-slate-600 font-bold shrink-0">
          AISLE
        </div>
        <div
          className={cn(
            "flex-1 text-center py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-semibold tracking-wide border transition-all",
            allowedSide === "Right"
              ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
              : "bg-slate-800/40 text-slate-500 border-slate-700/30"
          )}
        >
          👦 Boys Wing
          {allowedSide !== "Right" && (
            <Lock className="inline-block h-3 w-3 ml-1 text-red-500" />
          )}
        </div>
      </div>

      {/* ── Zoom Controls (Mobile) ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="flex items-center gap-1 text-xs sm:text-sm text-slate-400 hover:text-slate-200 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-800/40"
        >
          <Info className="h-4 w-4" />
          Legend
          {showLegend ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setZoom(Math.max(0.6, zoom - 0.1))}
            className="p-2 rounded-lg bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/50 transition-colors active:scale-95"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs text-slate-500 w-10 text-center font-medium">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(Math.min(1.5, zoom + 0.1))}
            className="p-2 rounded-lg bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/50 transition-colors active:scale-95"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-2 rounded-lg bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/50 transition-colors active:scale-95"
            aria-label="Reset zoom"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Legend (Collapsible) ── */}
      <AnimatePresence>
        {showLegend && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-800/40 rounded-xl border border-slate-700/30">
              <LegendItem color="bg-emerald-600" label="Available" />
              <LegendItem color="bg-red-900/60" label="Taken" />
              <LegendItem color="bg-slate-700" label="Reserved" />
              <LegendItem color="bg-blue-500" label="Your Seat" />
              <LegendItem color="bg-amber-500" label="Selected" />
              <LegendItem
                color="bg-slate-800/50 opacity-40"
                label="Restricted"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SCREEN (Teacher's Desk) ── */}
      <div className="relative">
        <div className="w-full h-7 sm:h-8 bg-gradient-to-r from-amber-600/20 via-amber-500/30 to-amber-600/20 rounded-t-2xl border border-amber-500/20 flex items-center justify-center">
          <span className="text-[10px] sm:text-xs font-bold text-amber-400/80 tracking-[0.2em] uppercase">
            Teacher's Desk / Whiteboard
          </span>
        </div>
      </div>

      {/* ── Seat Grid (Scrollable & Zoomable) ── */}
      <div
        ref={gridRef}
        className="overflow-x-auto overflow-y-auto pb-3 -mx-2 px-2 sm:pb-4"
        style={{ WebkitOverflowScrolling: "touch" as any }}
      >
        <div
          className="min-w-fit mx-auto transition-transform duration-200 ease-out"
          style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
        >
          {Object.keys(seatsByRow)
            .sort((a, b) => Number(a) - Number(b))
            .map((rowKey) => {
              const rowNum = Number(rowKey);
              const rowSeats = seatsByRow[rowNum].sort(
                (a, b) => a.position.column - b.position.column
              );
              const leftSeats = rowSeats.filter(
                (s) => s.wing === "Left" || (s.position.column < 7 && !s.wing)
              );
              const rightSeats = rowSeats.filter(
                (s) => s.wing === "Right" || (s.position.column >= 7 && !s.wing)
              );

              return (
                <div
                  key={rowKey}
                  className="flex items-center gap-1 sm:gap-1.5 justify-center mb-1.5 sm:mb-2"
                >
                  {/* Row Label */}
                  <div className="w-6 sm:w-7 h-9 sm:h-10 flex items-center justify-center font-bold text-[10px] sm:text-xs text-amber-500/70 shrink-0">
                    {getRowLabel(rowNum)}
                  </div>

                  {/* Left Wing Seats */}
                  <div className="flex gap-0.5 sm:gap-1">
                    {leftSeats.map((seat) => (
                      <SeatButton
                        key={seat._id}
                        seat={seat}
                        getSeatColor={getSeatColor}
                        onClick={() => handleSeatClick(seat)}
                        isDisabled={
                          (bookedSeat && bookedSeat._id !== seat._id) || // Disable all others if student has booked seat
                          (seat.isTaken && seat.student?._id !== studentId) ||
                          seat.isReserved ||
                          (seat.side !== allowedSide &&
                            seat.wing !== allowedSide)
                        }
                        isMyBookedSeat={bookedSeat?._id === seat._id}
                        studentId={studentId}
                      />
                    ))}
                  </div>

                  {/* Aisle */}
                  <div className="w-3 sm:w-4 shrink-0" />

                  {/* Right Wing Seats */}
                  <div className="flex gap-0.5 sm:gap-1">
                    {rightSeats.map((seat) => (
                      <SeatButton
                        key={seat._id}
                        seat={seat}
                        getSeatColor={getSeatColor}
                        onClick={() => handleSeatClick(seat)}
                        isDisabled={
                          (bookedSeat && bookedSeat._id !== seat._id) || // Disable all others if student has booked seat
                          (seat.isTaken && seat.student?._id !== studentId) ||
                          seat.isReserved ||
                          (seat.side !== allowedSide &&
                            seat.wing !== allowedSide)
                        }
                        isMyBookedSeat={bookedSeat?._id === seat._id}
                        studentId={studentId}
                      />
                    ))}
                  </div>

                  {/* Row Label (right side) */}
                  <div className="w-6 sm:w-7 h-9 sm:h-10 flex items-center justify-center font-bold text-[10px] sm:text-xs text-amber-500/70 shrink-0">
                    {getRowLabel(rowNum)}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* ── Confirmation Dialog (Mobile Bottom Sheet Style) ── */}
      <AnimatePresence>
        {confirmOpen && selectedSeat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
            onClick={() => {
              setConfirmOpen(false);
              setSelectedSeat(null);
            }}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full sm:max-w-md bg-gradient-to-b from-slate-800 to-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-700/50 p-5 sm:p-6 shadow-2xl"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              {/* Handle bar (mobile) */}
              <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-4 sm:hidden" />

              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 mx-auto">
                  <svg
                    className="h-7 w-7 text-amber-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 21h14a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2zM5 13V7a2 2 0 012-2h10a2 2 0 012 2v6"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white">
                  Confirm Seat Selection
                </h3>
                <div className="bg-slate-700/40 rounded-xl p-3 space-y-1.5 text-sm border border-slate-600/30">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Seat</span>
                    <span className="text-white font-bold text-base">
                      {selectedSeat.seatLabel || `#${selectedSeat.seatNumber}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Wing</span>
                    <span className="text-white">
                      {(selectedSeat.wing || selectedSeat.side) === "Left"
                        ? "👧 Girls (Left)"
                        : "👦 Boys (Right)"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Position</span>
                    <span className="text-white">
                      Row {selectedSeat.position.row}, Col{" "}
                      {selectedSeat.position.column}
                    </span>
                  </div>
                </div>

                {/* Change Limit Warning */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300/90">
                  ⚠️ You can change your seat up to <strong>{maxChanges} times</strong>.
                  {seatChangeCount >= maxChanges 
                    ? " Limit reached! Contact admin for changes."
                    : ` (${maxChanges - seatChangeCount} change${maxChanges - seatChangeCount === 1 ? '' : 's'} remaining)`}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <Button
                    variant="outline"
                    className="flex-1 h-11 sm:h-12 border-slate-600 text-slate-300 hover:bg-slate-700 text-sm sm:text-base"
                    onClick={() => {
                      setConfirmOpen(false);
                      setSelectedSeat(null);
                    }}
                    disabled={bookingInProgress}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 h-11 sm:h-12 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-semibold shadow-lg shadow-emerald-900/40 text-sm sm:text-base"
                    onClick={handleBookSeat}
                    disabled={bookingInProgress}
                  >
                    {bookingInProgress ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Booking...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Confirm Booking
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Current Seat Info (if booked) ── */}
      {bookedSeat && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-900/30 via-blue-800/20 to-blue-900/30 rounded-xl border border-blue-500/30 p-4 sm:p-5"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Your Current Seat</p>
                <p className="text-xl font-bold text-blue-200">
                  {bookedSeat.seatLabel || `Seat ${bookedSeat.seatNumber}`}
                </p>
                <p className="text-[11px] text-slate-500">
                  Row {getRowLabel(bookedSeat.position.row)} • Col{" "}
                  {bookedSeat.position.column} •{" "}
                  {(bookedSeat.wing || bookedSeat.side) === "Left"
                    ? "Girls Wing"
                    : "Boys Wing"}
                </p>
                {seatChangeCount < maxChanges && (
                  <p className="text-[11px] text-emerald-400 mt-0.5">
                    {maxChanges - seatChangeCount} change{maxChanges - seatChangeCount === 1 ? '' : 's'} remaining
                  </p>
                )}
                {seatChangeCount >= maxChanges && (
                  <p className="text-[11px] text-red-400 mt-0.5">
                    No changes left • Contact admin
                  </p>
                )}
              </div>
            </div>
            <Button
              onClick={handleReleaseSeat}
              disabled={bookingInProgress || seatChangeCount >= maxChanges}
              variant="destructive"
              size="sm"
              className="bg-red-600/80 hover:bg-red-600 text-white w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
              title={seatChangeCount >= maxChanges ? "Change limit reached. Contact admin." : "Release your current seat"}
            >
              {bookingInProgress ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Release Seat
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ─── Individual Seat Button ─── */
function SeatButton({
  seat,
  getSeatColor,
  onClick,
  isDisabled,
  isMyBookedSeat,
  studentId,
}: {
  seat: Seat;
  getSeatColor: (seat: Seat) => string;
  onClick: () => void;
  isDisabled: boolean;
  isMyBookedSeat: boolean;
  studentId: string;
}) {
  return (
    <motion.button
      whileHover={!isDisabled ? { scale: 1.1 } : {}}
      whileTap={!isDisabled ? { scale: 0.9 } : {}}
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        // Mobile-first: larger touch targets (44px min on iOS)
        "w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11",
        "rounded-lg",
        "border",
        "font-bold",
        "text-[9px] sm:text-[10px] md:text-xs",
        "flex items-center justify-center",
        "select-none touch-manipulation",
        "transition-all duration-150",
        "shadow-sm hover:shadow-md",
        // Better visual feedback on mobile
        "active:brightness-90",
        getSeatColor(seat)
      )}
      title={
        isMyBookedSeat
          ? "Your Seat"
          : seat.isTaken && seat.student?._id !== studentId
            ? `Taken${seat.student?.name ? ` by ${seat.student.name}` : ""}`
            : seat.isReserved
              ? `Reserved${seat.reservedReason ? `: ${seat.reservedReason}` : ""}`
              : `Seat ${seat.seatLabel || seat.seatNumber}`
      }
    >
      {isMyBookedSeat ? (
        <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />
      ) : seat.isReserved ? (
        <Lock className="h-2.5 w-2.5 sm:h-3 sm:w-3 opacity-60" />
      ) : (
        <span className="leading-none">
          {seat.position.column < 7
            ? seat.position.column + 1
            : seat.position.column - 6}
        </span>
      )}
    </motion.button>
  );
}

/* ─── Legend Item ─── */
function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={cn(
          "w-3.5 h-3.5 sm:w-4 sm:h-4 rounded border border-slate-600",
          color
        )}
      />
      <span className="text-[10px] sm:text-xs text-slate-400">{label}</span>
    </div>
  );
}
