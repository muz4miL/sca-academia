const express = require("express");
const router = express.Router();
const { protect, restrictTo } = require("../middleware/authMiddleware");
const { protectStudent } = require("../middleware/auth");

const {
    createExam,
    getAllExams,
    getExamById,
    getExamsForClass,
    getExamForStudent,
    submitExam,
    getExamResults,
    getMyResults,
    updateExam,
    deleteExam,
} = require("../controllers/examController");

// ========================================
// ADMIN/TEACHER ROUTES
// ========================================

// Create exam (Teacher/Admin)
router.post("/", protect, restrictTo("OWNER", "ADMIN", "TEACHER"), createExam);

// Get all exams (Teacher/Admin)
router.get("/", protect, restrictTo("OWNER", "ADMIN", "TEACHER"), getAllExams);

// Get single exam with answers (Teacher/Admin)
router.get("/:id", protect, restrictTo("OWNER", "ADMIN", "TEACHER"), getExamById);

// Get exam results/leaderboard (Teacher/Admin)
router.get("/:id/results", protect, restrictTo("OWNER", "ADMIN", "TEACHER"), getExamResults);

// Update exam (Teacher/Admin)
router.put("/:id", protect, restrictTo("OWNER", "ADMIN", "TEACHER"), updateExam);

// Delete exam (Teacher/Admin)
router.delete("/:id", protect, restrictTo("OWNER", "ADMIN", "TEACHER"), deleteExam);

// ========================================
// STUDENT ROUTES
// ========================================

// Get exams for student's class (Student)
router.get("/class/:classId", protectStudent, getExamsForClass);

// Get exam to take (Student - NO correct answers)
router.get("/:id/take", protectStudent, getExamForStudent);

// Submit exam answers (Student)
router.post("/:id/submit", protectStudent, submitExam);

// Get my results (Student)
router.get("/student/my-results", protectStudent, getMyResults);

module.exports = router;
