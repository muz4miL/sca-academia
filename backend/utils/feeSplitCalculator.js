/**
 * Fee Split Calculator — Auto-splits fee revenue among teachers
 *
 * Two revenue models (set on Class.revenueMode):
 *   A) "fixed-per-student" — Fixed per-student rate (teacherRatePerStudent on Class)
 *   B) "percentage" (default) — Equal split then percentage (teacher's compensation.teacherShare)
 */

const Class = require("../models/Class");
const Teacher = require("../models/Teacher");
const Transaction = require("../models/Transaction");

/**
 * Calculate and apply fee split for a single student payment.
 *
 * @param {Object} params
 * @param {Object} params.student       - Student document (needs _id, classRef, studentName, studentId)
 * @param {Number} params.amount        - Amount being collected
 * @param {String} params.month         - Month label (e.g. "March 2026")
 * @param {Object} [params.collector]   - req.user (collector info)
 * @param {String} [params.paymentMethod] - "CASH" | "BANK" | "ONLINE"
 * @param {String} [params.notes]       - Optional notes
 *
 * @returns {Object} { splitApplied, revenueModel, teacherCredits: [{teacherId, teacherName, amount, percentage}] }
 */
async function calculateAndApplyFeeSplit({
  student,
  amount,
  month,
  collector,
  paymentMethod,
  notes,
}) {
  const result = {
    splitApplied: false,
    revenueModel: "none",
    teacherCredits: [],
  };

  // Guard: no class reference → no split possible
  if (!student.classRef) {
    console.log("ℹ️ No classRef on student — skipping fee split");
    return result;
  }

  // Fetch class with teacher assignments
  const classDoc = await Class.findById(student.classRef)
    .select(
      "revenueMode teacherRatePerStudent subjectTeachers assignedTeacher teacherName subjects baseFee classTitle"
    )
    .lean();

  if (!classDoc) {
    console.log("ℹ️ Class not found — skipping fee split");
    return result;
  }

  // Build unique teacher list from class
  const teacherMap = new Map();

  if (classDoc.subjectTeachers && classDoc.subjectTeachers.length > 0) {
    for (const st of classDoc.subjectTeachers) {
      if (!st.teacherId) continue;
      const tid = st.teacherId.toString();
      if (teacherMap.has(tid)) {
        teacherMap.get(tid).subjects.push(st.subject);
      } else {
        teacherMap.set(tid, {
          teacherId: st.teacherId,
          teacherName: st.teacherName || "Unknown",
          subjects: [st.subject],
        });
      }
    }
  } else if (classDoc.assignedTeacher) {
    teacherMap.set(classDoc.assignedTeacher.toString(), {
      teacherId: classDoc.assignedTeacher,
      teacherName: classDoc.teacherName || "Unknown",
      subjects: (classDoc.subjects || []).map((s) => s.name),
    });
  }

  const uniqueTeachers = Array.from(teacherMap.values());
  const teacherCount = uniqueTeachers.length;

  if (teacherCount === 0) {
    console.log("ℹ️ No teachers assigned to class — skipping fee split");
    return result;
  }

  const isFixedRate =
    classDoc.revenueMode === "fixed-per-student" &&
    classDoc.teacherRatePerStudent > 0;

  // ─── MODEL A: FIXED PER-STUDENT RATE ───
  if (isFixedRate) {
    const ratePerStudent = classDoc.teacherRatePerStudent;
    const totalTeacherCost = ratePerStudent * teacherCount;
    const academyShare = Math.max(0, amount - totalTeacherCost);

    result.revenueModel = "fixed-per-student";

    for (const tInfo of uniqueTeachers) {
      const teacherShareAmt = ratePerStudent;
      const academySharePerTeacher = Math.round(academyShare / teacherCount);

      // Create LIABILITY transaction (teacher is owed this money)
      await Transaction.create({
        type: "LIABILITY",
        category: "Payroll_Credit",
        amount: teacherShareAmt,
        description: `Auto-split: ${tInfo.teacherName} — Rs.${teacherShareAmt.toLocaleString()} from ${student.studentName} (${month}) [Fixed rate]`,
        date: new Date(),
        collectedBy: collector?._id,
        status: "FLOATING",
        studentId: student._id,
        splitDetails: {
          teacherShare: teacherShareAmt,
          academyShare: academySharePerTeacher,
          teacherPercentage: Math.round(
            (teacherShareAmt / (amount || 1)) * 100
          ),
          academyPercentage: Math.round(
            (academyShare / (amount || 1)) * 100
          ),
          teacherId: tInfo.teacherId,
          teacherName: tInfo.teacherName,
        },
      });

      // Credit teacher balance
      await Teacher.findByIdAndUpdate(tInfo.teacherId, {
        $inc: { "balance.pending": teacherShareAmt },
      });

      result.teacherCredits.push({
        teacherId: tInfo.teacherId,
        teacherName: tInfo.teacherName,
        amount: teacherShareAmt,
        percentage: null, // fixed rate, no percentage
        subjects: tInfo.subjects,
      });

      console.log(
        `✅ Auto-credited ${tInfo.teacherName}: Rs.${teacherShareAmt} (fixed rate)`
      );
    }

    result.splitApplied = true;
    return result;
  }

  // ─── MODEL B: PERCENTAGE SPLIT (REGULAR TUITION) ───
  const perTeacherPortion = amount / teacherCount;
  result.revenueModel = "percentage-split";

  for (const tInfo of uniqueTeachers) {
    // Fetch teacher's compensation settings
    const teacherDoc = await Teacher.findById(tInfo.teacherId)
      .select("compensation name")
      .lean();

    const compType = teacherDoc?.compensation?.type || "percentage";

    // Fixed-salary teachers don't participate in per-fee splits
    if (compType === "fixed") {
      console.log(
        `ℹ️ Skipping ${tInfo.teacherName} — fixed salary teacher (handled separately)`
      );
      continue;
    }

    let teacherSharePct = 70; // default
    if (compType === "percentage") {
      teacherSharePct = teacherDoc?.compensation?.teacherShare || 70;
    } else if (compType === "hybrid") {
      teacherSharePct = teacherDoc?.compensation?.profitShare || 70;
    }

    const academySharePct = 100 - teacherSharePct;
    const teacherShareAmt = Math.round(
      perTeacherPortion * (teacherSharePct / 100)
    );
    const academyShareAmt = Math.round(perTeacherPortion) - teacherShareAmt;

    // Create LIABILITY transaction
    await Transaction.create({
      type: "LIABILITY",
      category: "Payroll_Credit",
      amount: teacherShareAmt,
      description: `Auto-split: ${tInfo.teacherName} — ${teacherSharePct}% of Rs.${Math.round(perTeacherPortion).toLocaleString()} from ${student.studentName} (${month})`,
      date: new Date(),
      collectedBy: collector?._id,
      status: "FLOATING",
      studentId: student._id,
      splitDetails: {
        teacherShare: teacherShareAmt,
        academyShare: academyShareAmt,
        teacherPercentage: teacherSharePct,
        academyPercentage: academySharePct,
        teacherId: tInfo.teacherId,
        teacherName: tInfo.teacherName,
      },
    });

    // Credit teacher balance
    await Teacher.findByIdAndUpdate(tInfo.teacherId, {
      $inc: { "balance.pending": teacherShareAmt },
    });

    result.teacherCredits.push({
      teacherId: tInfo.teacherId,
      teacherName: tInfo.teacherName,
      amount: teacherShareAmt,
      percentage: teacherSharePct,
      subjects: tInfo.subjects,
    });

    console.log(
      `✅ Auto-credited ${tInfo.teacherName}: Rs.${teacherShareAmt} (${teacherSharePct}% of ${Math.round(perTeacherPortion)})`
    );
  }

  result.splitApplied = result.teacherCredits.length > 0;
  return result;
}

module.exports = { calculateAndApplyFeeSplit };
