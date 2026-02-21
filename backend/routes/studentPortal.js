const express = require("express");
const router = express.Router();
const { protectStudent } = require("../middleware/auth");
const { handleStudentProfilePhotoUpload } = require("../middleware/upload");
const {
  studentLogin,
  getStudentProfile,
  getStudentVideos,
  recordVideoView,
  studentLogout,
  getStudentSchedule,
  getProfilePictureStatus,
  updateProfilePicture,
} = require("../controllers/studentPortalController");

/**
 * Student Portal Routes - LMS Module
 */

// ========================================
// PUBLIC ROUTES
// ========================================

// Student login
router.post("/login", studentLogin);

// ========================================
// PROTECTED ROUTES (Student only)
// ========================================

// Get profile
router.get("/me", protectStudent, getStudentProfile);

// Get videos
router.get("/videos", protectStudent, getStudentVideos);

// Get schedule/timetable
router.get("/schedule", protectStudent, getStudentSchedule);

// Record video view
router.post("/videos/:id/view", protectStudent, recordVideoView);

// Profile Picture Management
router.get("/profile-picture/status", protectStudent, getProfilePictureStatus);
router.post(
  "/profile-picture",
  protectStudent,
  handleStudentProfilePhotoUpload,
  updateProfilePicture,
);

// Logout
router.post("/logout", protectStudent, studentLogout);

module.exports = router;

