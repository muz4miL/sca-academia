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
    const teacherIds = uniqueTeachers.map((t) => t.teacherId);

    // In fixed-per-student mode, each teacher should receive at most
    // `ratePerStudent` for a given student across all installments.
    const existingCredits = await Transaction.aggregate([
      {
        $match: {
          type: { $in: ["LIABILITY", "CREDIT"] },
          category: "Payroll_Credit",
          studentId: student._id,
          "splitDetails.teacherId": { $in: teacherIds },
        },
      },
      {
        $group: {
          _id: "$splitDetails.teacherId",
          totalCredited: { $sum: "$amount" },
        },
      },
    ]);

    const creditedMap = new Map(
      existingCredits.map((row) => [row._id?.toString(), row.totalCredited || 0])
    );

    const entitlementRows = uniqueTeachers.map((tInfo) => {
      const alreadyCredited = creditedMap.get(tInfo.teacherId.toString()) || 0;
      const remainingEntitlement = Math.max(0, ratePerStudent - alreadyCredited);
      return {
        ...tInfo,
        alreadyCredited,
        remainingEntitlement,
      };
    });

    const totalRemainingEntitlement = entitlementRows.reduce(
      (sum, row) => sum + row.remainingEntitlement,
      0
    );

    const totalTeacherCreditThisPayment = Math.min(
      amount,
      totalRemainingEntitlement
    );
    const academyShare = Math.max(0, amount - totalTeacherCreditThisPayment);

    // Allocate this payment's teacher credit proportionally to remaining entitlement.
    // This prevents over-crediting on later installments and keeps totals exact.
    const rawAllocations = entitlementRows.map((row) => {
      if (totalRemainingEntitlement <= 0 || totalTeacherCreditThisPayment <= 0) {
        return {
          teacherId: row.teacherId,
          value: 0,
          floor: 0,
          fractional: 0,
        };
      }

      const value =
        totalTeacherCreditThisPayment *
        (row.remainingEntitlement / totalRemainingEntitlement);
      const floor = Math.floor(value);
      return {
        teacherId: row.teacherId,
        value,
        floor,
        fractional: value - floor,
      };
    });

    let allocatedTeacherAmount = rawAllocations.reduce(
      (sum, row) => sum + row.floor,
      0
    );
    let teacherRemainder = Math.round(
      totalTeacherCreditThisPayment - allocatedTeacherAmount
    );

    rawAllocations
      .sort((a, b) => b.fractional - a.fractional)
      .forEach((row) => {
        if (teacherRemainder <= 0) return;
        row.floor += 1;
        teacherRemainder -= 1;
      });

    const teacherAllocationMap = new Map(
      rawAllocations.map((row) => [row.teacherId.toString(), row.floor])
    );

    const academyBasePerTeacher = Math.floor(academyShare / teacherCount);
    let academyRemainder = Math.round(
      academyShare - academyBasePerTeacher * teacherCount
    );

    result.revenueModel = "fixed-per-student";

    for (const [index, tInfo] of uniqueTeachers.entries()) {
      const teacherShareAmt = teacherAllocationMap.get(tInfo.teacherId.toString()) || 0;
      const academySharePerTeacher =
        academyBasePerTeacher + (index < academyRemainder ? 1 : 0);

      // Create LIABILITY transaction (teacher is owed this money)
      await Transaction.create({
        type: "LIABILITY",
        category: "Payroll_Credit",
        amount: teacherShareAmt,
        description: `Auto-split: ${tInfo.teacherName} — Rs.${teacherShareAmt.toLocaleString()} from ${student.studentName} (${month}) [Fixed rate capped per student]`,
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
      if (teacherShareAmt > 0) {
        await Teacher.findByIdAndUpdate(tInfo.teacherId, {
          $inc: { "balance.pending": teacherShareAmt },
        });
      }

      if (teacherShareAmt > 0) {
        result.teacherCredits.push({
          teacherId: tInfo.teacherId,
          teacherName: tInfo.teacherName,
          amount: teacherShareAmt,
          percentage: null, // fixed rate, no percentage
          subjects: tInfo.subjects,
        });
      }

      console.log(
        `✅ Auto-credited ${tInfo.teacherName}: Rs.${teacherShareAmt} (fixed rate, remaining entitlement aware)`
      );
    }

    result.splitApplied = amount > 0;
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
