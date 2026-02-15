import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HeaderBanner } from "@/components/dashboard/HeaderBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdmissionSuccessModal } from "@/components/admissions/AdmissionSuccessModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  AlertCircle,
  Save,
  Eye,
  CheckCircle2,
  Loader2,
  DollarSign,
  Wallet,
  Pencil,
  Package,
  Printer,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { studentApi, classApi, sessionApi } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import confetti from "canvas-confetti";
import { AdmissionSlip } from "@/components/admissions/AdmissionSlip";
import { ImageCapture } from "@/components/shared/ImageCapture";
// Import PDF Receipt System (replaces react-to-print)
import { usePDFReceipt } from "@/hooks/usePDFReceipt";

// API Base URL for config fetch
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// TASK 1: Draft Persistence Key
const ADMISSION_DRAFT_KEY = "academy_sparkle_admission_draft";

// Subject selector data (pricing handled by session rate)
interface SubjectItem {
  name: string;
}

const Admissions = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pendingId = searchParams.get("pendingId");

  // PDF Receipt Hook (replaces react-to-print)
  const { isPrinting, generatePDF } = usePDFReceipt();

  // Fetch Active Classes and Sessions
  const { data: classesData } = useQuery({
    queryKey: ["classes", { status: "active" }],
    queryFn: () => classApi.getAll({ status: "active" }),
  });

  const { data: sessionsData } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => sessionApi.getAll(), // Fetch ALL sessions (active, upcoming, completed)
  });

  const classes = classesData?.data || [];
  const sessions = sessionsData?.data || [];

  // Form state
  const [studentName, setStudentName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [gender, setGender] = useState("Male");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [group, setGroup] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [parentCell, setParentCell] = useState("");
  const [studentCell, setStudentCell] = useState("");
  const [address, setAddress] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [admissionDate, setAdmissionDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [totalFee, setTotalFee] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [feeValidationError, setFeeValidationError] = useState("");

  // TASK 4: Custom Fee Toggle (Lump Sum mode)
  const [isCustomFeeMode, setIsCustomFeeMode] = useState(false);

  // Session-Based Pricing
  const [sessionPrice, setSessionPrice] = useState<number | null>(null);
  const [isSessionPriceMode, setIsSessionPriceMode] = useState(false);
  const [sessionPriceLoading, setSessionPriceLoading] = useState(false);

  // Discount/Scholarship Calculation
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Student Photo State
  const [photo, setPhoto] = useState<string | null>(null);

  // Draft Persistence State
  const [draftSaved, setDraftSaved] = useState(false);

  // Success Modal State
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [savedStudent, setSavedStudent] = useState<any>(null);
  const [savedSession, setSavedSession] = useState<any>(null);

  // Pending student class ID (set after classes load)
  const [pendingClassId, setPendingClassId] = useState<string | null>(null);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [isLoadingPendingData, setIsLoadingPendingData] = useState(false);

  // TASK 1: Load Draft on Component Mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(ADMISSION_DRAFT_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setStudentName(draft.studentName || "");
        setFatherName(draft.fatherName || "");
        setGender(draft.gender || "Male");
        setSelectedClassId(draft.selectedClassId || "");
        setSelectedSessionId(draft.selectedSessionId || "");
        setGroup(draft.group || "");
        setSelectedSubjects(draft.selectedSubjects || []);
        setParentCell(draft.parentCell || "");
        setStudentCell(draft.studentCell || "");
        setAddress(draft.address || "");
        setReferralSource(draft.referralSource || "");
        setAdmissionDate(
          draft.admissionDate || new Date().toISOString().split("T")[0],
        );
        setTotalFee(draft.totalFee || "");
        setPaidAmount(draft.paidAmount || "");
        setIsCustomFeeMode(draft.isCustomFeeMode || false);
        setPhoto(draft.photo || null);
        console.log("✅ Draft loaded from localStorage");
      } catch (error) {
        console.error("❌ Error loading draft:", error);
      }
    }
  }, []);

  // Load Pending Student from Registration Approval
  useEffect(() => {
    const loadPendingStudent = async () => {
      if (!pendingId) return;

      setIsLoadingPendingData(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/public/pending/${pendingId}`, {
          credentials: "include",
        });
        
        if (!res.ok) {
          toast.error("Failed to load pending student");
          return;
        }

        const data = await res.json();
        const student = data.data;

        console.log("📋 Full pending student data:", JSON.stringify(student, null, 2));
        console.log("🔍 classRef field:", student.classRef, "Type:", typeof student.classRef);
        console.log("🔍 sclassName field:", student.sclassName, "Type:", typeof student.sclassName);
        console.log("🔍 currentSession field:", student.currentSession, "Type:", typeof student.currentSession);
        console.log("🔍 sessionRef field:", student.sessionRef, "Type:", typeof student.sessionRef);

        // Pre-fill form with pending student data
        setStudentName(student.studentName || student.name || "");
        setFatherName(student.fatherName || "");
        setGender(student.gender || "Male");
        setParentCell(student.parentCell || "");
        setStudentCell(student.studentCell || "");
        setAddress(student.address || "");
        setReferralSource(student.referralSource || "");
        setGroup(student.group || "");
        
        // Handle class - classRef is the primary field for pending students
        // Convert ObjectId to string if needed
        let classIdToSet = "";
        if (student.classRef) {
          if (typeof student.classRef === 'object' && student.classRef._id) {
            classIdToSet = student.classRef._id;
          } else if (typeof student.classRef === 'string') {
            classIdToSet = student.classRef;
          }
        } else if (student.sclassName) {
          if (typeof student.sclassName === 'object' && student.sclassName._id) {
            classIdToSet = student.sclassName._id;
          } else if (typeof student.sclassName === 'string') {
            classIdToSet = student.sclassName;
          }
        }
        
        console.log("🎓 Extracted class ID:", classIdToSet);
        console.log("📚 Available classes count:", classes.length);
        
        setPendingClassId(classIdToSet || null);
        
        // Handle session
        let sessionIdToSet = "";
        if (student.sessionRef) {
          if (typeof student.sessionRef === 'object' && student.sessionRef._id) {
            sessionIdToSet = student.sessionRef._id;
          } else if (typeof student.sessionRef === 'string') {
            sessionIdToSet = student.sessionRef;
          }
        } else if (student.currentSession) {
          if (typeof student.currentSession === 'object' && student.currentSession._id) {
            sessionIdToSet = student.currentSession._id;
          } else if (typeof student.currentSession === 'string') {
            sessionIdToSet = student.currentSession;
          }
        }
        
        console.log("📅 Extracted session ID:", sessionIdToSet);
        console.log("📚 Available sessions count:", sessions.length);
        
        setPendingSessionId(sessionIdToSet || null);

        toast.success(`Loaded registration: ${student.studentName || student.name}`);
      } catch (error) {
        console.error("Error loading pending student:", error);
        toast.error("Failed to load pending student");
      } finally {
        setIsLoadingPendingData(false);
      }
    };

    loadPendingStudent();
  }, [pendingId]);

  // Set class and session once data is loaded
  useEffect(() => {
    if (pendingClassId && classes.length > 0 && !selectedClassId) {
      console.log("✅ Setting class from pending data:", pendingClassId);
      console.log("Available classes:", classes.map((c: any) => ({ id: c._id, name: c.classTitle })));
      
      // Verify the classId exists in the classes array
      const classExists = classes.some((c: any) => c._id === pendingClassId);
      if (classExists) {
        setSelectedClassId(pendingClassId);
        console.log("✅ Class successfully set!");
      } else {
        console.warn("⚠️ Pending class ID not found in available classes:", pendingClassId);
      }
    }
  }, [pendingClassId, classes, selectedClassId]);

  useEffect(() => {
    if (pendingSessionId && sessions.length > 0 && !selectedSessionId) {
      console.log("✅ Setting session from pending data:", pendingSessionId);
      console.log("Available sessions:", sessions.map((s: any) => ({ id: s._id, name: s.sessionName })));
      
      // Verify the sessionId exists in the sessions array
      const sessionExists = sessions.some((s: any) => s._id === pendingSessionId);
      if (sessionExists) {
        setSelectedSessionId(pendingSessionId);
        console.log("✅ Session successfully set!");
      } else {
        console.warn("⚠️ Pending session ID not found in available sessions:", pendingSessionId);
      }
    }
  }, [pendingSessionId, sessions, selectedSessionId]);

  // TASK 1: Save Draft to localStorage whenever form state changes
  useEffect(() => {
    // Skip if form is completely empty
    if (!studentName && !fatherName && !selectedClassId && !parentCell) {
      return;
    }

    const draft = {
      studentName,
      fatherName,
      gender,
      selectedClassId,
      selectedSessionId,
      group,
      selectedSubjects,
      parentCell,
      studentCell,
      address,
      referralSource,
      admissionDate,
      totalFee,
      paidAmount,
      isCustomFeeMode,
      photo,
    };

    localStorage.setItem(ADMISSION_DRAFT_KEY, JSON.stringify(draft));
    setDraftSaved(true);

    // Hide "Draft saved" indicator after 2 seconds
    const timer = setTimeout(() => setDraftSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [
    studentName,
    fatherName,
    selectedClassId,
    selectedSessionId,
    group,
    selectedSubjects,
    parentCell,
    studentCell,
    address,
    admissionDate,
    totalFee,
    paidAmount,
    isCustomFeeMode,
  ]);


  // Fetch session price when session changes
  useEffect(() => {
    const fetchSessionPrice = async () => {
      // Reset if no session selected
      if (!selectedSessionId) {
        setSessionPrice(null);
        setIsSessionPriceMode(false);
        setTotalFee("");
        setDiscountAmount(0);
        return;
      }

      setSessionPriceLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/config/session-price/${selectedSessionId}`,
          { credentials: "include" },
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data?.found && result.data?.price > 0) {
            console.log("📊 Session price found:", result.data.price);
            const price = result.data.price;
            setSessionPrice(price);
            setIsSessionPriceMode(true);
            setTotalFee(String(price));
            setDiscountAmount(0); // Reset discount when session changes
          } else {
            console.log("📊 No session price configured");
            setSessionPrice(null);
            setIsSessionPriceMode(false);
            setTotalFee("");
          }
        } else {
          console.error("Failed to fetch session price - response not ok");
          setSessionPrice(null);
          setIsSessionPriceMode(false);
        }
      } catch (error) {
        console.error("Failed to fetch session price:", error);
        setSessionPrice(null);
        setIsSessionPriceMode(false);
      } finally {
        setSessionPriceLoading(false);
      }
    };

    fetchSessionPrice();
  }, [selectedSessionId]); // Only re-fetch when session changes


  // Get selected class
  const getSelectedClass = () =>
    classes.find((c: any) => c._id === selectedClassId);

  // Get classes filtered by group (cascading select)
  const getFilteredClasses = () => {
    // Return all classes - no filtering by group
    return classes;
  };

  const filteredClasses = getFilteredClasses();

  // Subjects list only; pricing is handled by session rate
  const getClassSubjects = (): SubjectItem[] => {
    const selectedClass = getSelectedClass();
    if (!selectedClass || !selectedClass.subjects) return [];
    return selectedClass.subjects.map((s: any) => ({
      name: typeof s === "string" ? s : s.name,
    }));
  };

  const classSubjects = getClassSubjects();

  // Calculate Discount when Custom Fee is used
  useEffect(() => {
    if (isCustomFeeMode && sessionPrice && sessionPrice > 0) {
      const customFee = Number(totalFee) || 0;
      const discount = Math.max(0, sessionPrice - customFee);
      setDiscountAmount(discount);
    } else {
      setDiscountAmount(0);
    }
  }, [totalFee, isCustomFeeMode, sessionPrice]);

  // Reset to session rate when custom mode is disabled
  useEffect(() => {
    if (
      !isCustomFeeMode &&
      isSessionPriceMode &&
      sessionPrice &&
      sessionPrice > 0
    ) {
      setTotalFee(String(sessionPrice));
      setDiscountAmount(0);
    }
  }, [isCustomFeeMode, isSessionPriceMode, sessionPrice]);

  // Reset class selection when group changes (cascading behavior)
  useEffect(() => {
    if (group) {
      // Clear class selection when group changes
      setSelectedClassId("");
      setSelectedSubjects([]);
      setTotalFee("");
    }
  }, [group]);

  // Reset subjects when class changes
  useEffect(() => {
    if (selectedClassId) {
      setSelectedSubjects([]);
      setIsCustomFeeMode(false);
      // Auto-select all subjects if no individual selection
      const selectedClass = getSelectedClass();
      if (selectedClass?.subjects?.length > 0) {
        const subjectNames = selectedClass.subjects.map((s: any) =>
          typeof s === "string" ? s : s.name,
        );
        setSelectedSubjects(subjectNames);
      }
    }
  }, [selectedClassId]);

  // Subject toggle handler
  const handleSubjectToggle = (subjectName: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectName)
        ? prev.filter((id) => id !== subjectName)
        : [...prev, subjectName],
    );
  };

  // Subtle confetti celebration
  const triggerConfetti = () => {
    const count = 100;
    const defaults = {
      origin: { y: 0.5 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: any) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
        colors: ["#0ea5e9", "#38bdf8", "#cbd5e1", "#e2e8f0"],
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  };

  // React Query Mutation
  const createStudentMutation = useMutation({
    mutationFn: studentApi.create,
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setSavedStudent(data.data);

      // Save session info for print slip
      if (selectedSessionId) {
        const session = sessions.find((s: any) => s._id === selectedSessionId);
        setSavedSession(session);
      }

      // Delete pending student if this was from registration approval
      if (pendingId) {
        try {
          await fetch(`${API_BASE_URL}/api/public/reject/${pendingId}`, {
            method: "DELETE",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason: "Approved and admitted" }),
          });
          queryClient.invalidateQueries({ queryKey: ["pending-registrations"] });
        } catch (error) {
          console.error("Failed to delete pending student:", error);
        }
      }

      // TASK 3: Clear draft after successful save (Safety Flush)
      localStorage.removeItem(ADMISSION_DRAFT_KEY);
      console.log("🗑️ Draft cleared after successful save");

      triggerConfetti();
      setSuccessModalOpen(true);
    },
    onError: (error: any) => {
      toast.error("Admission Failed", {
        description: error.message || "Failed to save student admission",
        duration: 4000,
      });
    },
  });

  const handleSaveAdmission = () => {
    const selectedClass = getSelectedClass();

    // Validation
    if (
      !studentName ||
      !fatherName ||
      !selectedClassId ||
      !group ||
      !parentCell
    ) {
      toast.error("Missing Information", {
        description: "Please fill in all required fields",
        duration: 3000,
      });
      return;
    }

    if (!totalFee || Number(totalFee) <= 0) {
      toast.error("Invalid Fee", {
        description: "Please enter a valid total fee amount",
        duration: 3000,
      });
      return;
    }

    // TASK 1: Safety Check - Prevent paidAmount from exceeding totalFee
    const totalFeeNum = Number(totalFee);
    const paidAmountNum = Number(paidAmount) || 0;

    if (paidAmountNum > totalFeeNum) {
      toast.error("Invalid Payment Amount", {
        description: `Received amount (${paidAmountNum.toLocaleString()} PKR) cannot exceed total fee (${totalFeeNum.toLocaleString()} PKR)`,
        duration: 4000,
      });
      setFeeValidationError("Received amount cannot exceed total fee");
      return;
    }

    // ZERO-FEE PREVENTION: Warn if no payment received (for active students)
    if (paidAmountNum === 0) {
      toast.error("No Fee Received", {
        description:
          "Active students must have an initial fee payment. Set status to 'inactive' if this is intentional.",
        duration: 5000,
      });
      return;
    }

    setFeeValidationError("");

    // Calculate discount if custom fee mode is active (Session-Based Pricing)
    let calculatedDiscount = 0;
    if (
      isCustomFeeMode &&
      isSessionPriceMode &&
      sessionPrice &&
      sessionPrice > 0
    ) {
      const customTotal = Number(totalFee);
      calculatedDiscount = Math.max(0, sessionPrice - customTotal);
      console.log(
        `🎓 Session Discount Calculation: Session Rate ${sessionPrice} - Custom ${customTotal} = ${calculatedDiscount}`,
      );
    }

    // Prepare student data
    // Transform subjects from string array to objects (pricing handled by session rate)
    const subjectsWithFees = selectedSubjects.map((subjectName) => ({
      name: subjectName,
      fee: 0,
    }));

    // Ensure we have a valid class name
    const classTitle =
      selectedClass?.classTitle || selectedClass?.className || "";
    if (!classTitle) {
      toast.error("Class Selection Required", {
        description: "Please select a valid class from the dropdown",
        duration: 3000,
      });
      return;
    }

    const studentData = {
      studentName,
      fatherName,
      gender,
      class: classTitle,
      group,
      subjects: subjectsWithFees, // Send as array of {name, fee} objects
      parentCell,
      studentCell: studentCell || "",
      address: address || "",
      referralSource: referralSource || "",
      admissionDate: new Date(admissionDate),
      totalFee: Number(totalFee),
      paidAmount: Number(paidAmount) || 0,
      discountAmount: calculatedDiscount, // Session-based discount
      sessionRate:
        isSessionPriceMode && sessionPrice ? sessionPrice : undefined,
      classRef: selectedClassId,
      sessionRef: selectedSessionId || undefined,
      photo: photo || undefined,
    };

    console.log("📤 Sending Student Data to Backend:", studentData);
    createStudentMutation.mutate(studentData);
  };


  // TASK 4: Reset form and clear ALL state including validation errors
  const handleCancel = () => {
    setStudentName("");
    setFatherName("");
    setGender("Male");
    setSelectedClassId("");
    setSelectedSessionId("");
    setGroup("");
    setSelectedSubjects([]);
    setParentCell("");
    setStudentCell("");
    setAddress("");
    setReferralSource("");
    setAdmissionDate(new Date().toISOString().split("T")[0]);
    setTotalFee("");
    setPaidAmount("");
    setIsCustomFeeMode(false);
    setFeeValidationError(""); // Clear validation error
    setPhoto(null);

    // Clear localStorage draft
    localStorage.removeItem(ADMISSION_DRAFT_KEY);
    console.log("🗑️ Draft manually cleared via Cancel");
  };

  // Get balance - TASK 1: Use Math.max to prevent negative balance
  const balance =
    totalFee && paidAmount
      ? Math.max(0, Number(totalFee) - Number(paidAmount)).toString()
      : totalFee || "0";

  // Print receipt handler - Opens PDF in new tab (no DOM visibility issues)
  const handlePrintReceipt = async () => {
    if (savedStudent?._id) {
      // generatePDF handles all loading states and toasts internally
      await generatePDF(savedStudent._id, "admission");
    }
  };

  // Calculated fee display
  return (
    <DashboardLayout title="Admissions">
      <HeaderBanner
        title="New Admission"
        subtitle={
          <div className="flex items-center gap-2">
            <span>Register a new student to the academy</span>
            {draftSaved && (
              <span className="flex items-center gap-1 text-xs text-slate-500 animate-in fade-in duration-200">
                <CheckCircle2 className="h-3 w-3" />
                Draft saved
              </span>
            )}
          </div>
        }
      >

      </HeaderBanner>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Student Information */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-6 card-shadow">
            <h3 className="mb-6 text-lg font-semibold text-foreground">
              Student Information
            </h3>

            {/* Profile Photo Section */}
            <div className="mb-6 flex flex-col items-center gap-3 p-4 bg-secondary/20 rounded-xl border border-border">
              <Label className="text-sm font-medium text-muted-foreground">
                Student Photo
              </Label>
              <ImageCapture
                value={photo || undefined}
                onChange={(img) => setPhoto(img)}
                size="lg"
              />
              <p className="text-xs text-muted-foreground text-center">
                Take a webcam photo or upload an image file
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Student Name *</Label>
                <Input
                  id="name"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Enter full name"
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fatherName">Father's Name *</Label>
                <Input
                  id="fatherName"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="Enter father's name"
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wing">Wing - Assigning to Right Wing</Label>
                <Input
                  id="wing"
                  value="Right Wing"
                  disabled
                  className="bg-secondary/50 text-muted-foreground cursor-not-allowed"
                  title="Auto: Assigning to Right Wing"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="class">Group *</Label>
                <Input
                  id="class"
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  placeholder="e.g., Pre-Medical"
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="class">Class *</Label>
                <Select
                  value={selectedClassId}
                  onValueChange={setSelectedClassId}
                  disabled={isLoadingPendingData}
                >
                  <SelectTrigger className="bg-background">
                    {isLoadingPendingData ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading class...</span>
                      </div>
                    ) : (
                      <SelectValue placeholder="Select class" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls: any) => (
                      <SelectItem key={cls._id} value={cls._id}>
                        {cls.classTitle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="parentCell">Parent Cell No. *</Label>
                <Input
                  id="parentCell"
                  value={parentCell}
                  onChange={(e) => setParentCell(e.target.value)}
                  placeholder="03XX-XXXXXXX"
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentCell">Student Cell No.</Label>
                <Input
                  id="studentCell"
                  value={studentCell}
                  onChange={(e) => setStudentCell(e.target.value)}
                  placeholder="03XX-XXXXXXX"
                  className="bg-background"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter complete address"
                  className="bg-background resize-none"
                  rows={2}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="referralSource">
                  How did you hear about us?
                </Label>
                <Select
                  value={referralSource}
                  onValueChange={setReferralSource}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select a source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friend_family">
                      Friend / Family Referral
                    </SelectItem>
                    <SelectItem value="current_student">
                      Current Student
                    </SelectItem>
                    <SelectItem value="teacher_referral">
                      Teacher Referral
                    </SelectItem>
                    <SelectItem value="social_media">
                      Social Media (Facebook, Instagram)
                    </SelectItem>
                    <SelectItem value="google">Google Search</SelectItem>
                    <SelectItem value="banner_poster">
                      Banner / Poster
                    </SelectItem>
                    <SelectItem value="newspaper">Newspaper Ad</SelectItem>
                    <SelectItem value="walk_in">
                      Walk-in / Nearby Resident
                    </SelectItem>
                    <SelectItem value="school_visit">
                      School Visit / Seminar
                    </SelectItem>
                    <SelectItem value="whatsapp_group">
                      WhatsApp Group
                    </SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Office Use Section */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 card-shadow">
            <h3 className="mb-6 text-lg font-semibold text-foreground">
              Office Use Only
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admissionDate">Admission Date</Label>
                <Input
                  id="admissionDate"
                  type="date"
                  value={admissionDate}
                  onChange={(e) => setAdmissionDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="session">Academic Session *</Label>
                <Select
                  value={selectedSessionId}
                  onValueChange={setSelectedSessionId}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((session: any) => (
                      <SelectItem key={session._id} value={session._id}>
                        {session.sessionName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Fee / Scholarship Toggle */}
              {isSessionPriceMode && sessionPrice && sessionPrice > 0 && (
                <div
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isCustomFeeMode
                      ? "border-amber-400 bg-amber-50"
                      : "border-border bg-secondary/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium">
                        Apply Discount / Scholarship
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Session Rate: PKR {sessionPrice.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isCustomFeeMode && discountAmount > 0 && (
                      <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                        -{discountAmount.toLocaleString()} PKR
                      </span>
                    )}
                    <Switch
                      checked={isCustomFeeMode}
                      onCheckedChange={setIsCustomFeeMode}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="totalFee">Total Fee (PKR) *</Label>
                  {isCustomFeeMode ? (
                    <span className="text-xs text-amber-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3" />
                      Manual Override Active
                    </span>
                  ) : isSessionPriceMode && sessionPrice && sessionPrice > 0 ? (
                    <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium animate-in fade-in duration-300">
                      <Package className="h-3 w-3" />
                      Session Rate: PKR {sessionPrice.toLocaleString()}
                    </span>
                  ) : sessionPriceLoading ? (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Checking session price...
                    </span>
                  ) : null}
                </div>
                <div className="relative">
                  <Input
                    id="totalFee"
                    type="number"
                    placeholder="0"
                    value={totalFee}
                    onChange={(e) => setTotalFee(e.target.value)}
                    readOnly={!isCustomFeeMode && !!selectedSessionId}
                    className={`${
                      isCustomFeeMode
                        ? "border-amber-400 bg-amber-50 ring-2 ring-amber-200"
                        : isSessionPriceMode && sessionPrice && sessionPrice > 0
                          ? "border-emerald-400 bg-emerald-50 cursor-not-allowed font-bold text-emerald-700"
                          : selectedSessionId
                            ? "border-yellow-300 bg-yellow-50 cursor-not-allowed"
                            : ""
                    }`}
                  />
                  {!isCustomFeeMode &&
                    isSessionPriceMode &&
                    sessionPrice &&
                    sessionPrice > 0 && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <Package className="h-4 w-4 text-emerald-500" />
                      </div>
                    )}
                  {isCustomFeeMode && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <Pencil className="h-4 w-4 text-amber-500" />
                    </div>
                  )}
                </div>
                {/* Session Rate Summary with Discount */}
                {isSessionPriceMode && sessionPrice && sessionPrice > 0 && (
                  <div
                    className={`mt-2 p-3 rounded-lg border ${
                      isCustomFeeMode && discountAmount > 0
                        ? "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200"
                        : "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Package
                        className={`h-4 w-4 ${isCustomFeeMode && discountAmount > 0 ? "text-amber-600" : "text-emerald-600"}`}
                      />
                      <p
                        className={`text-sm font-semibold ${isCustomFeeMode && discountAmount > 0 ? "text-amber-800" : "text-emerald-800"}`}
                      >
                        {isCustomFeeMode && discountAmount > 0
                          ? "Scholarship / Discount Applied"
                          : "Session-Based Pricing"}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-600">Session Rate</span>
                        <span
                          className={`font-medium ${isCustomFeeMode && discountAmount > 0 ? "line-through text-slate-400" : "text-slate-700"}`}
                        >
                          PKR {sessionPrice.toLocaleString()}
                        </span>
                      </div>

                      {isCustomFeeMode && discountAmount > 0 && (
                        <>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-green-600 font-medium">
                              Discount
                            </span>
                            <span className="font-bold text-green-600">
                              -PKR {discountAmount.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-1.5 border-t border-amber-200">
                            <span className="text-sm font-semibold text-amber-800">
                              Final Fee
                            </span>
                            <span className="text-lg font-bold text-amber-700">
                              PKR {Number(totalFee).toLocaleString()}
                            </span>
                          </div>
                        </>
                      )}

                      {!isCustomFeeMode && (
                        <div className="flex justify-between items-center pt-1.5 border-t border-emerald-200">
                          <span className="text-xs font-medium text-emerald-600">
                            Total Fee
                          </span>
                          <span className="text-lg font-bold text-emerald-700">
                            PKR {sessionPrice.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* No Session Price Warning */}
                {!isSessionPriceMode &&
                  selectedSessionId &&
                  !sessionPriceLoading && (
                    <div className="mt-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                      <p className="text-xs text-yellow-700">
                        <strong>Note:</strong> No session rate configured for
                        this session. Please configure session pricing in
                        Settings → Configuration.
                      </p>
                    </div>
                  )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="paidAmount">Fee Received (PKR)</Label>
                <Input
                  id="paidAmount"
                  type="number"
                  placeholder="0"
                  value={paidAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPaidAmount(value);

                    // TASK 1: Real-time validation
                    if (value && totalFee) {
                      const paidNum = Number(value);
                      const totalNum = Number(totalFee);
                      if (paidNum > totalNum) {
                        setFeeValidationError(
                          "Received amount cannot exceed total fee",
                        );
                      } else {
                        setFeeValidationError("");
                      }
                    } else {
                      setFeeValidationError("");
                    }
                  }}
                  className={
                    feeValidationError
                      ? "border-red-500 focus-visible:ring-red-500"
                      : ""
                  }
                />
                {feeValidationError && (
                  <p className="text-xs text-red-600 flex items-center gap-1 font-medium">
                    <AlertCircle className="h-3 w-3" />
                    {feeValidationError}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="balance">Balance (PKR)</Label>
                <Input
                  id="balance"
                  type="number"
                  placeholder="0"
                  value={balance}
                  disabled
                  className="bg-gray-100 text-foreground font-semibold"
                />
              </div>

              {/* Session discount display handled above (session rate summary) */}
            </div>
          </div>

          {/* Note */}
          <div className="rounded-xl border border-warning bg-warning-light p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-warning" />
              <div>
                <p className="font-medium text-warning">Important Note</p>
                <p className="mt-1 text-sm text-warning/80">
                  Fee is not refundable in any case.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCancel}
              disabled={createStudentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSaveAdmission}
              disabled={createStudentMutation.isPending}
              style={{ borderRadius: "0.75rem" }}
            >
              {createStudentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Admission
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Success Modal - Elegant Compact Design */}
      <AdmissionSuccessModal
        isOpen={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        studentData={savedStudent}
        onNavigateToStudents={() => navigate("/students")}
        onPrintReceipt={handlePrintReceipt}
        onNewAdmission={handleCancel}
      />

      {/* Hidden Print Slip Component (legacy - kept for reference) */}
      {savedStudent && (
        <AdmissionSlip student={savedStudent} session={savedSession} />
      )}

      {/* PDF Receipt is now generated programmatically - no hidden DOM template needed */}
    </DashboardLayout>
  );
};

export default Admissions;
