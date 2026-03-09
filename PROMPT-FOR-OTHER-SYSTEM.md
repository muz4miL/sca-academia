# IMPLEMENTATION PROMPT — Real-Time Attendance via Gatekeeper + Student Profile Image Upload & Sync

> **Use this prompt with Claude Opus to implement TWO features in your other system that already has a Gatekeeper scanning flow.
> Attach screenshots of your current Gatekeeper UI, Attendance page, and Student Portal for visual reference.**

---

## CONTEXT FOR THE AI

I have a working ERP system with a Gatekeeper barcode scanning module. I need you to implement two features that work perfectly in my reference system (SCA Academia). I'm providing the EXACT implementation details, data flows, code patterns, and UI fixes so you can replicate them in my system.

**My system's tech stack:** [FILL IN: e.g., Node.js + Express + MongoDB + React + Tailwind + TanStack React Query]
**My system already has:** A Gatekeeper scanning page, Student model, Class model, Timetable model, and route/controller structure.

---

## FEATURE 1: REAL-TIME ATTENDANCE MARKING VIA GATEKEEPER SCAN

### What It Does
When a student scans their barcode at the Gatekeeper terminal, the system automatically marks them Present in an Attendance collection — this shows up instantly in the Attendance Management dashboard (real-time, no refresh needed).

### Architecture Overview

```
Student scans barcode → POST /api/gatekeeper/scan
  → Step 1: Identify student (by studentId/barcodeId/token)
  → Step 2: Query Timetable for current session (optional enrichment)
  → Step 3: Check student status (Expelled/Suspended → DENIED)
  → Step 4: Check fee status (full defaulter → DENIED, partial → ALLOWED with warning)
  → Step 5: Check class schedule (day/time window)
  → Step 6: Auto-mark attendance in Attendance collection
  → Step 7: Return scan result with attendance info (alreadyMarked: true/false)

Attendance dashboard: GET /api/attendance/today → auto-refreshes every 30 seconds
```

### 1A. ATTENDANCE MODEL (Create: `backend/models/Attendance.js`)

```javascript
const mongoose = require("mongoose");

const AttendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    studentId: {
      type: String,
      required: true,
      index: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    class: {
      type: String,
      default: "",
    },
    classRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["Present", "Absent", "Late", "Excused"],
      default: "Present",
    },
    checkInTime: {
      type: Date,
    },
    checkOutTime: {
      type: Date,
    },
    markedBy: {
      type: String,
      enum: ["Gatekeeper", "Admin", "System"],
      default: "Gatekeeper",
    },
    markedByUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    session: {
      subject: String,
      teacher: String,
      room: String,
      startTime: String,
      endTime: String,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// CRITICAL: Compound unique index — one attendance record per student per day
// This prevents duplicate attendance even with race conditions (concurrent scans)
AttendanceSchema.index({ student: 1, date: 1 }, { unique: true });

// Index for efficient date-range queries
AttendanceSchema.index({ date: 1, status: 1 });

// Static: Get today's date normalized to midnight (Pakistan Standard Time UTC+5)
AttendanceSchema.statics.getTodayDate = function () {
  const now = new Date();
  const pkt = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  return new Date(pkt.getFullYear(), pkt.getMonth(), pkt.getDate());
};

// Static: Check if student already checked in today
AttendanceSchema.statics.isCheckedInToday = async function (studentObjectId) {
  const today = this.getTodayDate();
  return await this.findOne({ student: studentObjectId, date: today });
};

module.exports = mongoose.model("Attendance", AttendanceSchema);
```

### 1B. ADD AUTO-ATTENDANCE MARKING TO GATEKEEPER CONTROLLER

In your existing `scanBarcode` function, AFTER the student passes all verification checks (fee, schedule, status) and BEFORE returning the success response, add this attendance auto-marking block:

```javascript
// ========================================
// AUTO-MARK ATTENDANCE (inside scanBarcode, after all checks pass)
// ========================================
let attendanceResult = null;
let attendanceAlreadyMarked = false;
try {
  const Attendance = require("../models/Attendance");
  const todayPKT = Attendance.getTodayDate();
  const existingAttendance = await Attendance.findOne({
    student: student._id,
    date: todayPKT,
  });

  if (!existingAttendance) {
    attendanceResult = await Attendance.create({
      student: student._id,
      studentId: student.studentId,
      studentName: student.studentName,
      class: student.class || "",
      classRef: student.classRef?._id || student.classRef,
      date: todayPKT,
      status: "Present",
      checkInTime: new Date(),
      markedBy: "Gatekeeper",
      markedByUser: req.user?._id,
      // Optional: capture current timetable session if you have it
      session: currentSession
        ? {
            subject: currentSession.subject,
            teacher: currentSession.teacher,
            room: currentSession.room,
            startTime: currentSession.startTime,
            endTime: currentSession.endTime,
          }
        : undefined,
    });
    attendanceAlreadyMarked = false;
    console.log(`✅ Attendance auto-marked: ${student.studentName} — Present (Gatekeeper)`);
  } else {
    attendanceResult = existingAttendance;
    attendanceAlreadyMarked = true;
    console.log(`ℹ️ Attendance already marked for ${student.studentName} today`);
  }
} catch (attendanceError) {
  // Don't block the scan if attendance marking fails — scan is primary function
  console.error(`⚠️ Attendance marking failed (non-blocking):`, attendanceError.message);
}
```

Then include the attendance info in your scan response JSON:

```javascript
return res.status(200).json({
  success: true,
  status: verificationStatus, // "success" or "partial"
  message: statusMessage,
  currentSession: currentSession || null,
  scanResult: {
    statusColor, // "GREEN" | "RED" | "ORANGE"
    statusMessage: colorStatusMessage,
    student: {
      id: student.studentId,
      name: student.studentName,
      photoUrl: student.imageUrl || student.photo || defaultAvatarUrl,
      className: student.class,
    },
    financial: {
      totalFee: student.totalFee,
      paidAmount: student.paidAmount,
      balance,
      status: balance <= 0 ? "PAID" : "PENDING",
    },
    session: currentSession,
    // THIS IS THE KEY NEW FIELD:
    attendance: attendanceResult
      ? {
          status: attendanceResult.status,
          checkInTime: attendanceResult.checkInTime,
          alreadyMarked: attendanceAlreadyMarked,
        }
      : null,
  },
  student: {
    _id: student._id,
    studentId: student.studentId,
    barcodeId: student.barcodeId,
    name: student.studentName,
    fatherName: student.fatherName,
    class: student.class,
    group: student.group,
    photo: student.imageUrl || student.photo,
    feeStatus: student.feeStatus,
    totalFee: student.totalFee,
    paidAmount: student.paidAmount,
    balance,
    studentStatus: student.studentStatus || "Active",
  },
});
```

### 1C. ATTENDANCE CONTROLLER (Create: `backend/controllers/attendanceController.js`)

Key endpoints needed:

```javascript
const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const Student = require("../models/Student");

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);

// Helper: Pakistan midnight date
const getTodayPKT = () => {
  const now = new Date();
  const pkt = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
  return new Date(pkt.getFullYear(), pkt.getMonth(), pkt.getDate());
};

// POST /api/attendance/mark — Manual attendance marking by admin
exports.markAttendance = async (req, res) => {
  try {
    const { studentId, status, notes, markedBy } = req.body;
    if (!studentId) {
      return res.status(400).json({ success: false, message: "Student ID is required" });
    }

    const orConditions = [{ studentId }, { barcodeId: studentId }];
    if (isValidObjectId(studentId)) {
      orConditions.unshift({ _id: studentId });
    }
    const student = await Student.findOne({ $or: orConditions }).populate("classRef");
    if (!student) {
      return res.status(404).json({ success: false, message: `Student "${studentId}" not found` });
    }

    const today = getTodayPKT();
    const existing = await Attendance.findOne({ student: student._id, date: today });
    if (existing) {
      return res.status(200).json({
        success: true,
        alreadyMarked: true,
        message: `${student.studentName} already checked in today`,
        attendance: existing,
      });
    }

    const attendance = await Attendance.create({
      student: student._id,
      studentId: student.studentId,
      studentName: student.studentName,
      class: student.class || "",
      classRef: student.classRef?._id || student.classRef,
      date: today,
      status: status || "Present",
      checkInTime: new Date(),
      markedBy: markedBy || "Admin",
      markedByUser: req.user?._id,
      notes: notes || "",
    });

    return res.status(201).json({
      success: true,
      alreadyMarked: false,
      message: `${student.studentName} marked ${status || "Present"}`,
      attendance,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(200).json({ success: true, alreadyMarked: true, message: "Already recorded" });
    }
    return res.status(500).json({ success: false, message: "Failed to mark attendance" });
  }
};

// GET /api/attendance/today — Today's summary + all records
exports.getTodayAttendance = async (req, res) => {
  try {
    const today = getTodayPKT();
    const { classFilter } = req.query;

    const query = { date: today };
    if (classFilter && classFilter !== "all") {
      query.class = classFilter;
    }

    const records = await Attendance.find(query)
      .populate("student", "studentName studentId class group photo imageUrl feeStatus")
      .sort({ checkInTime: -1 });

    // Total enrolled students for percentage
    const studentQuery = classFilter && classFilter !== "all" ? { class: classFilter } : {};
    const totalStudents = await Student.countDocuments({
      ...studentQuery,
      $or: [
        { studentStatus: { $in: ["Active", "active"] } },
        { studentStatus: { $exists: false } },
      ],
    });

    const present = records.filter((r) => r.status === "Present").length;
    const late = records.filter((r) => r.status === "Late").length;
    const excused = records.filter((r) => r.status === "Excused").length;
    const absent = totalStudents - present - late - excused;

    return res.status(200).json({
      success: true,
      date: today,
      stats: {
        totalStudents,
        present,
        late,
        absent: Math.max(0, absent),
        excused,
        rate: totalStudents > 0 ? Math.round((present / totalStudents) * 100) : 0,
      },
      records,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch attendance" });
  }
};

// GET /api/attendance/range — Date range report with daily breakdown
exports.getAttendanceByRange = async (req, res) => {
  try {
    const { startDate, endDate, classFilter } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: "startDate and endDate required" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const query = { date: { $gte: start, $lte: end } };
    if (classFilter && classFilter !== "all") {
      query.class = classFilter;
    }

    const records = await Attendance.find(query)
      .populate("student", "studentName studentId class group photo imageUrl")
      .sort({ date: -1, checkInTime: -1 });

    // Group by date for daily breakdown
    const dailyMap = {};
    records.forEach((r) => {
      const dateKey = r.date.toISOString().split("T")[0];
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { date: dateKey, present: 0, late: 0, absent: 0, excused: 0, records: [] };
      }
      dailyMap[dateKey][r.status.toLowerCase()]++;
      dailyMap[dateKey].records.push(r);
    });

    return res.status(200).json({
      success: true,
      dateRange: { startDate, endDate },
      totalRecords: records.length,
      dailyBreakdown: Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date)),
      records,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch range" });
  }
};

// GET /api/attendance/student/:id — Individual student's 90-day history
exports.getStudentAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const orConditions = [{ studentId: id }, { barcodeId: id }];
    if (isValidObjectId(id)) {
      orConditions.unshift({ _id: id });
    }
    const student = await Student.findOne({ $or: orConditions });
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const records = await Attendance.find({
      student: student._id,
      date: { $gte: ninetyDaysAgo },
    }).sort({ date: -1 });

    const present = records.filter((r) => r.status === "Present").length;
    const total = records.length;

    return res.status(200).json({
      success: true,
      student: {
        _id: student._id,
        studentId: student.studentId,
        name: student.studentName,
        class: student.class,
        photo: student.imageUrl || student.photo,
      },
      stats: {
        totalDays: total,
        present,
        absent: records.filter((r) => r.status === "Absent").length,
        late: records.filter((r) => r.status === "Late").length,
        rate: total > 0 ? Math.round((present / total) * 100) : 0,
      },
      records,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch student attendance" });
  }
};

// PUT /api/attendance/:id — Admin update status
exports.updateAttendance = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      { status, notes, markedBy: "Admin", markedByUser: req.user?._id },
      { new: true, runValidators: true }
    );
    if (!attendance) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }
    return res.status(200).json({ success: true, attendance });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update" });
  }
};

// GET /api/attendance/classes — Class list for dropdown filter
exports.getClassList = async (req, res) => {
  try {
    const classes = await Student.distinct("class", {
      $or: [
        { studentStatus: { $in: ["Active", "active"] } },
        { studentStatus: { $exists: false } },
      ],
    });
    return res.status(200).json({ success: true, classes: classes.filter(Boolean).sort() });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch classes" });
  }
};
```

### 1D. ATTENDANCE ROUTES (Create: `backend/routes/attendance.js`)

```javascript
const express = require("express");
const router = express.Router();
const {
  markAttendance,
  getTodayAttendance,
  getAttendanceByRange,
  getStudentAttendance,
  updateAttendance,
  getClassList,
} = require("../controllers/attendanceController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

const roles = ["OWNER", "OPERATOR", "ADMIN", "STAFF", "PARTNER"];

router.post("/mark", protect, restrictTo(...roles), markAttendance);
router.get("/today", protect, restrictTo(...roles), getTodayAttendance);
router.get("/range", protect, restrictTo(...roles), getAttendanceByRange);
router.get("/student/:id", protect, restrictTo(...roles), getStudentAttendance);
router.put("/:id", protect, restrictTo(...roles), updateAttendance);
router.get("/classes", protect, restrictTo(...roles), getClassList);

module.exports = router;
```

### 1E. REGISTER ROUTES IN SERVER.JS

```javascript
// Add these lines where you register routes:
const attendanceRoutes = require("./routes/attendance");
app.use("/api/attendance", attendanceRoutes);
```

### 1F. GATEKEEPER FRONTEND — SHOW ATTENDANCE STATUS ON SCAN RESULT

In your Gatekeeper frontend component, after a successful scan, extract attendance info and display it:

```typescript
// Extract from scan response:
const attendanceInfo = scanResult.scanResult?.attendance || null;

// Display in your SUCCESS (green) screen:
<div className="flex items-center gap-3">
  <div className="h-2.5 w-2.5 rounded-full bg-sky-400 animate-pulse" />
  <p className="text-lg font-medium text-white/60 uppercase tracking-widest">
    Attendance: <span className={attendanceInfo?.alreadyMarked ? "text-amber-300 font-black" : "text-sky-300 font-black"}>
      {attendanceInfo?.alreadyMarked ? "ALREADY MARKED" : "MARKED PRESENT"}
    </span>
    {attendanceInfo?.checkInTime && (
      <span className="text-sky-200/60 text-sm ml-2">
        at {new Date(attendanceInfo.checkInTime).toLocaleTimeString("en-PK", {
          hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Karachi"
        })}
      </span>
    )}
  </p>
</div>

// Also display on the WARNING/orange screen (partial fee):
{attendanceInfo && (
  <div className="flex items-center gap-3">
    <div className="h-2.5 w-2.5 rounded-full bg-sky-400 animate-pulse" />
    <p className="text-lg font-medium text-white/60 uppercase tracking-widest">
      Attendance: <span className={attendanceInfo?.alreadyMarked ? "text-amber-200 font-black" : "text-sky-200 font-black"}>
        {attendanceInfo?.alreadyMarked ? "ALREADY MARKED" : "MARKED PRESENT"}
      </span>
    </p>
  </div>
)}
```

### 1G. ATTENDANCE DASHBOARD FRONTEND (Create: Attendance page)

The Attendance page needs:
- **Stats bar**: Total Students, Present, Late, Absent, Rate %
- **Two views**: "Today" (auto-refreshes every 30 seconds) and "Date Range"
- **Table columns**: #, Student, ID, Class, Status (badge), Check In time, Marked By (badge), Actions (status dropdown)
- **Class filter dropdown** (fetches from `/api/attendance/classes`)
- **Search** by name, ID, or class

Key frontend patterns:
```typescript
// Auto-refresh today's view every 30 seconds:
const { data: todayData, refetch } = useQuery({
  queryKey: ["attendance-today", classFilter],
  queryFn: () => fetch(`${API}/api/attendance/today?classFilter=${classFilter}`, {
    credentials: "include"
  }).then(r => r.json()),
  refetchInterval: activeView === "today" ? 30000 : false, // 30-sec auto-refresh
});

// Status update mutation (admin changes Present → Late etc.):
const updateMutation = useMutation({
  mutationFn: ({ id, status }) => fetch(`${API}/api/attendance/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ status }),
  }).then(r => r.json()),
  onSuccess: () => refetch(), // Immediately refresh the list
});
```

---

## FEATURE 2: STUDENT PROFILE IMAGE UPLOAD FROM PORTAL + SYSTEM-WIDE SYNC

### What It Does
Students log into their portal, can upload/change their profile picture (with a configurable max number of changes). The uploaded image is then used everywhere in the system: Gatekeeper scan results, Attendance table, Admin student views.

### 2A. ADD IMAGE FIELDS TO STUDENT MODEL

Your Student model needs these fields:

```javascript
// In your Student schema, add:
photo: {
  type: String,
  trim: true,
},
imageUrl: {
  type: String,
  default: null,
},
profilePictureChangeCount: {
  type: Number,
  default: 0,
},
profilePictureChangeLog: [
  {
    changedAt: { type: Date, default: Date.now },
    oldPhotoUrl: String,
    newPhotoUrl: String,
    changedBy: { type: String, enum: ["student", "admin"], default: "student" },
  },
],
```

Also add a `getStudentProfile()` method that resolves the photo with fallback:

```javascript
studentSchema.methods.getStudentProfile = function () {
  const defaultPhoto = "https://api.dicebear.com/7.x/avataaars/svg?seed=" + this.studentId;
  return {
    _id: this._id,
    studentId: this.studentId,
    barcodeId: this.barcodeId,
    name: this.studentName,
    fatherName: this.fatherName,
    class: this.class,
    group: this.group,
    // PRIORITY CHAIN: imageUrl (uploaded) > photo (legacy) > dicebear avatar
    photo: this.imageUrl || this.photo || defaultPhoto,
    feeStatus: this.feeStatus,
    totalFee: this.totalFee,
    paidAmount: this.paidAmount,
    balance: this.balance,
    // Include picture settings for portal UI
    profilePictureChangeCount: this.profilePictureChangeCount || 0,
  };
};
```

### 2B. UPLOAD MIDDLEWARE (Create: `backend/middleware/upload.js`)

```javascript
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "..", "uploads", "students");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// File filter - ONLY accept images (security)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG and PNG images are allowed"), false);
  }
};

// Admin upload (uses req.params.id for filename)
const adminStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${req.params.id}-${Date.now()}${ext}`);
  },
});

const uploadStudentPhoto = multer({
  storage: adminStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}).single("photo");

const handlePhotoUpload = (req, res, next) => {
  uploadStudentPhoto(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ success: false, message: "File too large. Maximum size is 5MB" });
      }
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

// Student portal self-upload (uses req.student for filename)
const portalStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const studentId = req.student?.studentId || req.student?._id || "unknown";
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `profile-${studentId}-${Date.now()}${ext}`);
  },
});

const uploadStudentPortalPhoto = multer({
  storage: portalStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("photo");

const handleStudentProfilePhotoUpload = (req, res, next) => {
  uploadStudentPortalPhoto(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ success: false, message: "File too large. Maximum 5MB." });
      }
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

module.exports = { handlePhotoUpload, handleStudentProfilePhotoUpload, uploadDir };
```

### 2C. STUDENT PORTAL CONTROLLER — PROFILE PICTURE ENDPOINTS

```javascript
// GET /api/student-portal/profile-picture/status
exports.getProfilePictureStatus = async (req, res) => {
  try {
    const student = await Student.findById(req.student._id).lean();
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Configurable max changes (default 3) — can come from a Configuration model
    const maxChanges = 3; // Or fetch from config
    const changesUsed = student.profilePictureChangeCount || 0;
    const changesRemaining = Math.max(0, maxChanges - changesUsed);

    return res.status(200).json({
      success: true,
      data: {
        currentPhotoUrl: student.photo || student.imageUrl || null,
        changesUsed,
        changesRemaining,
        maxChangesAllowed: maxChanges,
        canChangeNow: changesRemaining > 0,
        allowStudentPictureChanges: true,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /api/student-portal/profile-picture
exports.updateProfilePicture = async (req, res) => {
  try {
    const student = await Student.findById(req.student._id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const maxChanges = 3;
    const changesUsed = student.profilePictureChangeCount || 0;

    if (changesUsed >= maxChanges) {
      return res.status(403).json({
        success: false,
        message: `Maximum ${maxChanges} profile picture changes reached. Contact administration.`,
      });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided." });
    }

    const oldPhotoUrl = student.photo || student.imageUrl || null;
    const newPhotoUrl = `/uploads/students/${req.file.filename}`;

    // Update BOTH fields so it syncs everywhere
    student.photo = newPhotoUrl;
    student.imageUrl = newPhotoUrl;
    student.profilePictureChangeCount = changesUsed + 1;

    if (!student.profilePictureChangeLog) {
      student.profilePictureChangeLog = [];
    }
    student.profilePictureChangeLog.push({
      changedAt: new Date(),
      oldPhotoUrl,
      newPhotoUrl,
      changedBy: "student",
    });

    await student.save();

    return res.status(200).json({
      success: true,
      message: "Profile picture updated successfully!",
      data: {
        photoUrl: newPhotoUrl,
        changesUsed: changesUsed + 1,
        changesRemaining: Math.max(0, maxChanges - (changesUsed + 1)),
        maxChangesAllowed: maxChanges,
        canChangeNow: maxChanges - (changesUsed + 1) > 0,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error updating picture" });
  }
};
```

### 2D. STUDENT PORTAL AUTH MIDDLEWARE

You need a `protectStudent` middleware that reads a student-specific JWT:

```javascript
const protectStudent = async (req, res, next) => {
  try {
    let token;
    // Check cookie first, then Authorization header
    if (req.cookies?.studentToken) {
      token = req.cookies.studentToken;
    } else if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "student") {
      return res.status(403).json({ success: false, message: "Invalid role" });
    }

    const student = await Student.findById(decoded.id);
    if (!student) {
      return res.status(401).json({ success: false, message: "Student not found" });
    }

    req.student = student;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};
```

### 2E. STUDENT PORTAL ROUTES

```javascript
const express = require("express");
const router = express.Router();
const { protectStudent } = require("../middleware/auth");
const { handleStudentProfilePhotoUpload } = require("../middleware/upload");
const {
  studentLogin,
  getStudentProfile,
  getProfilePictureStatus,
  updateProfilePicture,
  studentLogout,
} = require("../controllers/studentPortalController");

router.post("/login", studentLogin);
router.get("/me", protectStudent, getStudentProfile);
router.get("/profile-picture/status", protectStudent, getProfilePictureStatus);
router.post("/profile-picture", protectStudent, handleStudentProfilePhotoUpload, updateProfilePicture);
router.post("/logout", protectStudent, studentLogout);

module.exports = router;
```

### 2F. SERVE STATIC UPLOADS IN SERVER.JS

```javascript
const path = require("path");
// Add this line BEFORE your routes:
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
```

### 2G. STUDENT PORTAL FRONTEND — PROFILE PICTURE UPLOAD UI

In the student portal profile card, add a camera overlay on the photo:

```tsx
// State
const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
const photoInputRef = useRef<HTMLInputElement>(null);

// Upload handler
const handleProfilePictureUpload = async (file: File) => {
  if (!file || !token) return;

  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    toast.error("Only JPEG, PNG and WebP images are allowed.");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    toast.error("File too large. Maximum 5MB.");
    return;
  }

  setIsUploadingPhoto(true);
  try {
    const formData = new FormData();
    formData.append("photo", file);

    const res = await fetch(`${API_BASE_URL}/api/student-portal/profile-picture`, {
      method: "POST",
      credentials: "include",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await res.json();
    if (res.ok && data.success) {
      toast.success(`Profile picture updated! ${data.data.changesRemaining} changes remaining.`);
      // Update local profile state immediately
      setProfile(prev => prev ? { ...prev, photo: data.data.photoUrl } : prev);
    } else {
      toast.error(data.message || "Upload failed");
    }
  } catch {
    toast.error("Network error. Please try again.");
  } finally {
    setIsUploadingPhoto(false);
  }
};

// JSX for the profile photo with camera overlay:
<div className="relative group">
  <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-gold/30 shadow-xl">
    {profile?.photo ? (
      <img
        src={profile.photo.startsWith("http") ? profile.photo : `${API_BASE_URL}${profile.photo}`}
        alt={profile.name}
        className="w-full h-full object-cover"
      />
    ) : (
      <img
        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.studentId}`}
        alt={profile?.name}
        className="w-full h-full object-cover"
      />
    )}
  </div>
  {/* Camera overlay — only shows on hover when changes are available */}
  {canChangePicture && (
    <button
      onClick={() => photoInputRef.current?.click()}
      disabled={isUploadingPhoto}
      className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer"
    >
      {isUploadingPhoto ? (
        <Loader2 className="h-6 w-6 text-white animate-spin" />
      ) : (
        <Camera className="h-6 w-6 text-white" />
      )}
    </button>
  )}
</div>
{/* Hidden file input */}
<input
  ref={photoInputRef}
  type="file"
  accept="image/jpeg,image/jpg,image/png,image/webp"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) handleProfilePictureUpload(file);
    e.target.value = "";
  }}
  className="hidden"
/>
{/* Change info text */}
{canChangePicture && (
  <button
    onClick={() => photoInputRef.current?.click()}
    className="text-xs text-gold/60 hover:text-gold flex items-center gap-1 mt-2"
  >
    <Camera className="h-3 w-3" />
    Change Photo ({picSettings.changesRemaining} left)
  </button>
)}
```

### 2H. HOW THE PHOTO SYNCS ACROSS THE ENTIRE SYSTEM

The sync is automatic because ALL endpoints that return student data read from the same `photo`/`imageUrl` fields:

1. **Gatekeeper scan response** uses: `student.imageUrl || student.photo`
2. **Attendance records** populate student: `"studentName studentId class group photo imageUrl"`
3. **Student portal profile** uses: `this.imageUrl || this.photo || defaultAvatar`
4. **Admin student views** use the same Student document

When the student uploads a new photo:
- `student.photo = "/uploads/students/profile-260001-1723456789.jpg"`
- `student.imageUrl = "/uploads/students/profile-260001-1723456789.jpg"`
- Next Gatekeeper scan → picks up new photo automatically
- Next Attendance page load → shows new photo
- No cache busting needed because filename has timestamp

**Photo URL resolution in frontend:**
```typescript
// CRITICAL: Create a helper function to resolve photo URLs.
// The backend returns RELATIVE paths like "/uploads/students/profile-260006-123.jpg"
// These MUST be prefixed with API_BASE_URL or they'll 404 / show broken images.
// External URLs (http/https/data:) pass through unchanged.
// Falls back to DiceBear avatar if no photo exists.
const resolvePhoto = (photo: string | undefined, studentId: string) => {
  if (!photo) return "https://api.dicebear.com/7.x/avataaars/svg?seed=" + studentId;
  if (photo.startsWith("http") || photo.startsWith("data:")) return photo;
  return `${API_BASE_URL}${photo}`;
};

// USE THIS EVERYWHERE you display a student photo in the Gatekeeper:
<img src={resolvePhoto(scanResult.student.photo, scanResult.student.studentId)} />

// DO NOT do this (broken — relative path won't resolve):
// <img src={scanResult.student.photo || defaultPhoto} />
```

---

## CRITICAL UI FIXES FOR GATEKEEPER (APPLY THESE)

We fixed these UI issues that you'll want to avoid in your implementation:

### Fix 1: Content overflowing at 100% browser zoom
**Problem:** Elements were too large (10rem checkmarks, 320px photos, 7xl-8xl text) causing content to overflow below the viewport.
**Solution:**
- Photos: `h-52 w-52` (208px) instead of `h-80 w-80` (320px)
- Checkmark: `text-7xl` instead of `text-[10rem]`
- Names: `text-4xl` instead of `text-7xl`
- Balance amount: `text-5xl` instead of `text-7xl`
- Shield icons: `h-20 w-20` → `h-12 w-12` (inside `h-20 w-20` → `h-20 w-20` container)
- Gaps: `gap-6` not `gap-12`, `p-4` not `p-8`
- **CRITICAL**: Use `overflow-y-auto` not `overflow-hidden` on the result screens — this is a safety net

### Fix 2: ALREADY MARKED not showing on re-scan
**Problem:** The attendance text was in the code but positioned with `absolute bottom-10` which was off-screen at 100% zoom.
**Solution:** Use `mt-6` on a normal flow element instead of `absolute bottom-10`:
```tsx
// WRONG (gets cut off):
<p className="absolute bottom-10 text-2xl text-white/40">TAP ANYWHERE TO RESET</p>

// RIGHT (always visible):
<p className="mt-6 text-lg text-white/40 font-mono tracking-widest">
  {new Date().toLocaleTimeString()} • TAP ANYWHERE TO RESET
</p>
```

### Fix 3: Details cut off on GREEN and ORANGE screens
**Problem:** The 2-column grid (photo left, details right) with oversized elements pushed attendance status below viewport.
**Solution:** Reduced all element sizes proportionally and changed outer container from `overflow-hidden` to `overflow-y-auto`.

### Fix 4: Orange/warning screen missing attendance info
**Problem:** The partial-fee (orange) screen didn't show attendance status at all.
**Solution:** Added the attendance confirmation block to the warning screen JSX, identical to the success screen pattern.

### Fix 5: Student photo not showing in Gatekeeper after upload
**Problem:** Student uploads photo via portal → saved as `/uploads/students/profile-260006-xxx.jpg` → Students page and Portal show it correctly because they prepend `API_BASE_URL` → BUT the Gatekeeper used `src={scanResult.student.photo || defaultPhoto}` directly, which tries to load a RELATIVE path from the frontend origin (e.g. `localhost:8083/uploads/...`) instead of the backend (`localhost:5000/uploads/...`).
**Solution:** Create a `resolvePhoto()` helper that prepends `API_BASE_URL` for relative paths, passes through external URLs unchanged, and falls back to DiceBear avatar for null/undefined:
```typescript
const resolvePhoto = (photo: string | undefined, studentId: string) => {
  if (!photo) return "https://api.dicebear.com/7.x/avataaars/svg?seed=" + studentId;
  if (photo.startsWith("http") || photo.startsWith("data:")) return photo;
  return `${API_BASE_URL}${photo}`;
};
```
Use this in ALL three Gatekeeper screens (SUCCESS green, WARNING orange, DENIED red) instead of raw `scanResult.student.photo`.

---

## CHECKLIST FOR IMPLEMENTATION

### Backend:
- [ ] Create `models/Attendance.js` with compound unique index `{student: 1, date: 1}`
- [ ] Create `controllers/attendanceController.js` with 6 endpoints
- [ ] Create `routes/attendance.js` and register in server.js as `/api/attendance`
- [ ] Add attendance auto-marking block to your existing `scanBarcode` controller
- [ ] Include `attendance` field in scan response JSON
- [ ] Add `photo`, `imageUrl`, `profilePictureChangeCount`, `profilePictureChangeLog` to Student model
- [ ] Create `middleware/upload.js` with multer configs
- [ ] Add profile picture endpoints to student portal controller
- [ ] Add profile picture routes to student portal routes
- [ ] Add `app.use("/uploads", express.static(...))` to server.js
- [ ] Install multer: `npm install multer`

### Frontend:
- [ ] Create Attendance Management page with stats bar + table + search + class filter + 30-sec auto-refresh
- [ ] Add attendance status display to Gatekeeper SUCCESS (green) screen
- [ ] Add attendance status display to Gatekeeper WARNING (orange) screen
- [ ] Apply UI size fixes (compact elements for 100% zoom fit)
- [ ] Change `overflow-hidden` to `overflow-y-auto` on result screens
- [ ] Add camera overlay + file upload to Student Portal profile card
- [ ] Resolve photo URLs: relative paths need `${API_BASE_URL}` prefix — use a `resolvePhoto()` helper in ALL Gatekeeper screens (green/orange/red), NOT raw `photo` field
- [ ] DiceBear fallback for students without photos

### Security:
- [ ] File type validation (JPEG/PNG only) both client-side AND server-side
- [ ] File size limit (5MB)
- [ ] Auth middleware on all endpoints (protect + restrictTo for admin, protectStudent for portal)
- [ ] Compound unique index prevents duplicate attendance
- [ ] Rate-limit profile picture changes (configurable max, default 3)
- [ ] Escape any user input used in regex queries: `input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")`
- [ ] Use `isValidObjectId()` check before including `_id` in MongoDB `$or` queries
