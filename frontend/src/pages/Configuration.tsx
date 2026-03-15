/**
 * Configuration Page - Academy Settings
 * Clean single-owner setup: Academy Profile, Session Master, Master Subject Pricing
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HeaderBanner } from "@/components/dashboard/HeaderBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Save,
  Loader2,
  ShieldAlert,
  Building2,
  AlertCircle,
  CheckCircle2,
  Banknote,
  Plus,
  Trash2,
  Lock,
  Calendar,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const Configuration = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // --- Loading State ---
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  // --- Academy Info ---
  const [academyName, setAcademyName] = useState("STANDARD COACHING ACADEMY");
  const [academyAddress, setAcademyAddress] = useState("Peshawar, Pakistan");
  const [academyPhone, setAcademyPhone] = useState("");
  const [systemAdminName, setSystemAdminName] = useState("System Admin");

  // --- Master Subject Pricing ---
  const [defaultSubjectFees, setDefaultSubjectFees] = useState<
    Array<{ name: string; fee: number }>
  >([]);
  const [newSubjectName, setNewSubjectName] = useState("");

  // --- Session Rate Master ---
  const [sessionPrices, setSessionPrices] = useState<
    Array<{ sessionId: string; sessionName: string; price: number }>
  >([]);
  const [sessions, setSessions] = useState<
    Array<{ _id: string; sessionName: string; status: string }>
  >([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Edit dialog removed (session-based pricing, subjects are name-only)



  // System Reset Confirmation State
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Subject Deletion Confirmation State
  const [subjectToDelete, setSubjectToDelete] = useState<{ name: string; index: number } | null>(null);
  const [subjectConfirmOpen, setSubjectConfirmOpen] = useState(false);



  // --- Check Owner Access ---
  useEffect(() => {
    if (user && user.role !== "OWNER") {
      setAccessDenied(true);
      setIsLoading(false);
    }
  }, [user]);

  // --- Fetch Settings on Mount ---
  useEffect(() => {
    const fetchSettings = async () => {
      if (!user || user.role !== "OWNER") return;

      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/config`, {
          credentials: "include",
        });

        if (response.status === 403) {
          setAccessDenied(true);
          return;
        }

        const result = await response.json();

        if (result.success && result.data) {
          const data = result.data;

          // Academy Info
          setAcademyName(data.academyName || "STANDARD COACHING ACADEMY");
          setAcademyAddress(data.academyAddress || "Peshawar, Pakistan");
          setAcademyPhone(data.academyPhone || "");
          setSystemAdminName(data.systemAdminName || "System Admin");

          // Master Subject Pricing
          setDefaultSubjectFees(data.defaultSubjectFees || []);

          // Session Rate Master
          if (data.sessionPrices) {
            setSessionPrices(data.sessionPrices);
          }
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
        toast({
          title: "Error Loading Settings",
          description: "Failed to load configuration. Using defaults.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchSettings();
    }
  }, [user, toast]);

  // --- Fetch Sessions ---
  useEffect(() => {
    const fetchSessions = async () => {
      if (!user || user.role !== "OWNER") return;

      setSessionsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/sessions`, {
          credentials: "include",
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setSessions(result.data);
          }
        }
      } catch (error) {
        console.error("Failed to fetch sessions:", error);
      } finally {
        setSessionsLoading(false);
      }
    };

    fetchSessions();
  }, [user]);

  // --- Instant Save Helper ---
  const saveConfigToBackend = async (
    subjects: Array<{ name: string; fee: number }>,
    sessionPricesOverride?: Array<{ sessionId: string; sessionName: string; price: number }>,
  ) => {
    try {
      const settingsData = {
        academyName,
        academyAddress,
        academyPhone,
        defaultSubjectFees: subjects,
        sessionPrices: sessionPricesOverride || sessionPrices,
      };

      const response = await fetch(`${API_BASE_URL}/api/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settingsData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to save configuration");
      }

      return result.data;
    } catch (error: any) {
      console.error("Save failed:", error);
      throw error;
    }
  };

  // --- Update Session Price ---
  const buildSessionPrices = (
    sessionId: string,
    sessionName: string,
    price: number,
    current: Array<{ sessionId: string; sessionName: string; price: number }>,
  ) => {
    const existingIndex = current.findIndex((sp) => sp.sessionId === sessionId);
    if (existingIndex >= 0) {
      const updated = [...current];
      updated[existingIndex] = { sessionId, sessionName, price };
      return updated;
    }
    return [...current, { sessionId, sessionName, price }];
  };

  const updateSessionPrice = (
    sessionId: string,
    sessionName: string,
    price: number,
  ) => {
    setSessionPrices((prev) =>
      buildSessionPrices(sessionId, sessionName, price, prev),
    );
  };

  // --- Save Settings Handler ---
  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);

      const settingsData = {
        academyName,
        academyAddress,
        academyPhone,
        systemAdminName,
        defaultSubjectFees,
        sessionPrices,
      };

      const response = await fetch(`${API_BASE_URL}/api/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settingsData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Settings Saved",
          description:
            "All configuration changes have been saved successfully.",
          className: "bg-green-50 border-green-200",
        });
      } else {
        throw new Error(result.message || "Failed to save settings");
      }
    } catch (error: any) {
      console.error("Failed to save settings:", error);
      toast({
        title: "Save Failed",
        description:
          error.message || "Could not save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // --- Access Denied Screen ---
  if (accessDenied) {
    return (
      <DashboardLayout title="Configuration">
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 px-4">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-red-100">
            <ShieldAlert className="h-12 w-12 text-red-600" />
          </div>
          <div className="text-center max-w-md">
            <h2 className="text-3xl font-bold text-foreground mb-3">
              Access Denied
            </h2>
            <p className="text-muted-foreground text-lg">
              This configuration page is restricted to the{" "}
              <strong>Owner</strong> only.
            </p>
          </div>
          <Button onClick={() => navigate("/")} size="lg" className="mt-4">
            Return to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Configuration">
      <div className="min-h-screen bg-gray-50/50 pb-12">
        <HeaderBanner
          title="Academy Configuration"
          subtitle="Manage academy profile, session pricing, and subject fees"
        />

        {isLoading ? (
          <div className="mt-12 flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <span className="text-muted-foreground">
              Loading configuration...
            </span>
          </div>
        ) : (
          <div className="mt-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
            {/* Status Bar */}
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">System Configuration</p>
                  <p className="text-sm text-gray-500">Owner Access Only</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                <Lock className="h-4 w-4" />
                <span>Admin</span>
              </div>
            </div>

            {/* ========== Academy Profile ========== */}
            <Card className="shadow-md">
              <CardHeader className="pb-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Academy Profile</CardTitle>
                    <CardDescription>
                      Logo, name, and contact information
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Academy Name</Label>
                  <Input
                    value={academyName}
                    onChange={(e) => setAcademyName(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">System Admin Name</Label>
                  <Input
                    value={systemAdminName}
                    onChange={(e) => setSystemAdminName(e.target.value)}
                    placeholder="e.g. Sir Waqar Baig"
                    className="h-10"
                  />
                  <p className="text-xs text-muted-foreground">
                    This name will be displayed on the main dashboard welcome banner.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Address</Label>
                    <Input
                      value={academyAddress}
                      onChange={(e) => setAcademyAddress(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Phone</Label>
                    <Input
                      value={academyPhone}
                      onChange={(e) => setAcademyPhone(e.target.value)}
                      placeholder="+92 XXX XXXXXXX"
                      className="h-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ========== Session Rate Master ========== */}
            <Card className="shadow-md">
              <CardHeader className="pb-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      Session Rate Master
                    </CardTitle>
                    <CardDescription>
                      Set fixed fees per session for admissions
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {sessionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No sessions found.</p>
                    <p className="text-sm">
                      Create sessions first to set pricing.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
                      <p className="text-sm text-foreground">
                        <strong>Session Pricing:</strong> Set a single fixed
                        price for each session. This price will be used during
                        admissions.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sessions.map((session) => {
                        const currentPrice =
                          sessionPrices.find(
                            (sp) => sp.sessionId === session._id,
                          )?.price || 0;

                        return (
                          <div
                            key={session._id}
                            className={cn(
                              "flex items-center justify-between p-4 rounded-lg border",
                              session.status === "active"
                                ? "bg-green-50 border-green-200"
                                : "bg-gray-50 border-gray-200",
                            )}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-sm">
                                  {session.sessionName}
                                </p>
                                {session.status === "active" && (
                                  <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                                    Active
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="relative w-32">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">
                                  PKR
                                </span>
                                <Input
                                  type="number"
                                  value={currentPrice || ""}
                                  onChange={(e) => {
                                    const newPrice =
                                      Number(e.target.value) || 0;
                                    updateSessionPrice(
                                      session._id,
                                      session.sessionName,
                                      newPrice,
                                    );
                                  }}
                                  onBlur={async (e) => {
                                    const newPrice =
                                      Number(e.target.value) || 0;
                                    const nextSessionPrices = buildSessionPrices(
                                      session._id,
                                      session.sessionName,
                                      newPrice,
                                      sessionPrices,
                                    );
                                    try {
                                      await saveConfigToBackend(
                                        defaultSubjectFees,
                                        nextSessionPrices,
                                      );
                                    } catch (error) {
                                      toast({
                                        title: "Save Failed",
                                        description:
                                          "Could not save session pricing. Please try again.",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                  placeholder="0"
                                  className="h-10 pl-10 pr-2 text-right font-bold"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* ========== Master Subject Pricing ========== */}
            <Card className="shadow-md">
              <CardHeader className="pb-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Banknote className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      Master Subjects
                    </CardTitle>
                    <CardDescription>
                      Global subject list for admissions and classes
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {/* Add New Subject */}
                <div className="flex gap-3">
                  <Input
                    placeholder="Subject Name"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    className="flex-1 h-10"
                  />
                  <Button
                    onClick={async () => {
                      if (!newSubjectName.trim()) {
                        toast({
                          title: "Missing Information",
                          description: "Enter a subject name",
                          variant: "destructive",
                        });
                        return;
                      }
                      if (
                        defaultSubjectFees.some(
                          (s) =>
                            s.name.toLowerCase() ===
                            newSubjectName.trim().toLowerCase(),
                        )
                      ) {
                        toast({
                          title: "Duplicate",
                          description: "Subject already exists",
                          variant: "destructive",
                        });
                        return;
                      }
                      const newSubjects = [
                        ...defaultSubjectFees,
                        {
                          name: newSubjectName.trim(),
                          fee: 0,
                        },
                      ];
                      setDefaultSubjectFees(newSubjects);
                      const subjectName = newSubjectName.trim();
                      setNewSubjectName("");
                      try {
                        await saveConfigToBackend(newSubjects);
                        toast({
                          title: "Saved",
                          description: `${subjectName} added`,
                        });
                      } catch (error) {
                        setDefaultSubjectFees(defaultSubjectFees);
                        setNewSubjectName(subjectName);
                        toast({
                          title: "Error",
                          description: "Failed to save",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="h-10 px-4 bg-primary hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>

                {/* Subject List */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {defaultSubjectFees.map((subject, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                    >
                      <div>
                        <p className="font-semibold text-sm">{subject.name}</p>
                        <p className="text-xs text-gray-500">Included</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600"
                          onClick={() => {
                            setSubjectToDelete({ name: subject.name, index });
                            setSubjectConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ========== SAVE BUTTON ========== */}
            <div className="flex justify-end pt-6 border-t mt-8">
              <Button
                size="lg"
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="h-12 px-8 bg-primary hover:bg-primary/90"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save All Changes
                  </>
                )}
              </Button>
            </div>

            {/* ========== DANGER ZONE ========== */}
            <Card className="border-red-200 bg-red-50 mt-12">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription className="text-red-600">
                  These actions cannot be undone. Use only for testing and
                  cleanup.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-red-100 border border-red-300 rounded-lg p-4">
                  <p className="text-sm text-red-800 font-medium mb-4">
                    Reset All Data
                  </p>
                  <p className="text-xs text-red-700 mb-4">
                    This will permanently delete all transactions, fee records,
                    students, and notifications. All counters will reset to 0.
                  </p>
                  <Button
                    variant="destructive"
                    className="w-full h-12 text-lg font-bold shadow-lg"
                    onClick={() => setResetConfirmOpen(true)}
                  >
                    RESET ALL DATA
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Subject editing removed for session-based pricing */}
      </div>

      {/* --- REUSABLE CUSTOM DIALOGS (PREMIUM UI) --- */}

      {/* System Reset Confirmation */}
      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent className="max-w-md border-4 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-red-600 flex items-center gap-2 uppercase tracking-tighter">
              <AlertCircle className="h-8 w-8 fill-red-600 text-white" />
              Extreme Warning
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-900 font-medium text-lg border-l-4 border-red-500 pl-4 py-2 bg-red-50/50">
              This will <span className="text-red-600 font-black">WIPE EVERYTHING</span>.
              <br /><br />
              All financial records, student data, and account balances will be permanently deleted. This is for academy owners during terminal reset only.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="h-12 font-semibold">Cancel Safety</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  const response = await fetch(
                    `${API_BASE_URL}/api/finance/reset-system`,
                    {
                      method: "POST",
                      credentials: "include",
                      headers: {
                        "Content-Type": "application/json",
                      },
                    },
                  );

                  const data = await response.json();

                  if (data.success) {
                    toast({
                      title: "System Reset Complete",
                      description: "Database wiped. All balances reset to 0. Reloading...",
                      className: "bg-green-50 border-green-200",
                    });
                    setTimeout(() => {
                      window.location.reload();
                    }, 2000);
                  } else {
                    toast({
                      title: "Reset Failed",
                      description: data.message || "Failed to reset system",
                      variant: "destructive",
                    });
                  }
                } catch (error) {
                  console.error("Reset error:", error);
                  toast({
                    title: "Error",
                    description: "Failed to reset system",
                    variant: "destructive",
                  });
                } finally {
                  setResetConfirmOpen(false);
                }
              }}
              className="h-12 bg-red-600 hover:bg-red-700 text-white font-black uppercase"
            >
              WIPE DATABASE
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Subject Deletion Confirmation */}
      <AlertDialog open={subjectConfirmOpen} onOpenChange={setSubjectConfirmOpen}>
        <AlertDialogContent className="max-w-md border-b-4 border-red-500 shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Remove Subject
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Are you sure you want to remove <span className="font-bold text-slate-900">{subjectToDelete?.name}</span>?
              This will update the default subjects for all future sessions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!subjectToDelete) return;
                const { index, name } = subjectToDelete;
                const newSubjects = defaultSubjectFees.filter((_, i) => i !== index);
                setDefaultSubjectFees(newSubjects);
                try {
                  await saveConfigToBackend(newSubjects);
                  toast({
                    title: "Subject Removed",
                    description: `${name} has been taken off the list.`,
                    className: "bg-green-50 border-green-200"
                  });
                } catch (error) {
                  setDefaultSubjectFees(defaultSubjectFees);
                  toast({
                    title: "Error",
                    description: "Something went wrong while removing the subject.",
                    variant: "destructive",
                  });
                } finally {
                  setSubjectConfirmOpen(false);
                  setSubjectToDelete(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Remove Subject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


    </DashboardLayout>
  );
};

export default Configuration;
