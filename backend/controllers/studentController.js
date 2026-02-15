const Student = require("../models/Student");
const FeeRecord = require("../models/FeeRecord");
const Transaction = require("../models/Transaction");
const Teacher = require("../models/Teacher");
const Class = require("../models/Class");
const Configuration = require("../models/Configuration");
const Notification = require("../models/Notification");
const User = require("../models/User");

// GET all students
exports.getStudents = async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.json({ success: true, count: students.length, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET single student
exports.getStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper: Calculate Fee Status — PAID only when Paid == Total, otherwise PENDING
const calculateFeeStatus = (paidAmount, totalFee) => {
  const paid = Number(paidAmount) || 0;
  const total = Number(totalFee) || 0;
  
  if (paid >= total && total > 0) return "paid";
  if (paid > 0 && paid < total) return "partial";
  return "pending";
};

// CREATE student
exports.createStudent = async (req, res) => {
  try {
    const studentData = { ...req.body };

    // Calculate fee status on admission
    const paidAmount = studentData.paidAmount || 0;
    const totalFee = studentData.totalFee || 0;
    studentData.feeStatus = calculateFeeStatus(paidAmount, totalFee);

    // Smart Seat Assignment — gender-based wing prefix
    if (!studentData.seatNumber) {
      const gender = studentData.gender || "Male";
      const prefix = gender === "Female" ? "L" : "R"; // L = Left Wing, R = Right Wing
      const lastSeat = await Student.findOne({
        seatNumber: new RegExp(`^${prefix}-`),
      })
        .sort({ seatNumber: -1 })
        .select("seatNumber")
        .lean();
      let nextNum = 1;
      if (lastSeat && lastSeat.seatNumber) {
        const parts = lastSeat.seatNumber.split("-");
        nextNum = (parseInt(parts[1], 10) || 0) + 1;
      }
      studentData.seatNumber = `${prefix}-${String(nextNum).padStart(3, "0")}`;
    }

    const student = await Student.create(studentData);

    // Create INCOME transaction for admission fee (Sync with fee collection system)
    if (paidAmount > 0) {
      await Transaction.create({
        type: "INCOME",
        category: "Tuition",
        amount: paidAmount,
        description: `Admission fee from ${student.studentName} - ${student.class}`,
        date: new Date(),
        status: "FLOATING",
        studentId: student._id,
        classId: student.classRef,
      });
      console.log(`💰 Created INCOME transaction for admission: PKR ${paidAmount}`);
    }

    res.status(201).json({ success: true, data: student });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// UPDATE student
exports.updateStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE student
exports.deleteStudent = async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Student deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// COLLECT FEE - Simplified but Working Version
exports.collectFee = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, month, subject, teacherId, paymentMethod, notes } =
      req.body;

    console.log("🎫 Collecting fee:", { id, amount, month, subject });

    if (!amount || !month) {
      return res
        .status(400)
        .json({ success: false, message: "Amount and month required" });
    }

    const student = await Student.findById(id);
    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });

    const amountNum = Number(amount);

    // Validate amount is positive
    if (amountNum <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    // Check if amount exceeds remaining balance
    const remainingBalance = (student.totalFee || 0) - (student.paidAmount || 0);
    if (amountNum > remainingBalance) {
      return res.status(400).json({
        success: false,
        message: `Amount (Rs. ${amountNum.toLocaleString()}) exceeds remaining balance (Rs. ${remainingBalance.toLocaleString()})`,
      });
    }

    // Create Fee Record (No automatic revenue split — Manual Payroll Model)
    const feeRecord = await FeeRecord.create({
      student: student._id,
      studentName: student.studentName,
      className: student.class,
      subject: subject || "General",
      amount: amountNum,
      month,
      status: "PAID",
      collectedBy: req.user?._id,
      collectedByName: req.user?.fullName || "Staff",
      teacher: teacherId || undefined,
      paymentMethod: paymentMethod || "CASH",
      notes,
    });

    console.log("💰 Old Paid Amount:", student.paidAmount);
    const oldPaidAmount = student.paidAmount || 0;
    student.paidAmount = (student.paidAmount || 0) + amountNum;
    console.log("💰 New Paid Amount:", student.paidAmount);
    
    const oldFeeStatus = student.feeStatus;
    student.feeStatus = calculateFeeStatus(
      student.paidAmount,
      student.totalFee || 0,
    );
    await student.save();

    // Record FULL amount as INCOME (Academy Revenue) in Transaction Ledger
    const transaction = await Transaction.create({
      type: "INCOME",
      category: "Tuition",
      amount: amountNum,
      description: `Fee collected from ${student.studentName} (${month})`,
      date: new Date(),
      collectedBy: req.user?._id,
      status: "FLOATING",
      studentId: student._id,
      classId: student.classRef, // Link to class for revenue tracking
    });

    console.log("✅ Transaction created:", transaction._id);

    // Track collector's cash (for daily closing verification)
    if (req.user?._id) {
      try {
        const collector = await User.findById(req.user._id);
        if (collector) {
          collector.totalCash = (collector.totalCash || 0) + Number(amount);
          await collector.save();
        }
      } catch (e) {
        console.log("TotalCash update skipped:", e.message);
      }
    }

    // SEND NOTIFICATION - When fee is collected
    try {
      const Notification = require("../models/Notification");
      const User = require("../models/User");

      // Find Academy Owner
      const owner = await User.findOne({ role: "OWNER" });
      
      if (owner) {
        // Calculate new remaining balance after payment
        const newRemainingBalance = (student.totalFee || 0) - student.paidAmount;
        
        // Notification for fee collection - show amount paid and remaining balance
        const notificationMsg = `Fee collected from ${student.studentName} (${student.studentId}): Rs. ${amountNum.toLocaleString()} paid | Remaining Balance: Rs. ${newRemainingBalance.toLocaleString()}`;
        
        await Notification.create({
          recipient: owner._id,
          recipientRole: "OWNER",
          message: notificationMsg,
          type: "FINANCE",
          relatedId: transaction._id, // Link to transaction for tracking
        });

        console.log("🔔 Notification sent to owner:", notificationMsg);

        // If balance is NOW fully paid, send special notification
        if (student.feeStatus === "paid" && oldFeeStatus !== "paid") {
          const paidMsg = `✅ ${student.studentName} (${student.studentId}) has FULLY PAID their fee of Rs. ${student.totalFee.toLocaleString()}`;
          
          await Notification.create({
            recipient: owner._id,
            recipientRole: "OWNER",
            message: paidMsg,
            type: "FINANCE",
            relatedId: student._id, // Link to student record
          });

          console.log("✅ Balance Paid Notification:", paidMsg);
        }
      }
    } catch (e) {
      console.log("⚠️ Notification creation skipped:", e.message);
    }

    res.status(201).json({
      success: true,
      message: `Fee collected! Receipt: ${feeRecord.receiptNumber}`,
      data: { feeRecord },
    });
  } catch (error) {
    console.error("CollectFee Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

exports.getFeeHistory = async (req, res) => {
  try {
    const records = await FeeRecord.find({ student: req.params.id }).sort({
      createdAt: -1,
    });
    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.trackPrint = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });

    const version = (student.printHistory?.length || 0) + 1;
    const receiptId = `TOKEN-${student.studentId}-${Math.random().toString(36).substr(2, 4).toUpperCase()}-V${version}`;

    student.printHistory = student.printHistory || [];
    student.printHistory.push({ receiptId, printedAt: new Date(), version });
    await student.save();

    res.json({ success: true, data: { receiptId, version, student } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.findByToken = async (req, res) => {
  try {
    const student = await Student.findOne({
      "printHistory.receiptId": req.params.token,
    });
    if (!student)
      return res.status(404).json({ success: false, message: "Invalid token" });
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
