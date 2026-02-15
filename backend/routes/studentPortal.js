const express = require("express");
const router = express.Router();
const { protectStudent } = require("../middleware/auth");
const {
    studentLogin,
    getStudentProfile,
    getStudentVideos,
    recordVideoView,
    studentLogout,
    getStudentSchedule,
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

// Logout
router.post("/logout", protectStudent, studentLogout);

module.exports = router;

