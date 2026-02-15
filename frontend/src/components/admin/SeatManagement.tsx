import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Users,
  Lock,
  Unlock,
  UserX,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { seatService, Seat, AdminSeatsResponse } from "@/services/seatService";

interface SeatManagementProps {
  classId: string;
  sessionId: string;
  adminId: string;
}

export default function SeatManagement({
  classId,
  sessionId,
  adminId,
}: SeatManagementProps) {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [stats, setStats] = useState<AdminSeatsResponse["stats"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [reservationReason, setReservationReason] = useState("");
  const [vacateReason, setVacateReason] = useState("");

  const fetchSeats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await seatService.getAdminSeats(classId, sessionId);
      setSeats(data.seats);
      setStats(data.stats);
    } catch (error: any) {
      toast.error(error.message || "Failed to load seats");
    } finally {
      setLoading(false);
    }
  }, [classId, sessionId]);

  useEffect(() => {
    fetchSeats();
  }, [fetchSeats]);

  const handleSeatClick = (seat: Seat) => {
    setSelectedSeat(seat);
    setReservationReason(""); // Clear previous reason
    setVacateReason(""); // Clear previous vacate reason
    setActionMenuOpen(true);
  };

  const handleVacate = async () => {
    if (!selectedSeat) return;
    const reason = vacateReason || "Vacated by admin";
    
    try {
      setProcessing(true);
      await seatService.vacateSeat(selectedSeat._id, reason);
      toast.success("Seat vacated successfully");
      setActionMenuOpen(false);
      setVacateReason("");
      await fetchSeats();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleReservation = async () => {
    if (!selectedSeat) return;
    const newReserved = !selectedSeat.isReserved;
    const reason = newReserved
      ? (reservationReason || "Reserved by admin")
      : "Unreserved by admin";
    
    try {
      setProcessing(true);
      await seatService.toggleReservation(
        selectedSeat._id,
        newReserved,
        reason
      );
      toast.success(newReserved ? "Seat reserved" : "Reservation removed");
      setActionMenuOpen(false);
      setReservationReason("");
      await fetchSeats();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessing(false);
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

  const getAdminSeatColor = (seat: Seat) => {
    if (seat.isReserved) return "bg-gray-600 text-gray-300 border-gray-500";
    if (seat.isTaken && (seat.wing === "Left" || seat.side === "Left"))
      return "bg-pink-600/80 text-white border-pink-500";
    if (seat.isTaken && (seat.wing === "Right" || seat.side === "Right"))
      return "bg-blue-600/80 text-white border-blue-500";
    return "bg-emerald-600/60 text-white border-emerald-500/60 hover:bg-emerald-500";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total" value={stats.total} color="text-blue-400" />
          <StatCard
            label="Occupied"
            value={stats.occupied}
            color="text-green-400"
          />
          <StatCard
            label="Available"
            value={stats.available}
            color="text-slate-400"
          />
          <StatCard
            label="Reserved"
            value={stats.reserved}
            color="text-red-400"
          />
        </div>
      )}

      {/* Refresh */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={fetchSeats}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Wing Headers */}
      <div className="flex items-center justify-center gap-4 text-sm font-semibold">
        <span className="text-pink-400">👧 Girls (Left Wing)</span>
        <span className="text-slate-600">|</span>
        <span className="text-blue-400">👦 Boys (Right Wing)</span>
      </div>

      {/* Seat Grid */}
      <div className="overflow-x-auto pb-4">
        <div className="min-w-fit mx-auto">
          {Object.keys(seatsByRow)
            .sort((a, b) => Number(a) - Number(b))
            .map((rowKey) => {
              const rowNum = Number(rowKey);
              const rowSeats = seatsByRow[rowNum].sort(
                (a, b) => a.position.column - b.position.column
              );
              const leftSeats = rowSeats.filter(
                (s) => s.wing === "Left" || s.position.column < 7
              );
              const rightSeats = rowSeats.filter(
                (s) => s.wing === "Right" || s.position.column >= 7
              );

              return (
                <div
                  key={rowKey}
                  className="flex items-center gap-1 justify-center mb-1.5"
                >
                  <div className="w-8 text-xs font-bold text-amber-500 text-right pr-1">
                    R{String(rowNum).padStart(2, "0")}
                  </div>
                  <div className="flex gap-1">
                    {leftSeats.map((seat) => (
                      <button
                        key={seat._id}
                        onClick={() => handleSeatClick(seat)}
                        className={cn(
                          "w-9 h-9 rounded-md border text-[10px] font-semibold flex items-center justify-center transition-all hover:opacity-80",
                          getAdminSeatColor(seat)
                        )}
                        title={
                          seat.isTaken
                            ? `${seat.student?.name || "Student"} (${seat.seatLabel})`
                            : seat.isReserved
                              ? `Reserved: ${seat.reservedReason || "N/A"}`
                              : `Available: ${seat.seatLabel}`
                        }
                      >
                        {seat.isTaken ? (
                          <Users className="h-3 w-3" />
                        ) : seat.isReserved ? (
                          <Lock className="h-3 w-3" />
                        ) : (
                          seat.position.column + 1
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="w-4" /> {/* Aisle */}
                  <div className="flex gap-1">
                    {rightSeats.map((seat) => (
                      <button
                        key={seat._id}
                        onClick={() => handleSeatClick(seat)}
                        className={cn(
                          "w-9 h-9 rounded-md border text-[10px] font-semibold flex items-center justify-center transition-all hover:opacity-80",
                          getAdminSeatColor(seat)
                        )}
                        title={
                          seat.isTaken
                            ? `${seat.student?.name || "Student"} (${seat.seatLabel})`
                            : seat.isReserved
                              ? `Reserved: ${seat.reservedReason || "N/A"}`
                              : `Available: ${seat.seatLabel}`
                        }
                      >
                        {seat.isTaken ? (
                          <Users className="h-3 w-3" />
                        ) : seat.isReserved ? (
                          <Lock className="h-3 w-3" />
                        ) : (
                          seat.position.column - 6
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-emerald-600/60 border border-emerald-500/60" />
          Available
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-pink-600/80 border border-pink-500" />
          Girls (Occupied)
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-blue-600/80 border border-blue-500" />
          Boys (Occupied)
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-gray-600 border border-gray-500" />
          Reserved
        </div>
      </div>

      {/* Action Dialog */}
      <Dialog open={actionMenuOpen} onOpenChange={setActionMenuOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Manage Seat{" "}
              {selectedSeat?.seatLabel || selectedSeat?.seatNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedSeat && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-4 space-y-2 text-sm">
                <p className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Seat:</span>{" "}
                  <strong className="text-foreground">{selectedSeat.seatLabel}</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Wing:</span>{" "}
                  <span className="text-foreground">
                    {selectedSeat.wing || selectedSeat.side} (
                    {(selectedSeat.wing || selectedSeat.side) === "Left"
                      ? "Girls"
                      : "Boys"}
                    )
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Status:</span>{" "}
                  <span className="text-foreground">
                    {selectedSeat.isTaken
                      ? "Occupied"
                      : selectedSeat.isReserved
                        ? "Reserved"
                        : "Available"}
                  </span>
                </p>
                {selectedSeat.isTaken && selectedSeat.student && (
                  <p className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Student:</span>{" "}
                    <span className="text-foreground">{selectedSeat.student.name || "Unknown"}</span>
                  </p>
                )}
                {selectedSeat.isReserved && selectedSeat.reservedReason && (
                  <p className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Reason:</span>{" "}
                    <span className="text-foreground">{selectedSeat.reservedReason}</span>
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {selectedSeat.isTaken && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="vacateReason" className="text-sm font-medium">
                        Reason for Vacating <span className="text-muted-foreground text-xs">(Optional)</span>
                      </Label>
                      <Input
                        id="vacateReason"
                        placeholder="e.g., Student withdrew, Reassignment..."
                        value={vacateReason}
                        onChange={(e) => setVacateReason(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <Button
                      variant="destructive"
                      onClick={handleVacate}
                      disabled={processing}
                    >
                      {processing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <UserX className="h-4 w-4 mr-2" />
                      )}
                      Vacate Seat
                    </Button>
                  </>
                )}
                {!selectedSeat.isTaken && (
                  <>
                    {!selectedSeat.isReserved && (
                      <div className="space-y-2">
                        <Label htmlFor="reservationReason" className="text-sm font-medium">
                          Reservation Reason <span className="text-muted-foreground text-xs">(Optional)</span>
                        </Label>
                        <Input
                          id="reservationReason"
                          placeholder="e.g., VIP guest, Special needs..."
                          value={reservationReason}
                          onChange={(e) => setReservationReason(e.target.value)}
                          className="w-full"
                        />
                      </div>
                    )}
                    <Button
                      variant={selectedSeat.isReserved ? "outline" : "default"}
                      onClick={handleToggleReservation}
                      disabled={processing}
                    >
                      {processing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : selectedSeat.isReserved ? (
                        <Unlock className="h-4 w-4 mr-2" />
                      ) : (
                        <Lock className="h-4 w-4 mr-2" />
                      )}
                      {selectedSeat.isReserved
                        ? "Remove Reservation"
                        : "Mark as Reserved"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-3 text-center">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className={cn("text-2xl font-bold", color)}>{value}</p>
      </CardContent>
    </Card>
  );
}
