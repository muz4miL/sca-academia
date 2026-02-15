/**
 * Kiosk Registration Page
 *
 * Public tablet-friendly form for students to self-register.
 * No login required. Designed for large text and simple UX.
 * Students enter basic info → Admin reviews in Registrations tab.
 *
 * Route: /register (outside main app layout, no sidebar)
 */

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import {
  Loader2,
  CheckCircle2,
  GraduationCap,
  UserPlus,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster as Sonner } from "@/components/ui/sonner";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function KioskRegister() {
  const [submitted, setSubmitted] = useState(false);
  const [submittedName, setSubmittedName] = useState("");

  // Form state
  const [studentName, setStudentName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [parentCell, setParentCell] = useState("");
  const [studentCell, setStudentCell] = useState("");
  const [gender, setGender] = useState("Male");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [address, setAddress] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");

  // Fetch active classes and sessions for selection
  const { data: classesData } = useQuery({
    queryKey: ["kiosk-classes"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/classes`);
      if (!res.ok) throw new Error("Failed to fetch classes");
      return res.json();
    },
  });

  const { data: sessionsData } = useQuery({
    queryKey: ["kiosk-sessions"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/sessions`);
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
  });

  const classes = classesData?.data || [];
  const sessions = sessionsData?.data || [];

  // Submit mutation
  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`${API_BASE_URL}/public/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Registration failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setSubmittedName(data.data?.studentName || studentName);
      setSubmitted(true);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentName.trim() || !fatherName.trim() || !parentCell.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!selectedClassId) {
      toast.error("Please select a class");
      return;
    }

    if (!selectedSessionId) {
      toast.error("Please select a session");
      return;
    }

    if (!selectedGroup) {
      toast.error("Please select a group");
      return;
    }

    registerMutation.mutate({
      studentName: studentName.trim(),
      fatherName: fatherName.trim(),
      parentCell: parentCell.trim(),
      studentCell: studentCell.trim(),
      gender,
      address: address.trim(),
      referralSource: referralSource || "",
      class: selectedClassId,
      group: selectedGroup,
      session: selectedSessionId || undefined,
    });
  };

  const resetForm = () => {
    setSubmitted(false);
    setSubmittedName("");
    setStudentName("");
    setFatherName("");
    setParentCell("");
    setStudentCell("");
    setGender("Male");
    setSelectedSessionId("");
    setAddress("");
    setReferralSource("");
    setSelectedClassId("");
    setSelectedGroup("");
  };

  // Success Screen
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <Sonner position="top-center" />
        <div className="max-w-lg w-full text-center space-y-8">
          <div className="mx-auto w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center animate-in zoom-in duration-500">
            <CheckCircle2 className="h-14 w-14 text-emerald-600" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-gray-900">
              Application Submitted!
            </h1>
            <p className="text-lg text-gray-600">
              Thank you, <span className="font-semibold text-emerald-700">{submittedName}</span>
            </p>
            <p className="text-gray-500">
              Please visit the administration counter for verification and fee payment.
            </p>
          </div>
          <Button
            onClick={resetForm}
            size="lg"
            className="text-lg px-8 py-6 bg-emerald-600 hover:bg-emerald-700 rounded-xl"
          >
            <UserPlus className="mr-2 h-5 w-5" />
            Register Another Student
          </Button>
        </div>
      </div>
    );
  }

  // Registration Form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <Sonner position="top-center" />

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white py-6 px-6 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-white/20 flex items-center justify-center">
            <GraduationCap className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              SCIENCES COACHING ACADEMY
            </h1>
            <p className="text-blue-200 text-sm">Student Registration Form</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto p-6 mt-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-600" />
              Personal Information
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Fields marked with * are required
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-base font-medium">Student Name *</Label>
                <Input
                  placeholder="Enter full name"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="h-12 text-base rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base font-medium">Father's Name *</Label>
                <Input
                  placeholder="Enter father's name"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  className="h-12 text-base rounded-xl"
                  required
                />
              </div>
            </div>

            {/* Contact Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-base font-medium">Parent Phone *</Label>
                <Input
                  placeholder="03XX-XXXXXXX"
                  value={parentCell}
                  onChange={(e) => setParentCell(e.target.value)}
                  className="h-12 text-base rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base font-medium">Student Phone</Label>
                <Input
                  placeholder="Optional"
                  value={studentCell}
                  onChange={(e) => setStudentCell(e.target.value)}
                  className="h-12 text-base rounded-xl"
                />
              </div>
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Gender *</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="h-12 text-base rounded-xl">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Session Selection */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Academic Session *</Label>
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger className="h-12 text-base rounded-xl">
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No sessions available
                    </SelectItem>
                  ) : (
                    sessions.map((session: any) => (
                      <SelectItem key={session._id} value={session._id}>
                        {session.sessionName}
                        {session.status === "active" && (
                          <span className="ml-2 text-green-600 text-xs">
                            (Active)
                          </span>
                        )}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Class Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-base font-medium">Class *</Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="h-12 text-base rounded-xl">
                    <SelectValue placeholder="Select your class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No classes available
                      </SelectItem>
                    ) : (
                      classes.map((c: any) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.classTitle || c.name} — {c.gradeLevel || ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-base font-medium">Group *</Label>
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger className="h-12 text-base rounded-xl">
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pre-Medical">Pre-Medical</SelectItem>
                    <SelectItem value="Pre-Engineering">Pre-Engineering</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Address</Label>
              <Input
                placeholder="Enter home address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-12 text-base rounded-xl"
              />
            </div>

            {/* Referral Source */}
            <div className="space-y-2">
              <Label className="text-base font-medium">How did you hear about us?</Label>
              <Select value={referralSource} onValueChange={setReferralSource}>
                <SelectTrigger className="h-12 text-base rounded-xl">
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

            {/* Info Note */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              <strong>Note:</strong> Fee details and class assignment will be finalized
              by the administration during your visit to the counter.
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              disabled={registerMutation.isPending}
              className="w-full text-lg py-6 bg-blue-700 hover:bg-blue-800 rounded-xl"
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-5 w-5" />
                  Submit Application
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 mt-6 pb-6">
          SCIENCES COACHING ACADEMY — Registration Portal
        </p>
      </div>
    </div>
  );
}
