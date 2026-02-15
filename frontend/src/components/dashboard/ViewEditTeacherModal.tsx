import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  User,
  DollarSign,
  Loader2,
  Eye,
  Edit,
  Camera,
  UserCircle,
  Calendar,
  PhoneCall,
  BookOpen,
} from "lucide-react";
import { teacherApi, settingsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ImageCapture } from "@/components/shared/ImageCapture";
import { cn } from "@/lib/utils";

interface ViewEditTeacherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: any | null;
  mode: "view" | "edit";
}

type CompensationType = "percentage" | "fixed";

export const ViewEditTeacherModal = ({
  open,
  onOpenChange,
  teacher,
  mode: initialMode,
}: ViewEditTeacherModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"view" | "edit">(initialMode);

  // Fetch configuration for dynamic subjects
  const { data: configData } = useQuery({
    queryKey: ["config"],
    queryFn: settingsApi.get,
    staleTime: 5 * 60 * 1000,
  });

  const subjects = configData?.data?.defaultSubjectFees || [];

  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [compType, setCompType] = useState<CompensationType>("percentage");
  const [teacherShare, setTeacherShare] = useState("70");
  const [academyShare, setAcademyShare] = useState("30");
  const [fixedSalary, setFixedSalary] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [profitShare, setProfitShare] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Populate form when teacher data changes
  useEffect(() => {
    if (teacher && open) {
      setName(teacher.name || "");
      setPhone(teacher.phone || "");
      setSubject(teacher.subject || "");
      setJoiningDate(
        teacher.joiningDate ? teacher.joiningDate.split("T")[0] : "",
      );
      setProfileImage(teacher.profileImage || null);
      setStatus(teacher.status || "active");

      const comp = teacher.compensation;
      if (comp) {
        setCompType(comp.type || "percentage");
        setTeacherShare(String(comp.teacherShare || 70));
        setAcademyShare(String(comp.academyShare || 30));
        setFixedSalary(String(comp.fixedSalary || ""));
        setBaseSalary(String(comp.baseSalary || ""));
        setProfitShare(String(comp.profitShare || ""));
      }
    }
  }, [teacher, open]);

  // Reset mode when modal opens
  useEffect(() => {
    if (open) {
      setMode(initialMode);
    }
  }, [open, initialMode]);

  // Auto-calculate academyShare when teacherShare changes (for percentage mode)
  useEffect(() => {
    if (compType === "percentage" && teacherShare && mode === "edit") {
      const teacherValue = Number(teacherShare);
      if (!isNaN(teacherValue) && teacherValue >= 0 && teacherValue <= 100) {
        const calculatedAcademyShare = (100 - teacherValue).toString();
        setAcademyShare(calculatedAcademyShare);
      }
    }
  }, [teacherShare, compType, mode]);

  // Update mutation
  const updateTeacherMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      teacherApi.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast({
        title: "✅ Teacher Updated",
        description: `${data.data.name} has been updated successfully.`,
        className: "bg-green-50 border-green-200",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "❌ Update Failed",
        description: error.message || "Could not update teacher.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!teacher?._id) return;

    if (!name || !phone || !subject) {
      toast({
        title: "⚠️ Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Build compensation object
    let compensation: any = { type: compType };

    if (compType === "percentage") {
      const tShare = Number(teacherShare);
      const aShare = Number(academyShare);

      // Bulletproof 100% check
      if (tShare + aShare !== 100) {
        toast({
          title: "🧮 Math Error",
          description:
            "Total split must be exactly 100%. Currently: " +
            (tShare + aShare) +
            "%",
          variant: "destructive",
        });
        return;
      }

      compensation.teacherShare = tShare;
      compensation.academyShare = aShare;
    } else if (compType === "fixed") {
      compensation.fixedSalary = Number(fixedSalary);
    }

    const teacherData = {
      name,
      phone,
      subject,
      joiningDate,
      status,
      compensation,
      profileImage: profileImage || null,
    };

    updateTeacherMutation.mutate({ id: teacher._id, data: teacherData });
  };

  const isReadOnly = mode === "view";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] p-0 gap-0 overflow-hidden bg-white text-foreground max-h-[90vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="px-8 py-6 border-b bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              {mode === "view" ? (
                <Eye className="h-5 w-5 text-primary" />
              ) : (
                <Edit className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900">
                {mode === "view" ? "Teacher Details" : "Edit Teacher"}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 mt-1">
                {mode === "view"
                  ? "View teacher information and compensation details."
                  : "Update teacher information and compensation details."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="grid grid-cols-12 gap-8">
            {/* Left Column - Profile (4 cols) */}
            <div className="col-span-12 md:col-span-4 lg:col-span-4 space-y-6">
              <div className="flex flex-col items-center">
                <Label className="text-sm font-semibold text-gray-700 mb-3 w-full text-left">
                  Profile Photo
                </Label>
                <div className="w-full aspect-[3/4] rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/50 flex flex-col items-center justify-center p-4 hover:bg-gray-50 hover:border-primary/50 transition-all group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-gray-100/50 pointer-events-none" />

                  {profileImage ? (
                    <div className="relative w-full h-full rounded-xl overflow-hidden shadow-sm">
                      <img
                        src={profileImage}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center z-10">
                      <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Camera className="h-7 w-7 text-gray-400" />
                      </div>
                      <span className="text-sm font-medium text-gray-600">
                        {isReadOnly ? "No Photo" : "Upload Photo"}
                      </span>
                      {!isReadOnly && (
                        <span className="text-xs text-gray-400 mt-1">
                          JPG or PNG
                        </span>
                      )}
                    </div>
                  )}

                  {/* Invisible trigger to open camera/upload (edit mode only) */}
                  {!isReadOnly && (
                    <div className="absolute inset-0 z-20 cursor-pointer">
                      <ImageCapture
                        value={profileImage || undefined}
                        onChange={(img) => setProfileImage(img)}
                        className="opacity-0 w-full h-full"
                      />
                    </div>
                  )}
                </div>
                {!isReadOnly && (
                  <p className="text-xs text-gray-400 mt-3 text-center">
                    Max file size: 2MB
                  </p>
                )}
              </div>
            </div>

            {/* Right Column - Form (8 cols) */}
            <div className="col-span-12 md:col-span-8 lg:col-span-8 space-y-8">
              {/* Section 1: Personal Details */}
              <section>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <UserCircle className="h-4 w-4 text-gray-400" /> Personal
                  Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label
                      htmlFor="edit-name"
                      className="text-sm font-medium text-gray-700"
                    >
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="edit-name"
                        placeholder="e.g. Dr. Sarah Ali"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isReadOnly}
                        className="pl-9 h-10 focus-visible:ring-primary/20"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="edit-phone"
                      className="text-sm font-medium text-gray-700"
                    >
                      Phone Number <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <PhoneCall className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="edit-phone"
                        placeholder="+92 300 1234567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={isReadOnly}
                        className="pl-9 h-10 focus-visible:ring-primary/20"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="edit-subject"
                      className="text-sm font-medium text-gray-700"
                    >
                      Subject <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                      <Select
                        value={subject}
                        onValueChange={setSubject}
                        disabled={isReadOnly}
                      >
                        <SelectTrigger className="pl-9 h-10 focus-visible:ring-primary/20">
                          <SelectValue placeholder="Select Subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.length > 0 ? (
                            subjects.map((subj: any) => (
                              <SelectItem
                                key={subj.name}
                                value={subj.name.toLowerCase()}
                              >
                                {subj.name}
                              </SelectItem>
                            ))
                          ) : (
                            <>
                              <SelectItem value="biology">Biology</SelectItem>
                              <SelectItem value="chemistry">
                                Chemistry
                              </SelectItem>
                              <SelectItem value="physics">Physics</SelectItem>
                              <SelectItem value="mathematics">
                                Mathematics
                              </SelectItem>
                              <SelectItem value="english">English</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="edit-date"
                      className="text-sm font-medium text-gray-700"
                    >
                      Joining Date
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <Input
                        id="edit-date"
                        type="date"
                        value={joiningDate}
                        onChange={(e) => setJoiningDate(e.target.value)}
                        disabled={isReadOnly}
                        className="pl-9 h-10 focus-visible:ring-primary/20 text-gray-600"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 2: Status Toggle */}
              <section className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${status === "active" ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-500"}`}
                  >
                    <div className="w-2 h-2 rounded-full bg-current" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Teacher Status
                    </p>
                    <p className="text-xs text-gray-500">
                      {status === "active"
                        ? "Visible and active in system"
                        : "Hidden from schedules"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={status === "active"}
                  onCheckedChange={(checked) =>
                    !isReadOnly && setStatus(checked ? "active" : "inactive")
                  }
                  disabled={isReadOnly}
                  className="data-[state=checked]:bg-green-500"
                />
              </section>

              {/* Section 3: Compensation Package */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" /> Compensation
                  Package
                </h3>

                {/* Type Selection Cards */}
                <RadioGroup
                  value={compType}
                  onValueChange={(value) =>
                    !isReadOnly && setCompType(value as CompensationType)
                  }
                  className="grid grid-cols-2 gap-3"
                  disabled={isReadOnly}
                >
                  {[
                    {
                      value: "percentage",
                      label: "Percentage",
                      icon: "%",
                      desc: "70/30 Split",
                    },
                    {
                      value: "fixed",
                      label: "Fixed Salary",
                      icon: "PKR",
                      desc: "Monthly amount",
                    },
                  ].map((type) => (
                    <div key={type.value}>
                      <RadioGroupItem
                        value={type.value}
                        id={`edit-comp-${type.value}`}
                        className="peer sr-only"
                        disabled={isReadOnly}
                      />
                      <Label
                        htmlFor={`edit-comp-${type.value}`}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all h-full",
                          isReadOnly
                            ? "cursor-default"
                            : "cursor-pointer hover:bg-gray-50 hover:border-gray-300",
                          "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary",
                          "border-gray-200 text-gray-500",
                        )}
                      >
                        <span className="text-xs font-bold uppercase tracking-wide mb-1">
                          {type.icon}
                        </span>
                        <span className="text-sm font-medium">
                          {type.label}
                        </span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                {/* Dynamic Inputs */}
                <div className="mt-4 bg-white rounded-xl border border-gray-200 p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                  {compType === "percentage" && (
                    <div className="space-y-4">
                      {/* Visual Split Bar */}
                      <div className="relative h-3 w-full bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                        <div
                          className="h-full bg-primary transition-all duration-500 ease-out"
                          style={{ width: `${teacherShare}%` }}
                        />
                        <div
                          className="h-full bg-blue-400 transition-all duration-500 ease-out"
                          style={{ width: `${academyShare}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs font-semibold text-gray-500">
                        <span className="text-primary">
                          Teacher Share ({teacherShare}%)
                        </span>
                        <span className="text-blue-500">
                          Academy Share ({academyShare}%)
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-gray-500 uppercase">
                            Teacher Cut
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={teacherShare}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val !== "") {
                                  const clamped = Math.min(
                                    100,
                                    Math.max(0, Number(val)),
                                  );
                                  setTeacherShare(clamped.toString());
                                } else {
                                  setTeacherShare(val);
                                }
                              }}
                              disabled={isReadOnly}
                              className="h-11 font-bold text-primary border-primary/20 focus:border-primary"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                              %
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2 opacity-75">
                          <Label className="text-xs font-medium text-gray-500 uppercase">
                            Academy Cut
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              value={academyShare}
                              disabled
                              className="h-11 bg-gray-50 font-bold text-blue-600 border-blue-100"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                              %
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {compType === "fixed" && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-500">
                        Monthly Fixed Salary (PKR)
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          type="number"
                          placeholder="e.g. 50000"
                          value={fixedSalary}
                          onChange={(e) => setFixedSalary(e.target.value)}
                          disabled={isReadOnly}
                          className="pl-9 h-11 font-medium"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-6 border-t bg-gray-50/50 backdrop-blur-sm">
          <div className="flex w-full justify-end gap-3">
            {mode === "view" ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Close
                </Button>
                <Button
                  onClick={() => setMode("edit")}
                  className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 min-w-[140px]"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Teacher
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() =>
                    mode === "edit" && teacher
                      ? setMode("view")
                      : onOpenChange(false)
                  }
                  disabled={updateTeacherMutation.isPending}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateTeacherMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 min-w-[140px]"
                >
                  {updateTeacherMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
