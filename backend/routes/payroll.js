const express = require("express");
const router = express.Router();
const { protect, restrictTo } = require("../middleware/authMiddleware");
const {
  createPayoutRequest,
  getAllPayoutRequests,
  getTeacherPayoutRequests,
  approvePayoutRequest,
  rejectPayoutRequest,
  getPayrollDashboard,
  generateSessionSalaries,
  getTeacherReport,
  manualCreditTeacher,
} = require("../controllers/payrollController");

// @route   POST /api/payroll/request
// @desc    Teacher requests a cash payout
// @access  Protected
router.post("/request", protect, createPayoutRequest);

// @route   GET /api/payroll/requests
// @desc    Get all payout requests (for Owner dashboard)
// @access  Protected (OWNER only)
router.get("/requests", protect, restrictTo("OWNER"), getAllPayoutRequests);

// @route   GET /api/payroll/my-requests/:teacherId
// @desc    Get teacher's own payout requests
// @access  Protected
router.get("/my-requests/:teacherId", protect, getTeacherPayoutRequests);

// @route   POST /api/payroll/approve/:requestId
// @desc    Approve a payout request
// @access  Protected (OWNER only)
router.post(
  "/approve/:requestId",
  protect,
  restrictTo("OWNER"),
  approvePayoutRequest,
);

// @route   POST /api/payroll/reject/:requestId
// @desc    Reject a payout request
// @access  Protected (OWNER only)
router.post(
  "/reject/:requestId",
  protect,
  restrictTo("OWNER"),
  rejectPayoutRequest,
);

// @route   GET /api/payroll/dashboard
// @desc    Get payroll dashboard stats
// @access  Protected (OWNER only)
router.get("/dashboard", protect, restrictTo("OWNER"), getPayrollDashboard);

// @route   POST /api/payroll/generate-session-salaries
// @desc    Generate fixed salary accruals for active session
// @access  Protected (OWNER only)
router.post(
  "/generate-session-salaries",
  protect,
  restrictTo("OWNER"),
  generateSessionSalaries,
);

// @route   GET /api/payroll/teacher-report/:teacherId
// @desc    Get a teacher payroll report for the active session
// @access  Protected (OWNER only)
router.get(
  "/teacher-report/:teacherId",
  protect,
  restrictTo("OWNER"),
  getTeacherReport,
);

// @route   POST /api/payroll/credit
// @desc    Manually credit a teacher's pending balance (Liability entry)
// @access  Protected (OWNER only)
router.post(
  "/credit",
  protect,
  restrictTo("OWNER"),
  manualCreditTeacher,
);

module.exports = router;
