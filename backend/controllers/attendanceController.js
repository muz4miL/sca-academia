const Attendance = require("../models/Attendance");
const Student = require("../models/Student");
const Class = require("../models/Class");

/**
 * Attendance Controller — Sciences Coaching Academy
 *
 * Handles attendance marking (auto from Gatekeeper + manual from Admin)
 * and reporting (daily summary, student history, class breakdowns).
 */

/**
 * Helper: Get today's date normalized to midnight (PKT timezone)
 */
const getTodayPKT = () => {
  const now = new Date();
  const pkt = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
  return new Date(pkt.getFullYear(), pkt.getMonth(), pkt.getDate());
};

// ============================================================
// @desc    Mark attendance for a student (called by Gatekeeper or Admin)
// @route   POST /api/attendance/mark
// @access  Protected (OWNER, OPERATOR, ADMIN, STAFF, PARTNER)
// ============================================================
exports.markAttendance = async (req, res) => {
  try {
    const { studentId, status, notes, markedBy } = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    // Find the student
    const student = await Student.findOne({
      $or: [
        { _id: studentId },
        { studentId: studentId },
        { barcodeId: studentId },
      ],
    }).populate("classRef");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: `Student "${studentId}" not found`,
      });
    }

    const today = getTodayPKT();

    // Check if already checked in today
    const existing = await Attendance.findOne({
      student: student._id,
      date: today,
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        alreadyMarked: true,
        message: `${student.studentName} already checked in today at ${existing.checkInTime?.toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi" }) || "earlier"}`,
        attendance: existing,
      });
    }

    // Create attendance record
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

    console.log(`✅ Attendance marked: ${student.studentName} — ${status || "Present"} (by ${markedBy || "Admin"})`);

    return res.status(201).json({
      success: true,
      alreadyMarked: false,
      message: `${student.studentName} marked ${status || "Present"}`,
      attendance,
    });
  } catch (error) {
    // Handle duplicate key error (race condition protection)
    if (error.code === 11000) {
      return res.status(200).json({
        success: true,
        alreadyMarked: true,
        message: "Attendance already recorded for today",
      });
    }
    console.error("❌ Error marking attendance:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark attendance",
      error: error.message,
    });
  }
};

// ============================================================
// @desc    Get today's attendance summary (stats + records)
// @route   GET /api/attendance/today
// @access  Protected
// ============================================================
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

    // Get total enrolled students for percentage calculation
    const studentQuery = classFilter && classFilter !== "all" ? { class: classFilter } : {};
    const totalStudents = await Student.countDocuments({
      ...studentQuery,
      studentStatus: { $in: ["Active", "active", undefined] },
    });

    // Calculate stats
    const present = records.filter((r) => r.status === "Present").length;
    const late = records.filter((r) => r.status === "Late").length;
    const excused = records.filter((r) => r.status === "Excused").length;
    const absent = totalStudents - present - late - excused;

    return res.status(200).json({
      success: true,
      date: today,
      stats: {
        total: totalStudents,
        present,
        late,
        excused,
        absent: Math.max(0, absent),
        attendanceRate: totalStudents > 0
          ? Math.round(((present + late) / totalStudents) * 100)
          : 0,
      },
      records,
    });
  } catch (error) {
    console.error("❌ Error fetching today's attendance:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch attendance",
      error: error.message,
    });
  }
};

// ============================================================
// @desc    Get attendance by date range
// @route   GET /api/attendance/range?from=2026-02-01&to=2026-02-16
// @access  Protected
// ============================================================
exports.getAttendanceByRange = async (req, res) => {
  try {
    const { from, to, classFilter, studentId } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: "Both 'from' and 'to' dates are required",
      });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const query = {
      date: { $gte: fromDate, $lte: toDate },
    };

    if (classFilter && classFilter !== "all") {
      query.class = classFilter;
    }

    if (studentId) {
      query.studentId = studentId;
    }

    const records = await Attendance.find(query)
      .populate("student", "studentName studentId class group photo")
      .sort({ date: -1, checkInTime: -1 });

    // Group by date for summary
    const dailySummary = {};
    records.forEach((rec) => {
      const dateKey = rec.date.toISOString().split("T")[0];
      if (!dailySummary[dateKey]) {
        dailySummary[dateKey] = { present: 0, late: 0, excused: 0, absent: 0, total: 0 };
      }
      dailySummary[dateKey].total++;
      dailySummary[dateKey][rec.status.toLowerCase()]++;
    });

    return res.status(200).json({
      success: true,
      from: fromDate,
      to: toDate,
      totalRecords: records.length,
      dailySummary,
      records,
    });
  } catch (error) {
    console.error("❌ Error fetching attendance range:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch attendance range",
      error: error.message,
    });
  }
};

// ============================================================
// @desc    Get attendance history for a specific student
// @route   GET /api/attendance/student/:id
// @access  Protected
// ============================================================
exports.getStudentAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findOne({
      $or: [{ _id: id }, { studentId: id }],
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const records = await Attendance.find({ student: student._id })
      .sort({ date: -1 })
      .limit(90); // Last 90 days

    const total = records.length;
    const present = records.filter((r) => r.status === "Present").length;
    const late = records.filter((r) => r.status === "Late").length;
    const excused = records.filter((r) => r.status === "Excused").length;
    const absent = records.filter((r) => r.status === "Absent").length;

    return res.status(200).json({
      success: true,
      student: {
        _id: student._id,
        studentId: student.studentId,
        name: student.studentName,
        class: student.class,
        group: student.group,
      },
      stats: {
        total,
        present,
        late,
        excused,
        absent,
        attendanceRate: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
      },
      records,
    });
  } catch (error) {
    console.error("❌ Error fetching student attendance:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch student attendance",
      error: error.message,
    });
  }
};

// ============================================================
// @desc    Update attendance status (Admin correction)
// @route   PUT /api/attendance/:id
// @access  Protected (OWNER, ADMIN)
// ============================================================
exports.updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const attendance = await Attendance.findByIdAndUpdate(
      id,
      {
        status,
        notes,
        markedBy: "Admin",
        markedByUser: req.user?._id,
      },
      { new: true }
    );

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Attendance updated to ${status}`,
      attendance,
    });
  } catch (error) {
    console.error("❌ Error updating attendance:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update attendance",
      error: error.message,
    });
  }
};

// ============================================================
// @desc    Bulk mark absent for students who didn't check in today
// @route   POST /api/attendance/mark-absent
// @access  Protected (OWNER, ADMIN)
// ============================================================
exports.markAbsentees = async (req, res) => {
  try {
    const today = getTodayPKT();
    const { classFilter } = req.body;

    // Get all active students
    const studentQuery = {
      studentStatus: { $in: ["Active", "active", undefined] },
    };
    if (classFilter && classFilter !== "all") {
      studentQuery.class = classFilter;
    }

    const allStudents = await Student.find(studentQuery);

    // Get students who already have attendance today
    const todayRecords = await Attendance.find({ date: today });
    const checkedInIds = new Set(todayRecords.map((r) => r.student.toString()));

    // Mark remaining as absent
    const absentStudents = allStudents.filter(
      (s) => !checkedInIds.has(s._id.toString())
    );

    let markedCount = 0;
    for (const student of absentStudents) {
      try {
        await Attendance.create({
          student: student._id,
          studentId: student.studentId,
          studentName: student.studentName,
          class: student.class || "",
          classRef: student.classRef,
          date: today,
          status: "Absent",
          markedBy: "System",
          markedByUser: req.user?._id,
        });
        markedCount++;
      } catch (e) {
        // Skip duplicates (race condition safe)
        if (e.code !== 11000) console.error(e);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Marked ${markedCount} students as absent`,
      markedCount,
      totalStudents: allStudents.length,
      alreadyCheckedIn: checkedInIds.size,
    });
  } catch (error) {
    console.error("❌ Error marking absentees:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark absentees",
      error: error.message,
    });
  }
};

// ============================================================
// @desc    Get available classes (for filter dropdown)
// @route   GET /api/attendance/classes
// @access  Protected
// ============================================================
exports.getClassList = async (req, res) => {
  try {
    const classes = await Class.find({ status: "active" })
      .select("classTitle className _id")
      .sort({ classTitle: 1 });

    return res.status(200).json({
      success: true,
      classes,
    });
  } catch (error) {
    console.error("❌ Error fetching classes:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch classes" });
  }
};
