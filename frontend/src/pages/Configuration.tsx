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
import { Checkbox } from "@/components/ui/checkbox";
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
  Users,
  Eye,
  EyeOff,
  Power,
  Pencil,
  X,
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
  const [academyName, setAcademyName] = useState("SCIENCES COACHING ACADEMY");
  const [academyAddress, setAcademyAddress] = useState("Peshawar, Pakistan");
  const [academyPhone, setAcademyPhone] = useState("");

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

  // --- Staff Access Management ---
  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [newStaffUsername, setNewStaffUsername] = useState("");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [newStaffFullName, setNewStaffFullName] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);

  // Edit Mode & Permissions
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(["dashboard"]);

  // Delete Confirmation State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<{ id: string; name: string } | null>(null);

  // System Reset Confirmation State
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Subject Deletion Confirmation State
  const [subjectToDelete, setSubjectToDelete] = useState<{ name: string; index: number } | null>(null);
  const [subjectConfirmOpen, setSubjectConfirmOpen] = useState(false);

  // All available permissions for the permission matrix
  const allPermissions = [
    { key: "dashboard", label: "Dashboard" },
    { key: "admissions", label: "Admissions" },
    { key: "registrations", label: "Registrations" },
    { key: "students", label: "Students" },
    { key: "attendance", label: "Attendance" },
    { key: "teachers", label: "Teachers" },
    { key: "finance", label: "Finance & Expenses" },
    { key: "collections", label: "Student Collections" },
    { key: "classes", label: "Classes" },
    { key: "timetable", label: "Timetable" },
    { key: "sessions", label: "Sessions" },
    { key: "inquiries", label: "Inquiries" },
    { key: "payroll", label: "Payroll (Admin Only)" },
    { key: "configuration", label: "Configuration (Admin Only)" },
  ];

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
          setAcademyName(data.academyName || "SCIENCES COACHING ACADEMY");
          setAcademyAddress(data.academyAddress || "Peshawar, Pakistan");
          setAcademyPhone(data.academyPhone || "");

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

  // --- Fetch Staff Members ---
  useEffect(() => {
    const fetchStaff = async () => {
      if (!user || user.role !== "OWNER") return;

      setStaffLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/staff`, {
          credentials: "include",
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.staff) {
            setStaffList(result.staff);
          }
        }
      } catch (error) {
        console.error("Failed to fetch staff:", error);
      } finally {
        setStaffLoading(false);
      }
    };

    fetchStaff();
  }, [user]);

  // --- Create/Update Staff Handler ---
  const handleCreateOrUpdateStaff = async () => {
    if (
      !newStaffUsername.trim() ||
      !newStaffFullName.trim()
    ) {
      toast({
        title: "Missing Information",
        description: "Please fill in username and full name.",
        variant: "destructive",
      });
      return;
    }

    // Password is required for new staff, optional for edit
    if (!isEditMode && !newStaffPassword) {
      toast({
        title: "Missing Password",
        description: "Password is required for new staff accounts.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingStaff(true);
    try {
      const endpoint = isEditMode
        ? `${API_BASE_URL}/api/auth/staff/${editingStaffId}`
        : `${API_BASE_URL}/api/auth/create-staff`;

      const method = isEditMode ? "PATCH" : "POST";

      const body: any = {
        username: newStaffUsername.trim(),
        fullName: newStaffFullName.trim(),
        permissions: selectedPermissions,
      };

      // Only include password if it's provided (required for create, optional for edit)
      if (newStaffPassword) {
        body.password = newStaffPassword;
      }

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.success) {
        const permCount = selectedPermissions.length;
        toast({
          title: isEditMode ? "Staff Updated" : "Staff Created",
          description: isEditMode
            ? `${newStaffFullName.trim()} updated with ${permCount} permissions.`
            : `Account for ${newStaffFullName.trim()} created with ${permCount} permissions.`,
          className: "bg-green-50 border-green-200",
        });

        // Reset form
        setNewStaffUsername("");
        setNewStaffPassword("");
        setNewStaffFullName("");
        setShowNewPassword(false);
        setSelectedPermissions(["dashboard"]);
        setIsEditMode(false);
        setEditingStaffId(null);

        // Refresh staff list
        if (isEditMode) {
          setStaffList((prev) =>
            prev.map((s) =>
              s._id === editingStaffId || s.userId === editingStaffId
                ? result.user
                : s
            )
          );
        } else {
          setStaffList((prev) => [result.user, ...prev]);
        }
      } else {
        console.error("❌ Staff creation failed:", result);
        toast({
          title: "Error Creating Staff",
          description: result.message || `Failed to ${isEditMode ? 'update' : 'create'} staff account.`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("❌ Staff creation error:", error);
      toast({
        title: "Network Error",
        description: error.message || `Failed to ${isEditMode ? 'update' : 'create'} staff account.`,
        variant: "destructive",
      });
    } finally {
      setIsCreatingStaff(false);
    }
  };

  // --- Edit Staff Handler ---
  const handleEditStaff = (staff: any) => {
    setIsEditMode(true);
    setEditingStaffId(staff._id || staff.userId);
    setNewStaffUsername(staff.username);
    setNewStaffFullName(staff.fullName);
    setNewStaffPassword(""); // Leave blank to keep current password
    setSelectedPermissions(staff.permissions || ["dashboard"]);
    setShowNewPassword(false);

    // Scroll to form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --- Cancel Edit Handler ---
  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditingStaffId(null);
    setNewStaffUsername("");
    setNewStaffPassword("");
    setNewStaffFullName("");
    setSelectedPermissions(["dashboard"]);
    setShowNewPassword(false);
  };

  // --- Toggle Permission ---
  const togglePermission = (permKey: string) => {
    setSelectedPermissions((prev) => {
      if (prev.includes(permKey)) {
        // Don't allow removing dashboard - everyone needs it
        if (permKey === "dashboard") {
          toast({
            title: "Dashboard Required",
            description: "All users must have dashboard access.",
            variant: "destructive",
          });
          return prev;
        }
        return prev.filter((p) => p !== permKey);
      } else {
        return [...prev, permKey];
      }
    });
  };

  // --- Toggle Staff Status ---
  const handleToggleStaff = async (staffId: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/staff/${staffId}/toggle`,
        {
          method: "PATCH",
          credentials: "include",
        },
      );

      const result = await response.json();

      if (result.success) {
        setStaffList((prev) =>
          prev.map((s) =>
            s._id === staffId || s.userId === staffId
              ? { ...s, isActive: !s.isActive }
              : s,
          ),
        );
        toast({
          title: "Updated",
          description: result.message,
          className: "bg-green-50 border-green-200",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update staff status.",
        variant: "destructive",
      });
    }
  };

  // --- Delete Staff ---
  const handleDeleteStaff = (staffId: string, staffName: string) => {
    setStaffToDelete({ id: staffId, name: staffName });
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteStaff = async () => {
    if (!staffToDelete) return;

    const { id: staffId, name: staffName } = staffToDelete;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/staff/${staffId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const result = await response.json();

      if (result.success) {
        setStaffList((prev) => prev.filter((s) => s._id !== staffId && s.userId !== staffId));
        toast({
          title: "Staff Deleted",
          description: `${staffName} has been removed from the system.`,
          className: "bg-green-50 border-green-200",
        });
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to delete staff account.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete staff account.",
        variant: "destructive",
      });
    } finally {
      setDeleteConfirmOpen(false);
      setStaffToDelete(null);
    }
  };


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

            {/* ========== Staff Access Management ========== */}
            <Card className="shadow-md">
              <CardHeader className="pb-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      Staff Access Management
                    </CardTitle>
                    <CardDescription>
                      Create and manage operator/staff login accounts with granular permissions
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Create/Edit Staff Form */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-foreground">
                      {isEditMode ? "Edit Staff Account" : "Create New Staff Account"}
                    </p>
                    {isEditMode && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        className="h-8 text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>

                  {/* Basic Info */}
                  <div className="grid gap-3 sm:grid-cols-3 mb-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Full Name *</Label>
                      <Input
                        placeholder="e.g. Ali Khan"
                        value={newStaffFullName}
                        onChange={(e) => setNewStaffFullName(e.target.value)}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Username *</Label>
                      <Input
                        placeholder="e.g. ali.khan"
                        value={newStaffUsername}
                        onChange={(e) => setNewStaffUsername(e.target.value)}
                        className="h-10"
                        disabled={isEditMode}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">
                        Password {isEditMode ? "(leave blank to keep current)" : "*"}
                      </Label>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          placeholder={isEditMode ? "Leave blank to keep" : "Min 6 characters"}
                          value={newStaffPassword}
                          onChange={(e) => setNewStaffPassword(e.target.value)}
                          className="h-10 pr-10"
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Permission Matrix */}
                  <div className="space-y-2 mb-4">
                    <Label className="text-xs font-semibold">Access Permissions</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Select which tabs this staff member can access
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-white rounded-lg border">
                      {allPermissions.map((perm) => (
                        <div
                          key={perm.key}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`perm-${perm.key}`}
                            checked={selectedPermissions.includes(perm.key)}
                            onCheckedChange={() => togglePermission(perm.key)}
                            disabled={perm.key === "dashboard"}
                          />
                          <label
                            htmlFor={`perm-${perm.key}`}
                            className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {perm.label}
                          </label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      ✓ {selectedPermissions.length} permissions selected
                    </p>
                  </div>

                  <Button
                    className="w-full bg-primary hover:bg-primary/90"
                    onClick={handleCreateOrUpdateStaff}
                    disabled={isCreatingStaff}
                  >
                    {isCreatingStaff ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isEditMode ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      <>
                        {isEditMode ? (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Update Staff Account
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Staff Account
                          </>
                        )}
                      </>
                    )}
                  </Button>
                </div>

                {/* Staff List */}
                {staffLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : staffList.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No staff accounts yet.</p>
                    <p className="text-sm">
                      Create your first operator account above.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">
                      Active Staff ({staffList.length})
                    </p>
                    {staffList.map((staff: any) => (
                      <div
                        key={staff._id || staff.userId}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-lg border",
                          staff.isActive
                            ? "bg-green-50 border-green-200"
                            : "bg-gray-50 border-gray-200 opacity-60",
                        )}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-full text-white font-bold text-sm",
                              staff.isActive ? "bg-primary" : "bg-gray-400",
                            )}
                          >
                            {(staff.fullName || "S")
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-sm">
                              {staff.fullName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              @{staff.username} • {staff.role || "STAFF"}
                            </p>
                            <p className="text-xs text-primary mt-1">
                              {staff.permissions?.length || 0} permissions
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "px-2 py-0.5 text-xs rounded-full font-medium",
                              staff.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-200 text-gray-600",
                            )}
                          >
                            {staff.isActive ? "Active" : "Disabled"}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditStaff(staff)}
                            title="Edit permissions"
                          >
                            <Pencil className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              handleToggleStaff(staff._id || staff.userId)
                            }
                            title={
                              staff.isActive
                                ? "Disable account"
                                : "Enable account"
                            }
                          >
                            <Power
                              className={cn(
                                "h-4 w-4",
                                staff.isActive
                                  ? "text-red-500"
                                  : "text-green-500",
                              )}
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              handleDeleteStaff(
                                staff._id || staff.userId,
                                staff.fullName
                              )
                            }
                            title="Delete staff account"
                          >
                            <Trash2 className="h-4 w-4 text-red-400 hover:text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

      {/* Staff Deletion Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="max-w-md border-2 border-red-100 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-red-500" />
              Confirm Staff Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 text-lg py-2">
              Are you sure you want to delete <span className="font-bold text-red-600">{staffToDelete?.name}</span>?
              This action <span className="underline font-semibold">cannot be undone</span> and all access for this user will be revoked immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="h-12 border-slate-200 text-slate-600 font-medium hover:bg-slate-50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteStaff}
              className="h-12 bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-200"
            >
              Yes, Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
