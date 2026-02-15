const mongoose = require("mongoose");

/**
 * Attendance Model — Sciences Coaching Academy
 * 
 * Tracks daily student attendance, integrated with the Gatekeeper scanner.
 * Each record = one student + one date. Prevents duplicates via compound index.
 * 
 * Flow:
 *   Scanner scans barcode → Gatekeeper verifies → Attendance auto-marked "Present"
 *   Admin can also manually mark attendance from the dashboard.
 */
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
  {
    timestamps: true,
  }
);

// Compound index: one attendance record per student per day
AttendanceSchema.index({ student: 1, date: 1 }, { unique: true });

// Index for efficient date-range queries
AttendanceSchema.index({ date: 1, status: 1 });

/**
 * Static: Get today's date normalized to midnight (PKT)
 */
AttendanceSchema.statics.getTodayDate = function () {
  const now = new Date();
  // Pakistan time offset: UTC+5
  const pkt = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  return new Date(pkt.getFullYear(), pkt.getMonth(), pkt.getDate());
};

/**
 * Static: Check if student already checked in today
 */
AttendanceSchema.statics.isCheckedInToday = async function (studentObjectId) {
  const today = this.getTodayDate();
  const existing = await this.findOne({
    student: studentObjectId,
    date: today,
  });
  return existing;
};

module.exports = mongoose.model("Attendance", AttendanceSchema);
