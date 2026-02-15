const PayoutRequest = require("../models/PayoutRequest");
const Teacher = require("../models/Teacher");
const Transaction = require("../models/Transaction");
const Expense = require("../models/Expense");
const Configuration = require("../models/Configuration");
const User = require("../models/User");
const Notification = require("../models/Notification");
const Session = require("../models/Session");
const Student = require("../models/Student");
const TeacherPayment = require("../models/TeacherPayment");
const Class = require("../models/Class");

// @desc    Teacher requests a cash payout
// @route   POST /api/payroll/request
// @access  Protected (Teacher)
exports.createPayoutRequest = async (req, res) => {
  try {
    const { teacherId, amount } = req.body;

    // Validate input
    if (!teacherId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Teacher ID and valid amount are required",
      });
    }

    // Find the teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    // Check if teacher has sufficient verified balance
    const verifiedBalance = teacher.balance?.verified || 0;
    if (verifiedBalance < amount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: PKR ${verifiedBalance.toLocaleString()}`,
      });
    }

    // Check for existing pending request
    const existingRequest = await PayoutRequest.findOne({
      teacherId: teacher._id,
      status: "PENDING",
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: `You already have a pending request for PKR ${existingRequest.amount.toLocaleString()}. Please wait for approval.`,
      });
    }

    // Create payout request
    const payoutRequest = await PayoutRequest.create({
      teacherId: teacher._id,
      teacherName: teacher.name,
      amount: amount,
      status: "PENDING",
      requestDate: new Date(),
    });

    // Notify Owner about new payout request
    const owners = await User.find({ role: "OWNER" });
    for (const owner of owners) {
      await Notification.create({
        recipient: owner._id,
        message: `🏦 ${teacher.name} has requested a cash payout of PKR ${amount.toLocaleString()}`,
        type: "FINANCE",
        relatedId: payoutRequest._id.toString(),
      });
    }

    return res.status(201).json({
      success: true,
      message: `✅ Payout request for PKR ${amount.toLocaleString()} submitted successfully`,
      data: payoutRequest,
    });
  } catch (error) {
    console.error("❌ Error in createPayoutRequest:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating payout request",
      error: error.message,
    });
  }
};

// @desc    Get all payout requests
// @route   GET /api/payroll/requests
// @access  Protected (OWNER only)
exports.getAllPayoutRequests = async (req, res) => {
  try {
    const { status, teacherId } = req.query;

    const query = {};
    if (status) query.status = status;
    if (teacherId) query.teacherId = teacherId;

    const requests = await PayoutRequest.find(query)
      .populate("teacherId", "name phone subject balance")
      .populate("approvedBy", "fullName")
      .sort({ requestDate: -1 });

    // Calculate summary stats
    const pendingCount = await PayoutRequest.countDocuments({
      status: "PENDING",
    });
    const pendingTotal = await PayoutRequest.aggregate([
      { $match: { status: "PENDING" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    return res.status(200).json({
      success: true,
      count: requests.length,
      summary: {
        pendingCount,
        pendingTotal: pendingTotal[0]?.total || 0,
      },
      data: requests,
    });
  } catch (error) {
    console.error("❌ Error in getAllPayoutRequests:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching payout requests",
      error: error.message,
    });
  }
};

// @desc    Get teacher's own payout requests
// @route   GET /api/payroll/my-requests/:teacherId
// @access  Protected
exports.getTeacherPayoutRequests = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const requests = await PayoutRequest.find({ teacherId })
      .sort({ requestDate: -1 })
      .limit(20);

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error("❌ Error in getTeacherPayoutRequests:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching payout requests",
      error: error.message,
    });
  }
};

// @desc    Approve a payout request (OWNER only)
// @route   POST /api/payroll/approve/:requestId
// @access  Protected (OWNER only)
exports.approvePayoutRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { notes } = req.body;

    // Find the request
    const payoutRequest = await PayoutRequest.findById(requestId);
    if (!payoutRequest) {
      return res.status(404).json({
        success: false,
        message: "Payout request not found",
      });
    }

    if (payoutRequest.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Request has already been ${payoutRequest.status.toLowerCase()}`,
      });
    }

    // Find the teacher
    const teacher = await Teacher.findById(payoutRequest.teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    // Verify teacher still has sufficient balance
    const verifiedBalance = teacher.balance?.verified || 0;
    if (verifiedBalance < payoutRequest.amount) {
      return res.status(400).json({
        success: false,
        message: `Teacher's balance has changed. Available: PKR ${verifiedBalance.toLocaleString()}, Requested: PKR ${payoutRequest.amount.toLocaleString()}`,
      });
    }

    // ========================================
    // APPROVAL LOGIC
    // ========================================

    // 1. Deduct amount from teacher's verified balance
    teacher.balance.verified = verifiedBalance - payoutRequest.amount;
    await teacher.save();

    // 2. Create a Transaction of type EXPENSE with category SALARY
    const transaction = await Transaction.create({
      type: "EXPENSE",
      category: "Salaries",
      subCategory: "Teacher Payout",
      amount: payoutRequest.amount,
      description: `Salary payout to ${teacher.name}`,
      collectedBy: req.user._id,
      status: "VERIFIED",
      date: new Date(),
      metadata: {
        teacherId: teacher._id,
        teacherName: teacher.name,
        payoutRequestId: payoutRequest._id,
      },
    });

    // 3. Create an Expense record for tracking (simplified - no partner splits)
    const expense = await Expense.create({
      title: `Salary: ${teacher.name}`,
      category: "Salaries",
      amount: payoutRequest.amount,
      vendorName: teacher.name,
      dueDate: new Date(),
      expenseDate: new Date(),
      status: "paid",
      paidDate: new Date(),
      description: `Approved payout request ${payoutRequest.requestId}`,
    });

    // 4. Update the payout request
    payoutRequest.status = "APPROVED";
    payoutRequest.approvedBy = req.user._id;
    payoutRequest.approvedAt = new Date();
    payoutRequest.approvalNotes = notes || "Approved by Owner";
    payoutRequest.transactionId = transaction._id;
    await payoutRequest.save();

    // 5. Notify the teacher
    await Notification.create({
      recipient: teacher._id,
      message: `✅ Your payout request of PKR ${payoutRequest.amount.toLocaleString()} has been APPROVED! Cash is ready for collection.`,
      type: "FINANCE",
      relatedId: payoutRequest._id.toString(),
    });

    return res.status(200).json({
      success: true,
      message: `✅ Payout of PKR ${payoutRequest.amount.toLocaleString()} to ${teacher.name} approved successfully`,
      data: {
        payoutRequest,
        transaction,
        expense,
        newTeacherBalance: teacher.balance.verified,
      },
    });
  } catch (error) {
    console.error("❌ Error in approvePayoutRequest:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while approving payout request",
      error: error.message,
    });
  }
};

// @desc    Reject a payout request (OWNER only)
// @route   POST /api/payroll/reject/:requestId
// @access  Protected (OWNER only)
exports.rejectPayoutRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;

    const payoutRequest = await PayoutRequest.findById(requestId);
    if (!payoutRequest) {
      return res.status(404).json({
        success: false,
        message: "Payout request not found",
      });
    }

    if (payoutRequest.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Request has already been ${payoutRequest.status.toLowerCase()}`,
      });
    }

    // Update request
    payoutRequest.status = "REJECTED";
    payoutRequest.rejectedBy = req.user._id;
    payoutRequest.rejectedAt = new Date();
    payoutRequest.rejectionReason = reason || "Rejected by Owner";
    await payoutRequest.save();

    // Notify the teacher
    const teacher = await Teacher.findById(payoutRequest.teacherId);
    if (teacher) {
      await Notification.create({
        recipient: teacher._id,
        message: `❌ Your payout request of PKR ${payoutRequest.amount.toLocaleString()} was rejected. Reason: ${reason || "No reason provided"}`,
        type: "FINANCE",
        relatedId: payoutRequest._id.toString(),
      });
    }

    return res.status(200).json({
      success: true,
      message: `Payout request rejected`,
      data: payoutRequest,
    });
  } catch (error) {
    console.error("❌ Error in rejectPayoutRequest:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while rejecting payout request",
      error: error.message,
    });
  }
};

// @desc    Get payroll dashboard stats
// @route   GET /api/payroll/dashboard
// @access  Protected (OWNER only)
exports.getPayrollDashboard = async (req, res) => {
  try {
    const activeSession = await Session.findOne({ status: "active" })
      .sort({ startDate: -1 })
      .lean();

    const teachers = await Teacher.find({ status: "active" }).select(
      "name subject balance totalPaid compensation salaryAccruals",
    );

    const creditTotals = await Transaction.aggregate([
      { $match: { type: "CREDIT", "splitDetails.teacherId": { $ne: null } } },
      {
        $group: { _id: "$splitDetails.teacherId", total: { $sum: "$amount" } },
      },
    ]);

    const payoutTotals = await Transaction.aggregate([
      {
        $match: {
          type: "EXPENSE",
          category: {
            $in: [
              "Teacher Salary",
              "Teacher Advance",
              "Teacher Payout",
              "Teacher_Payout",
            ],
          },
          "splitDetails.teacherId": { $ne: null },
        },
      },
      {
        $group: { _id: "$splitDetails.teacherId", total: { $sum: "$amount" } },
      },
    ]);

    const creditMap = new Map(
      creditTotals.map((item) => [item._id.toString(), item.total]),
    );
    const payoutMap = new Map(
      payoutTotals.map((item) => [item._id.toString(), item.total]),
    );

    const teachersWithBalances = teachers.map((teacher) => {
      const floating = teacher.balance?.floating || 0;
      const verified = teacher.balance?.verified || 0;
      const pending = teacher.balance?.pending || 0;
      const payableBalance = pending;
      const teacherId = teacher._id.toString();

      return {
        _id: teacher._id,
        name: teacher.name,
        subject: teacher.subject,
        compensation: teacher.compensation,
        balance: {
          floating,
          verified,
          pending,
          total: floating + verified + pending,
          payable: payableBalance,
        },
        totalPaid: teacher.totalPaid || 0,
        totalEarned: creditMap.get(teacherId) || 0,
        totalWithdrawn: payoutMap.get(teacherId) || 0,
        netPayable: pending,
      };
    });

    const totalTeacherLiability = teachersWithBalances.reduce(
      (sum, t) => sum + (t.balance?.payable || 0),
      0,
    );

    const totalPaidSession = activeSession
      ? await TeacherPayment.aggregate([
          { $match: { sessionId: activeSession._id } },
          { $group: { _id: null, total: { $sum: "$amountPaid" } } },
        ])
      : [];

    return res.status(200).json({
      success: true,
      data: {
        activeSession,
        totalPaidSession: totalPaidSession[0]?.total || 0,
        teachersWithBalances,
        totalTeacherLiability,
      },
    });
  } catch (error) {
    console.error("❌ Error in getPayrollDashboard:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching payroll dashboard",
      error: error.message,
    });
  }
};

const getActiveSession = async () => {
  return Session.findOne({ status: "active" }).sort({ startDate: -1 }).lean();
};

// @desc    Generate fixed salary accruals for active session
// @route   POST /api/payroll/generate-session-salaries
// @access  Protected (OWNER only)
exports.generateSessionSalaries = async (req, res) => {
  try {
    const activeSession = await getActiveSession();
    if (!activeSession) {
      return res.status(400).json({
        success: false,
        message: "No active session found to generate salaries.",
      });
    }

    const fixedTeachers = await Teacher.find({
      status: "active",
      "compensation.type": "fixed",
    });

    let createdCount = 0;
    const created = [];

    for (const teacher of fixedTeachers) {
      const salary = teacher.compensation?.fixedSalary || 0;
      if (salary <= 0) continue;

      const alreadyAccrued = (teacher.salaryAccruals || []).some(
        (entry) => entry.sessionId?.toString() === activeSession._id.toString(),
      );

      if (alreadyAccrued) continue;

      teacher.salaryAccruals = teacher.salaryAccruals || [];
      teacher.salaryAccruals.push({
        sessionId: activeSession._id,
        sessionName: activeSession.sessionName,
        amount: salary,
        createdAt: new Date(),
      });

      if (!teacher.balance) {
        teacher.balance = { floating: 0, verified: 0, pending: 0 };
      }
      teacher.balance.pending = (teacher.balance.pending || 0) + salary;

      await teacher.save();

      createdCount += 1;
      created.push({
        teacherId: teacher._id,
        teacherName: teacher.name,
        amount: salary,
      });
    }

    return res.json({
      success: true,
      message: `Generated salary accruals for ${createdCount} teacher(s).`,
      data: {
        session: activeSession,
        createdCount,
        created,
      },
    });
  } catch (error) {
    console.error("❌ Error in generateSessionSalaries:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while generating salaries",
      error: error.message,
    });
  }
};

// @desc    Get teacher payout report (earnings, payouts, balance)
// @route   GET /api/payroll/teacher-report/:teacherId
// @access  Protected (OWNER only)
exports.getTeacherReport = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const teacher = await Teacher.findById(teacherId).lean();
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    const activeSession = await getActiveSession();

    const compType = teacher.compensation?.type || "percentage";
    const balance = teacher.balance || { floating: 0, verified: 0, pending: 0 };
    const payableBalance =
      compType === "fixed"
        ? balance.pending || 0
        : (balance.verified || 0) + (balance.floating || 0);

    let incomeTotals = {
      teacherShare: 0,
      academyShare: 0,
      totalRevenue: 0,
    };

    let incomeTransactions = [];
    let classRevenueBreakdown = [];

    const classQuery = { status: "active", $or: [] };
    if (activeSession?._id) {
      classQuery.session = activeSession._id;
    }
    classQuery.$or.push({ assignedTeacher: teacher._id });
    classQuery.$or.push({ "subjectTeachers.teacherId": teacher._id });

    const classesTaught = await Class.find(classQuery)
      .select("classTitle gradeLevel group shift session")
      .lean();

    const classIds = classesTaught.map((c) => c._id);

    const classStudentCounts = classIds.length
      ? await Student.aggregate([
          {
            $match: {
              classRef: { $in: classIds },
              status: "active",
              ...(activeSession?._id ? { sessionRef: activeSession._id } : {}),
            },
          },
          { $group: { _id: "$classRef", count: { $sum: 1 } } },
        ])
      : [];

    const classCountMap = new Map(
      classStudentCounts.map((c) => [c._id.toString(), c.count]),
    );

    const classesWithCounts = classesTaught.map((c) => ({
      _id: c._id,
      classTitle: c.classTitle,
      gradeLevel: c.gradeLevel,
      group: c.group,
      shift: c.shift,
      studentCount: classCountMap.get(c._id.toString()) || 0,
    }));

    const totalStudents = classesWithCounts.reduce(
      (sum, c) => sum + (c.studentCount || 0),
      0,
    );

    if (compType === "percentage") {
      let studentIds = [];
      if (activeSession?._id) {
        const students = await Student.find({ sessionRef: activeSession._id })
          .select("_id")
          .lean();
        studentIds = students.map((s) => s._id);
      }

      const txQuery = {
        type: "INCOME",
        "splitDetails.teacherId": teacher._id,
      };
      if (studentIds.length > 0) {
        txQuery.studentId = { $in: studentIds };
      }

      const transactions = await Transaction.find(txQuery)
        .populate("studentId", "studentName class group")
        .sort({ date: -1 })
        .limit(100)
        .lean();

      incomeTransactions = transactions.map((tx) => ({
        _id: tx._id,
        amount: tx.amount,
        date: tx.date,
        description: tx.description,
        studentName: tx.studentId?.studentName || "Unknown",
        studentClass: tx.studentId?.class || "—",
        teacherShare: tx.splitDetails?.teacherShare || 0,
        academyShare: tx.splitDetails?.academyShare || 0,
      }));

      incomeTotals = transactions.reduce(
        (acc, tx) => {
          const teacherShare = tx.splitDetails?.teacherShare || 0;
          const academyShare = tx.splitDetails?.academyShare || 0;
          acc.teacherShare += teacherShare;
          acc.academyShare += academyShare;
          acc.totalRevenue += tx.amount || 0;
          return acc;
        },
        { teacherShare: 0, academyShare: 0, totalRevenue: 0 },
      );

      const txStudentIds = transactions
        .map((tx) => tx.studentId)
        .filter(Boolean);

      const students = txStudentIds.length
        ? await Student.find({ _id: { $in: txStudentIds } })
            .select("_id classRef class")
            .lean()
        : [];

      const studentMap = new Map(students.map((s) => [s._id.toString(), s]));

      const classInfoMap = new Map(
        classesWithCounts.map((c) => [c._id.toString(), c]),
      );

      const classRevenueMap = new Map();
      transactions.forEach((tx) => {
        const student = tx.studentId
          ? studentMap.get(tx.studentId.toString())
          : null;
        const classId = student?.classRef?.toString() || null;
        const classKey = classId || `unknown:${student?.class || "Unknown"}`;
        const existing = classRevenueMap.get(classKey) || {
          classId,
          classTitle: classId
            ? classInfoMap.get(classId)?.classTitle
            : student?.class || "Unknown",
          gradeLevel: classId ? classInfoMap.get(classId)?.gradeLevel : null,
          group: classId ? classInfoMap.get(classId)?.group : null,
          shift: classId ? classInfoMap.get(classId)?.shift : null,
          studentCount: classId ? classCountMap.get(classId) || 0 : 0,
          totalRevenue: 0,
          teacherShare: 0,
          academyShare: 0,
          transactionCount: 0,
        };

        existing.totalRevenue += tx.amount || 0;
        existing.teacherShare += tx.splitDetails?.teacherShare || 0;
        existing.academyShare += tx.splitDetails?.academyShare || 0;
        existing.transactionCount += 1;
        classRevenueMap.set(classKey, existing);
      });

      classRevenueBreakdown = Array.from(classRevenueMap.values()).sort(
        (a, b) => b.totalRevenue - a.totalRevenue,
      );
    }

    const payoutQuery = { teacherId: teacher._id };
    if (activeSession?._id) {
      payoutQuery.sessionId = activeSession._id;
    }
    const payouts = await TeacherPayment.find(payoutQuery)
      .sort({ paymentDate: -1 })
      .limit(100)
      .lean();

    const totalPaidSession = payouts.reduce(
      (sum, p) => sum + (p.amountPaid || 0),
      0,
    );

    const activeSessionAccrual = (teacher.salaryAccruals || []).find(
      (entry) => entry.sessionId?.toString() === activeSession?._id?.toString(),
    );

    return res.json({
      success: true,
      data: {
        teacher: {
          _id: teacher._id,
          name: teacher.name,
          subject: teacher.subject,
          compensation: teacher.compensation,
          totalPaid: teacher.totalPaid || 0,
        },
        session: activeSession || null,
        balances: {
          floating: balance.floating || 0,
          verified: balance.verified || 0,
          pending: balance.pending || 0,
          payable: payableBalance,
        },
        incomeTotals,
        fixedSalaryAccrual: activeSessionAccrual || null,
        payouts: {
          totalPaidSession,
          items: payouts,
        },
        incomeTransactions,
        classes: classesWithCounts,
        classSummary: {
          totalClasses: classesWithCounts.length,
          totalStudents,
        },
        classRevenueBreakdown,
      },
    });
  } catch (error) {
    console.error("❌ Error in getTeacherReport:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while generating report",
      error: error.message,
    });
  }
};

exports.processPayout = async (req, res) => {
  try {
    const { teacherId, amount, notes, isAdvance } = req.body;

    if (!teacherId || !amount) {
      return res.status(400).json({
        success: false,
        message: "Teacher ID and amount are required",
      });
    }

    const payoutAmount = Number(amount);
    if (payoutAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    const pendingBalance = teacher.balance?.pending || 0;

    if (!isAdvance && payoutAmount > pendingBalance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient pending balance. Available: PKR ${pendingBalance.toLocaleString()}`,
      });
    }

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacherId,
      {
        $inc: {
          "balance.pending": -payoutAmount,
          totalPaid: payoutAmount,
        },
      },
      { new: true },
    );

    await Transaction.create({
      type: "EXPENSE",
      category: isAdvance ? "Teacher Advance" : "Teacher Salary",
      amount: payoutAmount,
      description: `Salary Payout to ${teacher.name}${notes ? ` - ${notes}` : ""}`,
      date: new Date(),
      collectedBy: req.user._id,
      status: "VERIFIED",
      splitDetails: {
        teacherId: teacher._id,
        teacherName: teacher.name,
        payoutType: isAdvance ? "ADVANCE" : "SALARY",
      },
    });

    await Notification.create({
      recipient: teacher._id,
      message: `Payout received: PKR ${payoutAmount.toLocaleString()}${isAdvance ? " (Advance)" : ""}`,
      type: "FINANCE",
    });

    return res.json({
      success: true,
      message: `PKR ${payoutAmount.toLocaleString()} paid to ${teacher.name}`,
      data: {
        teacher: updatedTeacher.name,
        amountPaid: payoutAmount,
        remainingPending: updatedTeacher.balance?.pending || 0,
        totalPaid: updatedTeacher.totalPaid || 0,
      },
    });
  } catch (error) {
    console.error("❌ Error in processPayout:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while processing payout",
      error: error.message,
    });
  }
};

// =====================================================================
// MANUAL CREDIT TEACHER — Admin manually adds credit to teacher balance
// This is a LIABILITY entry (debt owed to teacher), NOT an expense.
// Actual expense is only recorded when Pay/Payout happens.
// =====================================================================
// @desc    Manually credit a teacher's pending balance
// @route   POST /api/payroll/credit
// @access  Protected (OWNER only)
exports.manualCreditTeacher = async (req, res) => {
  try {
    const { teacherId, amount, description } = req.body;

    // Validate input
    if (!teacherId || !amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Teacher ID and a valid positive amount are required",
      });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    const creditAmount = Number(amount);

    // 1. Atomically increment teacher's pending balance
    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacherId,
      { $inc: { "balance.pending": creditAmount } },
      { new: true }
    );

    // 2. Create a LIABILITY transaction (tracks debt, NOT cash movement)
    await Transaction.create({
      type: "LIABILITY",
      category: "Payroll_Credit",
      amount: creditAmount,
      description: description || `Manual credit for ${teacher.name}`,
      date: new Date(),
      collectedBy: req.user._id,
      status: "VERIFIED",
      splitDetails: {
        teacherId: teacher._id,
        teacherName: teacher.name,
      },
    });

    // 3. Create notification for audit trail
    await Notification.create({
      recipientRole: "OWNER",
      message: `💰 Manual credit of PKR ${creditAmount.toLocaleString()} added to ${teacher.name}${description ? ` — ${description}` : ""}`,
      type: "FINANCE",
      relatedId: teacher._id.toString(),
    });

    console.log(
      `✅ Manual credit: PKR ${creditAmount.toLocaleString()} → ${teacher.name} (Pending: ${updatedTeacher.balance.pending})`
    );

    return res.status(200).json({
      success: true,
      message: `PKR ${creditAmount.toLocaleString()} credited to ${teacher.name}`,
      data: {
        teacherName: teacher.name,
        creditedAmount: creditAmount,
        newPendingBalance: updatedTeacher.balance.pending,
        totalBalance: {
          floating: updatedTeacher.balance.floating,
          verified: updatedTeacher.balance.verified,
          pending: updatedTeacher.balance.pending,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error in manualCreditTeacher:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while crediting teacher",
      error: error.message,
    });
  }
};
