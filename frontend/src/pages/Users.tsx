/**
 * Users Page - Staff Access Management
 * Owner-only page for creating and managing staff accounts with granular permissions.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Power,
  Pencil,
  UserCog,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// All available permissions for the permission matrix
const allPermissions = [
  { key: "dashboard", label: "Dashboard" },
  { key: "admissions", label: "Admissions" },
  { key: "registrations", label: "Registrations" },
  { key: "students", label: "Students" },
  { key: "attendance", label: "Attendance" },
  { key: "teachers", label: "Teachers" },
  { key: "finance", label: "Finance" },
  { key: "classes", label: "Classes" },
  { key: "timetable", label: "Timetable" },
  { key: "sessions", label: "Sessions" },
  { key: "inquiries", label: "Inquiries" },
  { key: "payroll", label: "Payroll" },
  { key: "inventory", label: "Inventory" },
  { key: "configuration", label: "Configuration" },
  { key: "website", label: "Public Website" },
  { key: "gatekeeper", label: "Gatekeeper Station" },
];

export default function Users() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // --- Data ---
  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);

  // --- Dialog state ---
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // --- Form fields ---
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(["dashboard"]);

  // --- Delete confirmation ---
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<{ id: string; name: string } | null>(null);

  // --- Expanded permissions rows ---
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // --- Fetch staff ---
  useEffect(() => {
    if (!user || user.role !== "OWNER") return;

    const fetchStaff = async () => {
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

  // --- Owner-only guard (after all hooks) ---
  if (user?.role !== "OWNER") {
    return (
      <DashboardLayout title="Users">
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <AlertCircle className="h-16 w-16 text-red-500" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">
            Only the Owner can access User Management.
          </p>
          <Button onClick={() => navigate("/")}>Go to Dashboard</Button>
        </div>
      </DashboardLayout>
    );
  }

  // --- Helpers ---
  const resetForm = () => {
    setFullName("");
    setUsername("");
    setPassword("");
    setShowPassword(false);
    setSelectedPermissions(["dashboard"]);
    setIsEditMode(false);
    setEditingStaffId(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (staff: any) => {
    setIsEditMode(true);
    setEditingStaffId(staff._id || staff.userId);
    setFullName(staff.fullName);
    setUsername(staff.username);
    setPassword("");
    setShowPassword(false);
    setSelectedPermissions(staff.permissions || ["dashboard"]);
    setDialogOpen(true);
  };

  const togglePermission = (permKey: string) => {
    if (permKey === "dashboard") return;
    setSelectedPermissions((prev) =>
      prev.includes(permKey) ? prev.filter((p) => p !== permKey) : [...prev, permKey]
    );
  };

  const toggleRowExpanded = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // --- Create / Update ---
  const handleSave = async () => {
    if (!fullName.trim() || !username.trim()) {
      toast({ title: "Missing Information", description: "Please fill in username and full name.", variant: "destructive" });
      return;
    }
    if (!isEditMode && !password) {
      toast({ title: "Missing Password", description: "Password is required for new staff accounts.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const endpoint = isEditMode
        ? `${API_BASE_URL}/api/auth/staff/${editingStaffId}`
        : `${API_BASE_URL}/api/auth/create-staff`;
      const method = isEditMode ? "PATCH" : "POST";

      const body: any = {
        username: username.trim(),
        fullName: fullName.trim(),
        permissions: selectedPermissions,
      };
      if (password) body.password = password;

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: isEditMode ? "Staff Updated" : "Staff Created",
          description: isEditMode
            ? `${fullName.trim()} updated with ${selectedPermissions.length} permissions.`
            : `Account for ${fullName.trim()} created with ${selectedPermissions.length} permissions.`,
          className: "bg-green-50 border-green-200",
        });

        if (isEditMode) {
          setStaffList((prev) =>
            prev.map((s) =>
              (s._id === editingStaffId || s.userId === editingStaffId) ? result.user : s
            )
          );
        } else {
          setStaffList((prev) => [result.user, ...prev]);
        }

        setDialogOpen(false);
        resetForm();
      } else {
        toast({
          title: `Error ${isEditMode ? "Updating" : "Creating"} Staff`,
          description: result.message || `Failed to ${isEditMode ? "update" : "create"} staff account.`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Network Error",
        description: error.message || `Failed to ${isEditMode ? "update" : "create"} staff account.`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // --- Toggle active/inactive ---
  const handleToggleStaff = async (staffId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/staff/${staffId}/toggle`, {
        method: "PATCH",
        credentials: "include",
      });
      const result = await response.json();
      if (result.success) {
        setStaffList((prev) =>
          prev.map((s) =>
            (s._id === staffId || s.userId === staffId) ? { ...s, isActive: !s.isActive } : s
          )
        );
        toast({ title: "Updated", description: result.message, className: "bg-green-50 border-green-200" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update staff status.", variant: "destructive" });
    }
  };

  // --- Delete ---
  const handleDeleteStaff = (staffId: string, staffName: string) => {
    setStaffToDelete({ id: staffId, name: staffName });
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteStaff = async () => {
    if (!staffToDelete) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/staff/${staffToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const result = await response.json();
      if (result.success) {
        setStaffList((prev) => prev.filter((s) => s._id !== staffToDelete.id && s.userId !== staffToDelete.id));
        toast({
          title: "Staff Deleted",
          description: `${staffToDelete.name} has been removed from the system.`,
          className: "bg-green-50 border-green-200",
        });
      } else {
        toast({ title: "Error", description: result.message || "Failed to delete staff account.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete staff account.", variant: "destructive" });
    } finally {
      setDeleteConfirmOpen(false);
      setStaffToDelete(null);
    }
  };

  return (
    <DashboardLayout title="Users">
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <UserCog className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
              <p className="text-sm text-muted-foreground">
                Create and manage staff accounts with granular permissions
              </p>
            </div>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>

        {/* User Table */}
        <Card className="shadow-md">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg">Staff Accounts ({staffList.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {staffLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : staffList.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <UserCog className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No staff accounts yet.</p>
                <p className="text-sm">Click "Add User" to create the first operator account.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffList.map((staff: any) => {
                    const id = staff._id || staff.userId;
                    const isExpanded = expandedRows.has(id);
                    return (
                      <TableRow key={id} className={cn(!staff.isActive && "opacity-60")}>
                        <TableCell className="font-medium">{staff.fullName}</TableCell>
                        <TableCell className="text-muted-foreground">@{staff.username}</TableCell>
                        <TableCell>
                          <Badge variant={staff.isActive ? "default" : "secondary"} className={cn(
                            staff.isActive
                              ? "bg-green-100 text-green-700 hover:bg-green-100"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-100"
                          )}>
                            {staff.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => toggleRowExpanded(id)}
                            className="flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            {staff.permissions?.length || 0} permissions
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                          {isExpanded && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {(staff.permissions || []).map((p: string) => (
                                <Badge key={p} variant="outline" className="text-xs">
                                  {allPermissions.find((ap) => ap.key === p)?.label || p}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {staff.lastLogin
                            ? new Date(staff.lastLogin).toLocaleDateString("en-PK", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(staff)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleToggleStaff(id)}
                              title={staff.isActive ? "Deactivate" : "Activate"}
                            >
                              <Power className={cn("h-4 w-4", staff.isActive ? "text-red-500" : "text-green-500")} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDeleteStaff(id, staff.fullName)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-400 hover:text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== Add / Edit Dialog ===== */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm(); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Staff Account" : "Add New User"}</DialogTitle>
            <DialogDescription>
              {isEditMode ? "Update the staff member's details and permissions." : "Create a new staff login account with module-level access."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Full Name */}
            <div className="space-y-1">
              <Label>Full Name *</Label>
              <Input placeholder="e.g. Ali Khan" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>

            {/* Username */}
            <div className="space-y-1">
              <Label>Username *</Label>
              <Input
                placeholder="e.g. ali.khan"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isEditMode}
                autoComplete="off"
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <Label>{isEditMode ? "Password (leave blank to keep current)" : "Password *"}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={isEditMode ? "Leave blank to keep current" : "Min 6 characters"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Permissions Grid */}
            <div className="space-y-2">
              <Label className="font-semibold">Access Permissions</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-muted/50 rounded-lg border">
                {allPermissions.map((perm) => (
                  <div key={perm.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`perm-${perm.key}`}
                      checked={selectedPermissions.includes(perm.key)}
                      onCheckedChange={() => togglePermission(perm.key)}
                      disabled={perm.key === "dashboard"}
                    />
                    <label
                      htmlFor={`perm-${perm.key}`}
                      className="text-xs font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {perm.label}
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                ✓ {selectedPermissions.length} permissions selected
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? "Updating..." : "Creating..."}
                </>
              ) : (
                isEditMode ? "Save Changes" : "Create User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Delete Confirmation ===== */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="max-w-md border-2 border-red-100 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Confirm Staff Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Are you sure you want to delete <span className="font-bold text-red-600">{staffToDelete?.name}</span>?
              This action <span className="underline font-semibold">cannot be undone</span> and all access for this user will be revoked immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteStaff}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              Yes, Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
