const express = require("express");
const router = express.Router();
const {
  getTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
} = require("../controllers/teacherController");
const TeacherPayment = require("../models/TeacherPayment");
const Teacher = require("../models/Teacher");
const User = require("../models/User");
const Class = require("../models/Class");
const Student = require("../models/Student");
const Transaction = require("../models/Transaction");
const Session = require("../models/Session");

// @route   GET /api/teachers
// @desc    Get all teachers
router.get("/", getTeachers);

// @route   GET /api/teachers/:id/revenue
// @desc    Get teacher revenue data (total revenue, teacher share)
// @access  Public
router.get("/:id/revenue", async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id).lean();
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    // Find active session
    const activeSession = await Session.findOne({ status: "active" }).lean();

    // Find classes assigned to this teacher
    const classQuery = {
      $or: [
        { assignedTeacher: teacher._id },
        { "subjectTeachers.teacherId": teacher._id },
      ],
    };
    if (activeSession?._id) {
      classQuery.session = activeSession._id;
    }
    const classes = await Class.find(classQuery).select("_id").lean();
    const classIds = classes.map((c) => c._id);

    // Calculate revenue from fee transactions linked to this teacher
    const compType = teacher.compensation?.type || "percentage";
    let totalRevenue = 0;
    let teacherShare = 0;

    if (compType === "percentage" || compType === "hybrid") {
      // Get income transactions with this teacher's split
      const txQuery = {
        type: "INCOME",
        "splitDetails.teacherId": teacher._id,
      };
      if (activeSession?._id) {
        const sessionStudents = await Student.find({ sessionRef: activeSession._id }).select("_id").lean();
        if (sessionStudents.length > 0) {
          txQuery.studentId = { $in: sessionStudents.map((s) => s._id) };
        }
      }

      const transactions = await Transaction.find(txQuery).lean();
      for (const tx of transactions) {
        totalRevenue += tx.amount || 0;
        teacherShare += tx.splitDetails?.teacherShare || 0;
      }
    } else if (compType === "fixed") {
      // For fixed salary, total revenue is from class students, teacher share is pending balance
      if (classIds.length > 0) {
        const revenueResult = await Student.aggregate([
          { $match: { classRef: { $in: classIds } } },
          { $group: { _id: null, total: { $sum: "$paidAmount" } } },
        ]);
        totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
      }
      teacherShare = teacher.balance?.pending || 0;
    }

    res.json({
      success: true,
      data: {
        totalRevenue,
        teacherShare,
        compensationType: compType,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching teacher revenue:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch revenue", error: error.message });
  }
});

// @route   GET /api/teachers/:id
// @desc    Get single teacher
router.get("/:id", getTeacherById);

// @route   POST /api/teachers
// @desc    Create new teacher
router.post("/", createTeacher);

// @route   PUT /api/teachers/:id
// @desc    Update teacher
router.put("/:id", updateTeacher);

// @route   DELETE /api/teachers/:id
// @desc    Delete teacher
router.delete("/:id", deleteTeacher);

// @route   POST /api/teachers/:id/reset-password
// @desc    Reset teacher password (Admin sets new password)
// @access  Public (Admin use)
router.post("/:id/reset-password", async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 4 characters",
      });
    }

    // Find teacher and their linked User account
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    if (!teacher.userId) {
      return res.status(400).json({
        success: false,
        message: "Teacher has no linked User account. Cannot reset password.",
      });
    }

    // Find the User document and update password
    const user = await User.findById(teacher.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found for this teacher",
      });
    }

    // Update password (pre-save hook will hash it)
    user.password = newPassword;
    await user.save();

    // Store plainPassword on teacher for admin display
    teacher.plainPassword = newPassword;
    await teacher.save();

    console.log("✅ Password reset for teacher:", teacher.name);

    res.json({
      success: true,
      message: "Password reset successfully",
      data: {
        username: teacher.username || user.username,
        newPassword: newPassword,
      },
    });
  } catch (error) {
    console.error("❌ Error resetting teacher password:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: error.message,
    });
  }
});

// @route   GET /api/teachers/payments/history
// @desc    Get all teacher payment transactions
// @access  Public
router.get("/payments/history", async (req, res) => {
  try {
    const { teacherId, month, year, limit = 50 } = req.query;

    const query = {};
    if (teacherId) query.teacherId = teacherId;
    if (month) query.month = month;
    if (year) query.year = parseInt(year);

    const payments = await TeacherPayment.find(query)
      .sort({ paymentDate: -1 })
      .limit(parseInt(limit))
      .populate("teacherId", "name subject");

    // Calculate total paid amount
    const totalPaid = payments.reduce(
      (sum, payment) => sum + payment.amountPaid,
      0,
    );

    res.json({
      success: true,
      data: {
        payments,
        totalPaid,
        count: payments.length,
      },
    });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment history",
      error: error.message,
    });
  }
});

// ==================== UNIFIED PAYOUT ENDPOINT ====================
// @route   POST /api/teachers/payout
// @desc    Process teacher payout from Finance dashboard
// @access  Public
router.post("/payout", async (req, res) => {
  try {
    const Teacher = require("../models/Teacher");
    const { teacherId, amount } = req.body;

    console.log("🔍 Payout request received:", { teacherId, amount });

    // Validation
    if (!teacherId || !amount) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: teacherId, amount",
      });
    }

    const teacher = await Teacher.findById(teacherId);
    console.log("📋 Teacher found:", teacher ? teacher.name : "NOT FOUND");

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    // Get current month and year
    const now = new Date();
    const month = now.toLocaleString("en-US", { month: "long" });
    const year = now.getFullYear();
    console.log("📅 Payment period:", { month, year });

    // Check if already paid for this period
    const existingPayment = await TeacherPayment.findOne({
      teacherId: teacher._id,
      month,
      year,
      status: "paid",
    });
    console.log(
      "🔍 Existing payment check:",
      existingPayment ? "FOUND - Already paid" : "NOT FOUND - Proceeding",
    );

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: `Teacher already paid for ${month} ${year}`,
        voucherId: existingPayment.voucherId,
      });
    }

    // Create payment record
    const Session = require("../models/Session");
    const activeSession = await Session.findOne({ status: "active" })
      .sort({ startDate: -1 })
      .lean();
    console.log("💾 Creating payment record...");

    // MANUALLY GENERATE VOUCHER ID (bypass broken pre-save hook)
    const paymentCount = await TeacherPayment.countDocuments();
    const voucherId = `TP-${year}${String(now.getMonth() + 1).padStart(2, "0")}-${String(paymentCount + 1).padStart(4, "0")}`;
    console.log("🎫 MANUALLY GENERATED voucherId:", voucherId);

    const payment = new TeacherPayment({
      voucherId: voucherId, // SET MANUALLY
      teacherId: teacher._id,
      teacherName: teacher.name,
      subject: teacher.subject,
      amountPaid: parseFloat(amount),
      compensationType: teacher.compensation?.type || "percentage",
      month,
      year,
      paymentMethod: "cash",
      status: "paid",
      sessionId: activeSession?._id,
      sessionName: activeSession?.sessionName,
    });

    await payment.save();
    console.log("✅ Payment saved with voucherId:", payment.voucherId);

    console.log(
      `✅ Payout processed: ${payment.voucherId} for ${teacher.name} - ${amount} PKR`,
    );

    res.status(201).json({
      success: true,
      message: "Payment processed successfully",
      data: {
        voucherId: payment.voucherId,
        teacherName: teacher.name,
        subject: teacher.subject,
        amountPaid: payment.amountPaid,
        month: payment.month,
        year: payment.year,
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod,
      },
    });
  } catch (error) {
    console.error("❌ Error processing teacher payout:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Failed to process payment",
      error: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// @route   GET /api/teachers/recent-payouts
// @desc    Get recent payment history for all teachers
// @access  Public
router.get("/recent-payouts", async (req, res) => {
  try {
    const payments = await TeacherPayment.find({ status: "paid" })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch recent payouts",
      error: error.message,
    });
  }
});

// ==================== TEACHER WALLET ENDPOINTS ====================

// @route   GET /api/teachers/:id/wallet
// @desc    Get teacher wallet transactions
// @access  Public
router.get("/:id/wallet", async (req, res) => {
  try {
    const Teacher = require("../models/Teacher");
    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    // Get all payment records as transactions
    const payments = await TeacherPayment.find({ teacherId: teacher._id })
      .sort({ createdAt: -1 })
      .limit(50);

    // Transform to transaction format
    const transactions = payments.map((p) => ({
      _id: p._id,
      type: "debit", // All payments are debits (money going out)
      amount: p.amountPaid,
      description: `${p.month} ${p.year} - ${p.notes || "Salary Payment"}`,
      createdAt: p.createdAt,
      voucherId: p.voucherId,
    }));

    res.json({
      success: true,
      data: transactions,
      balance: teacher.balance?.pending || 0,
    });
  } catch (error) {
    console.error("Error fetching wallet:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch wallet transactions",
      error: error.message,
    });
  }
});

// @route   POST /api/teachers/:id/wallet/credit
// @desc    Add amount to teacher's payable balance (Credit)
// @access  Public
router.post("/:id/wallet/credit", async (req, res) => {
  try {
    const Teacher = require("../models/Teacher");
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    // Initialize balance if it doesn't exist
    if (!teacher.balance) {
      teacher.balance = { floating: 0, verified: 0, pending: 0 };
    }

    // Add to pending balance (payable to teacher)
    teacher.balance.pending =
      (teacher.balance.pending || 0) + parseFloat(amount);
    await teacher.save();

    console.log(
      `💰 Credited PKR ${amount} to ${teacher.name}'s wallet. New balance: ${teacher.balance.pending}`,
    );

    res.json({
      success: true,
      message: `PKR ${amount} added to wallet`,
      newBalance: teacher.balance.pending,
      data: {
        teacherId: teacher._id,
        teacherName: teacher.name,
        amountAdded: parseFloat(amount),
        description: description || "Manual credit",
        newBalance: teacher.balance.pending,
      },
    });
  } catch (error) {
    console.error("Error crediting wallet:", error);
    res.status(500).json({
      success: false,
      message: "Failed to credit wallet",
      error: error.message,
    });
  }
});

// @route   POST /api/teachers/:id/wallet/debit
// @desc    Release payment from teacher's wallet (Debit) & create expense record + notification
// @access  Public
router.post("/:id/wallet/debit", async (req, res) => {
  try {
    const Teacher = require("../models/Teacher");
    const Notification = require("../models/Notification");
    const Expense = require("../models/Expense");
    const User = require("../models/User");
    const Session = require("../models/Session");
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    const currentBalance = teacher.balance?.pending || 0;

    // Check if sufficient balance
    if (parseFloat(amount) > currentBalance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: PKR ${currentBalance}`,
      });
    }

    // Get current month and year
    const now = new Date();
    const month = now.toLocaleString("en-US", { month: "long" });
    const year = now.getFullYear();

    // Generate voucher ID
    const paymentCount = await TeacherPayment.countDocuments();
    const voucherId = `TP-${year}${String(now.getMonth() + 1).padStart(2, "0")}-${String(paymentCount + 1).padStart(4, "0")}`;

    // Create payment record
    const activeSession = await Session.findOne({ status: "active" })
      .sort({ startDate: -1 })
      .lean();

    const payment = new TeacherPayment({
      voucherId: voucherId,
      teacherId: teacher._id,
      teacherName: teacher.name,
      subject: teacher.subject,
      amountPaid: parseFloat(amount),
      compensationType: teacher.compensation?.type || "percentage",
      month,
      year,
      paymentMethod: "cash",
      status: "paid",
      notes: description || "Wallet Payment",
      sessionId: activeSession?._id,
      sessionName: activeSession?.sessionName,
    });

    await payment.save();

    // Deduct from pending balance
    teacher.balance.pending = currentBalance - parseFloat(amount);
    teacher.totalPaid = (teacher.totalPaid || 0) + parseFloat(amount);
    await teacher.save();

    // ==================== CREATE EXPENSE RECORD ====================
    try {
      const expenseCount = await Expense.countDocuments();
      const expenseBillNo = `TESAL-${year}${String(now.getMonth() + 1).padStart(2, "0")}-${String(expenseCount + 1).padStart(4, "0")}`;

      const expense = new Expense({
        title: `Teacher Salary - ${teacher.name}`,
        category: "Salaries",
        amount: parseFloat(amount),
        status: "paid",
        expenseDate: now,
        dueDate: now,
        paidDate: now,
        vendorName: teacher.name,
        description:
          description ||
          `Salary payment for ${teacher.name} (${teacher.subject})`,
        billNumber: expenseBillNo,
        paidByType: "ACADEMY_CASH",
      });
      await expense.save();
      console.log(
        `📊 Created expense record for teacher salary: ${expense.billNumber}`,
      );
    } catch (expenseError) {
      // Non-critical - log but don't fail the main operation
      console.error(
        "⚠️ Could not create expense record:",
        expenseError.message,
      );
    }

    // ==================== CREATE NOTIFICATION FOR OWNER ====================
    try {
      // Get current user from request (if authenticated) or use system
      const performedBy = req.user?.name || "System";

      // Find owner user
      const ownerUser = await User.findOne({
        role: { $in: ["owner", "OWNER"] },
      });

      // Create notification
      const notification = new Notification({
        recipient: ownerUser?._id || null,
        recipientRole: "OWNER",
        message: `💸 PAYMENT ALERT: ${teacher.name} was paid PKR ${parseFloat(amount).toLocaleString()} by ${performedBy}`,
        type: "FINANCE",
        relatedId: voucherId,
      });
      await notification.save();
      console.log(
        `🔔 Created notification for owner: Teacher payment of PKR ${amount}`,
      );
    } catch (notifError) {
      // Non-critical - log but don't fail the main operation
      console.error("⚠️ Could not create notification:", notifError.message);
    }

    console.log(
      `💸 Debited PKR ${amount} from ${teacher.name}'s wallet. Voucher: ${voucherId}. New balance: ${teacher.balance.pending}`,
    );

    res.json({
      success: true,
      message: `PKR ${amount} paid successfully`,
      voucherId: voucherId,
      newBalance: teacher.balance.pending,
      data: {
        voucherId,
        teacherId: teacher._id,
        teacherName: teacher.name,
        subject: teacher.subject,
        amountPaid: parseFloat(amount),
        remainingBalance: teacher.balance.pending,
        paymentDate: now,
      },
    });
  } catch (error) {
    console.error("Error debiting wallet:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process payment",
      error: error.message,
    });
  }
});

module.exports = router;
