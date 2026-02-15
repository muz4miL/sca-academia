const express = require("express");
const router = express.Router();
const {
  markAttendance,
  getTodayAttendance,
  getAttendanceByRange,
  getStudentAttendance,
  updateAttendance,
  markAbsentees,
  getClassList,
} = require("../controllers/attendanceController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

/**
 * Attendance Routes — Sciences Coaching Academy
 * All routes protected, role-gated
 */

// Mark attendance (manual or from frontend)
router.post(
  "/mark",
  protect,
  restrictTo("OWNER", "OPERATOR", "ADMIN", "STAFF", "PARTNER"),
  markAttendance
);

// Get today's attendance summary + records
router.get(
  "/today",
  protect,
  restrictTo("OWNER", "OPERATOR", "ADMIN", "STAFF", "PARTNER"),
  getTodayAttendance
);

// Get attendance by date range
router.get(
  "/range",
  protect,
  restrictTo("OWNER", "OPERATOR", "ADMIN", "STAFF", "PARTNER"),
  getAttendanceByRange
);

// Get specific student's attendance history
router.get(
  "/student/:id",
  protect,
  restrictTo("OWNER", "OPERATOR", "ADMIN", "STAFF", "PARTNER"),
  getStudentAttendance
);

// Update attendance record (admin correction)
router.put(
  "/:id",
  protect,
  restrictTo("OWNER", "ADMIN"),
  updateAttendance
);

// Bulk mark absentees (end of day)
router.post(
  "/mark-absent",
  protect,
  restrictTo("OWNER", "ADMIN"),
  markAbsentees
);

// Get class list for filter dropdowns
router.get(
  "/classes",
  protect,
  restrictTo("OWNER", "OPERATOR", "ADMIN", "STAFF", "PARTNER"),
  getClassList
);

module.exports = router;
