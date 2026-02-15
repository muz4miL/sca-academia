/**
 * Seat Management Page (Admin)
 * 
 * Full-page wrapper with class/session selectors, seat init, and grid management.
 * Uses DashboardLayout for consistent admin UI.
 */

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HeaderBanner } from "@/components/dashboard/HeaderBanner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { classApi, sessionApi } from "@/lib/api";
import { seatService } from "@/services/seatService";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Armchair,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  LayoutGrid,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import SeatManagement from "@/components/admin/SeatManagement";

export default function SeatManagementPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [initDialogOpen, setInitDialogOpen] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  // Fetch classes
  const { data: classesData, isLoading: classesLoading } = useQuery({
    queryKey: ["classes-for-seats"],
    queryFn: () => classApi.getAll({ status: "active" }),
  });

  // Fetch sessions
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ["sessions-for-seats"],
    queryFn: () => sessionApi.getAll(),
  });

  const classes = classesData?.data || [];
  const sessions = sessionsData?.data || [];

  // Find selected class details
  const selectedClass = classes.find((c: any) => c._id === selectedClassId);

  // Initialize seats mutation
  const initMutation = useMutation({
    mutationFn: () =>
      seatService.initializeSeats(
        selectedClassId,
        selectedSessionId
      ),
    onSuccess: (data) => {
      toast.success(`${data.count} seats initialized successfully!`);
      setInitDialogOpen(false);
      setShowGrid(true);
      queryClient.invalidateQueries({ queryKey: ["admin-seats"] });
    },
    onError: (error: any) => {
      console.error("Seat initialization error:", error);
      const errorMsg = error?.response?.data?.message || error?.message || "Failed to initialize seats";
      toast.error(`Initialization failed: ${errorMsg}`, { duration: 5000 });
    },
  });

  const handleLoadGrid = () => {
    if (!selectedClassId || !selectedSessionId) {
      toast.error("Please select both a class and a session");
      return;
    }
    setShowGrid(true);
  };

  const handleInitialize = () => {
    if (!selectedClassId || !selectedSessionId) {
      toast.error("Please select both a class and a session");
      return;
    }
    setInitDialogOpen(true);
  };

  return (
    <DashboardLayout title="Seat Management">
      <HeaderBanner
        title="Seat Management"
        subtitle="Initialize, monitor, and manage classroom seating (13 rows × 14 columns = 182 seats)"
      >
        <Armchair className="h-8 w-8 text-primary" />
      </HeaderBanner>

      <div className="p-4 md:p-6 space-y-6">
        {/* ── Selector Card ── */}
        <Card className="border-border bg-card card-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-primary" />
              Select Class & Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-end">
              {/* Class Selector */}
              <div className="w-full sm:w-64">
                <label className="text-xs text-muted-foreground font-medium mb-1 block">
                  Class
                </label>
                <Select
                  value={selectedClassId}
                  onValueChange={(v) => {
                    setSelectedClassId(v);
                    setShowGrid(false);
                  }}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={classesLoading ? "Loading..." : "Select a class"} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {classes.map((cls: any) => (
                      <SelectItem key={cls._id} value={cls._id}>
                        {cls.classTitle || cls.className}
                        {cls.group ? ` (${cls.group})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Session Selector */}
              <div className="w-full sm:w-64">
                <label className="text-xs text-muted-foreground font-medium mb-1 block">
                  Session
                </label>
                <Select
                  value={selectedSessionId}
                  onValueChange={(v) => {
                    setSelectedSessionId(v);
                    setShowGrid(false);
                  }}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={sessionsLoading ? "Loading..." : "Select a session"} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {sessions.map((s: any) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.sessionName || s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  onClick={handleLoadGrid}
                  disabled={!selectedClassId || !selectedSessionId}
                  className="flex-1 sm:flex-none"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Load Seats
                </Button>
                <Button
                  onClick={handleInitialize}
                  disabled={!selectedClassId || !selectedSessionId}
                  variant="outline"
                  className="flex-1 sm:flex-none border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Initialize 182 Seats
                </Button>
              </div>
            </div>

            {/* Info banner */}
            {selectedClass && (
              <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300/80">
                  <strong>{selectedClass.classTitle || selectedClass.className}</strong>
                  {selectedClass.seatConfig?.seatsInitialized && (
                    <Badge className="ml-2 bg-green-500/20 text-green-400 border-green-500/30" variant="outline">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Seats Initialized
                    </Badge>
                  )}
                  {!selectedClass.seatConfig?.seatsInitialized && (
                    <Badge className="ml-2 bg-amber-500/20 text-amber-400 border-amber-500/30" variant="outline">
                      <AlertTriangle className="h-3 w-3 mr-1" /> Not Initialized
                    </Badge>
                  )}
                  <span className="block mt-1 text-xs text-muted-foreground">
                    Layout: 13 rows × 14 columns (7 Left Wing — Girls, 7 Right Wing — Boys)
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Seat Grid ── */}
        {showGrid && selectedClassId && selectedSessionId && (
          <Card className="border-border bg-card card-shadow overflow-hidden">
            <CardHeader className="pb-2 border-b border-border">
              <CardTitle className="text-lg flex items-center gap-2">
                <Armchair className="h-5 w-5 text-primary" />
                Seat Map — {selectedClass?.classTitle || "Class"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6">
              <SeatManagement
                classId={selectedClassId}
                sessionId={selectedSessionId}
                adminId={user?.userId || "admin"}
              />
            </CardContent>
          </Card>
        )}

        {/* ── Empty State ── */}
        {!showGrid && (
          <Card className="border-dashed border-2 border-border bg-card/50">
            <CardContent className="py-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Armchair className="h-8 w-8 text-primary/60" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Select a Class & Session
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Choose a class and session above to view or initialize the 182-seat grid.
                Each class gets its own dedicated seating map with Left Wing (Girls) and Right Wing (Boys).
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Initialize Confirmation Dialog ── */}
      <Dialog open={initDialogOpen} onOpenChange={setInitDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Initialize Seats?
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              This will set up <strong>182 seats</strong> (13 rows × 14 columns) for{" "}
              <strong>{selectedClass?.classTitle}</strong>.
              <br /><br />
              <span className="text-blue-400/90">
                ℹ️ Each seat will be assigned to either the Girls Wing (left) or Boys Wing (right).
                Students will be able to select their seats after initialization.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setInitDialogOpen(false)}
              disabled={initMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => initMutation.mutate()}
              disabled={initMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {initMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Initialize 182 Seats
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
