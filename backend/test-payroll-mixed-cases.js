/**
 * Mixed payroll validation:
 * - Percentage split class
 * - Fixed-per-student class
 * - Fixed-salary teacher accrual
 * - Proof details in earnings breakdown (student-wise rows)
 *
 * Usage:
 *   cd backend
 *   node test-payroll-mixed-cases.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const Class = require("./models/Class");
const Session = require("./models/Session");
const Teacher = require("./models/Teacher");
const User = require("./models/User");

const BASE = "http://localhost:5000";
const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/scaAcademiaDB";

let TOKEN;
let HEADERS;
let passed = 0;
let failed = 0;

function logPass(msg) {
  console.log(`  PASS: ${msg}`);
  passed += 1;
}

function logFail(msg) {
  console.error(`  FAIL: ${msg}`);
  failed += 1;
}

function assert(condition, msg) {
  if (condition) {
    logPass(msg);
    return true;
  }
  logFail(msg);
  return false;
}

function assertApprox(actual, expected, msg, tolerance = 1) {
  const ok = Math.abs(actual - expected) <= tolerance;
  return assert(ok, `${msg} (actual=${actual}, expected=${expected})`);
}

async function api(method, path, body) {
  const opts = { method, headers: HEADERS };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);

  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    throw new Error(`API ${method} ${path} returned non-JSON response`);
  }

  if (!res.ok || !data?.success) {
    throw new Error(`API ${method} ${path} failed: ${data?.message || res.statusText}`);
  }
  return data;
}

async function enrollStudent({ name, fatherName, cls, fee, paidAmount, phone }) {
  return api("POST", "/api/students", {
    studentName: name,
    fatherName,
    class: cls.classTitle,
    classRef: cls._id.toString(),
    sessionRef: cls.session.toString(),
    group: cls.group || "Pre-Medical",
    subjects: (cls.subjects || []).map((s) => ({ name: s.name, fee: s.fee || 0 })),
    totalFee: fee,
    paidAmount,
    feeStatus: paidAmount >= fee ? "paid" : paidAmount > 0 ? "partial" : "pending",
    parentCell: phone,
    admissionDate: new Date().toISOString(),
  });
}

async function collectFee(studentId, amount) {
  return api("POST", `/api/students/${studentId}/collect-fee`, {
    amount,
    method: "cash",
    month: new Date().toISOString().slice(0, 7),
  });
}

function teacherById(dashboard, teacherId) {
  return (dashboard.data.teachersWithBalances || []).find(
    (t) => t._id?.toString() === teacherId.toString(),
  );
}

async function main() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const owner = await User.findOne({ role: "OWNER" }).select("_id role").lean();
  if (!owner) {
    throw new Error("OWNER user not found. Seed data first.");
  }

  TOKEN = jwt.sign(
    { id: owner._id, role: owner.role },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );
  HEADERS = {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  };

  const activeSession = await Session.findOne({ status: "active" }).select("_id sessionName").lean();
  if (!activeSession) throw new Error("No active session found.");

  const percentageTeachers = await Teacher.find({
    status: "active",
    "compensation.type": { $in: ["percentage", "hybrid"] },
  })
    .sort({ createdAt: 1 })
    .select("_id name subject compensation balance")
    .lean();

  const fixedTeacher = await Teacher.findOne({
    status: "active",
    "compensation.type": "fixed",
  })
    .select("_id name subject compensation balance")
    .lean();

  if (percentageTeachers.length < 2) {
    throw new Error("Need at least 2 percentage/hybrid teachers.");
  }

  const t1 = percentageTeachers[0];
  const t2 = percentageTeachers[1];

  const stamp = Date.now();
  const pctClass = await Class.create({
    classTitle: `QA Percentage ${stamp}`,
    gradeLevel: "11th Grade",
    group: "Pre-Medical",
    shift: "Morning",
    session: activeSession._id,
    subjects: [
      { name: "Biology", fee: 10000 },
      { name: "Chemistry", fee: 10000 },
    ],
    baseFee: 20000,
    days: ["Mon", "Wed", "Fri"],
    startTime: "08:00",
    endTime: "11:00",
    status: "active",
    revenueMode: "percentage",
    subjectTeachers: [
      { subject: "Biology", teacherId: t1._id, teacherName: t1.name },
      { subject: "Chemistry", teacherId: t2._id, teacherName: t2.name },
    ],
  });

  const fixedClass = await Class.create({
    classTitle: `QA Fixed ${stamp}`,
    gradeLevel: "12th Grade",
    group: "Pre-Medical",
    shift: "Evening",
    session: activeSession._id,
    subjects: [
      { name: "Biology", fee: 10000 },
      { name: "Chemistry", fee: 10000 },
    ],
    baseFee: 20000,
    days: ["Tue", "Thu", "Sat"],
    startTime: "14:00",
    endTime: "17:00",
    status: "active",
    revenueMode: "fixed-per-student",
    teacherRatePerStudent: 4000,
    subjectTeachers: [
      { subject: "Biology", teacherId: t1._id, teacherName: t1.name },
      { subject: "Chemistry", teacherId: t2._id, teacherName: t2.name },
    ],
  });

  console.log("\nSetup complete:");
  console.log(`  Percentage class: ${pctClass.classTitle}`);
  console.log(`  Fixed class:      ${fixedClass.classTitle} (rate 4000/teacher per payment event)`);
  console.log(`  Teacher A:        ${t1.name} (${t1.compensation?.teacherShare || 70}%)`);
  console.log(`  Teacher B:        ${t2.name} (${t2.compensation?.teacherShare || 70}%)`);
  if (fixedTeacher) {
    console.log(`  Fixed salary:     ${fixedTeacher.name} (salary ${fixedTeacher.compensation?.fixedSalary || 0})`);
  }

  const beforeDash = await api("GET", "/api/payroll/dashboard");
  const beforeEarn = await api("GET", "/api/payroll/earnings-breakdown");

  const beforeT1 = teacherById(beforeDash, t1._id)?.totalEarned || 0;
  const beforeT2 = teacherById(beforeDash, t2._id)?.totalEarned || 0;
  const beforePool = beforeEarn.data?.totalAcademyPool || 0;
  const beforeFixedPending = fixedTeacher
    ? (teacherById(beforeDash, fixedTeacher._id)?.balance?.pending || 0)
    : 0;

  console.log("\nSTEP 1: Enroll students and collect fee across both class models...");

  const s1 = await enrollStudent({
    name: `PoolCase Pct Full ${stamp}`,
    fatherName: "QA Father 1",
    cls: pctClass,
    fee: 20000,
    paidAmount: 20000,
    phone: "03003000001",
  });
  const s1Id = s1.data?._id || s1.student?._id;

  const s2 = await enrollStudent({
    name: `PoolCase Pct Partial ${stamp}`,
    fatherName: "QA Father 2",
    cls: pctClass,
    fee: 20000,
    paidAmount: 12000,
    phone: "03003000002",
  });
  const s2Id = s2.data?._id || s2.student?._id;

  const s3 = await enrollStudent({
    name: `PoolCase Fixed Full ${stamp}`,
    fatherName: "QA Father 3",
    cls: fixedClass,
    fee: 20000,
    paidAmount: 20000,
    phone: "03003000003",
  });
  const s3Id = s3.data?._id || s3.student?._id;

  const s4 = await enrollStudent({
    name: `PoolCase Fixed Partial ${stamp}`,
    fatherName: "QA Father 4",
    cls: fixedClass,
    fee: 20000,
    paidAmount: 8000,
    phone: "03003000004",
  });
  const s4Id = s4.data?._id || s4.student?._id;

  assert(!!s1Id && !!s2Id && !!s3Id && !!s4Id, "All test students created successfully");

  await collectFee(s4Id, 4000);

  console.log("\nSTEP 2: Generate fixed salary accruals...");
  await api("POST", "/api/payroll/generate-session-salaries", {});

  const afterDash = await api("GET", "/api/payroll/dashboard");
  const afterEarn = await api("GET", "/api/payroll/earnings-breakdown");

  const afterT1Row = teacherById(afterDash, t1._id);
  const afterT2Row = teacherById(afterDash, t2._id);

  const afterT1 = afterT1Row?.totalEarned || 0;
  const afterT2 = afterT2Row?.totalEarned || 0;
  const afterPool = afterEarn.data?.totalAcademyPool || 0;

  const t1Pct = t1.compensation?.teacherShare || 70;
  const t2Pct = t2.compensation?.teacherShare || 70;

  // Percentage class increments
  const pctS1PerTeacher = 10000;
  const pctS2PerTeacher = 6000;
  const t1PctIncrement = Math.round(pctS1PerTeacher * (t1Pct / 100)) + Math.round(pctS2PerTeacher * (t1Pct / 100));
  const t2PctIncrement = Math.round(pctS1PerTeacher * (t2Pct / 100)) + Math.round(pctS2PerTeacher * (t2Pct / 100));
  const poolPctIncrement =
    (Math.round(pctS1PerTeacher) - Math.round(pctS1PerTeacher * (t1Pct / 100))) +
    (Math.round(pctS1PerTeacher) - Math.round(pctS1PerTeacher * (t2Pct / 100))) +
    (Math.round(pctS2PerTeacher) - Math.round(pctS2PerTeacher * (t1Pct / 100))) +
    (Math.round(pctS2PerTeacher) - Math.round(pctS2PerTeacher * (t2Pct / 100)));

  // Fixed-per-student increments (capped once per student per teacher)
  const fixedRatePerStudentPerTeacher = 4000;
  const fixedStudents = 2;
  const t1FixedIncrement = fixedRatePerStudentPerTeacher * fixedStudents;
  const t2FixedIncrement = fixedRatePerStudentPerTeacher * fixedStudents;
  const poolFixedIncrement =
    // S3: 20,000 paid, teacher cap reached at 8,000 -> academy 12,000
    12000 +
    // S4: total paid 12,000 (8,000 + 4,000), teacher cap reached at 8,000 -> academy 4,000
    4000;

  const expectedT1Increase = t1PctIncrement + t1FixedIncrement;
  const expectedT2Increase = t2PctIncrement + t2FixedIncrement;
  const expectedPoolIncrease = poolPctIncrement + poolFixedIncrement;

  assertApprox(afterT1 - beforeT1, expectedT1Increase, `${t1.name} earned increase matches mixed model math`);
  assertApprox(afterT2 - beforeT2, expectedT2Increase, `${t2.name} earned increase matches mixed model math`);
  assertApprox(afterPool - beforePool, expectedPoolIncrease, "Academy pool increase matches mixed model math");

  const teachersBreakdown = afterEarn.data?.teachers || [];
  const t1Break = teachersBreakdown.find((t) => t.teacherId?.toString() === t1._id.toString());
  const t2Break = teachersBreakdown.find((t) => t.teacherId?.toString() === t2._id.toString());

  assert(!!t1Break, `Earnings breakdown contains ${t1.name}`);
  assert(!!t2Break, `Earnings breakdown contains ${t2.name}`);

  const t1PctClassBreak = (t1Break?.breakdown || []).find((b) => b.classId === pctClass._id.toString());
  const t2PctClassBreak = (t2Break?.breakdown || []).find((b) => b.classId === pctClass._id.toString());
  const t1FixedClassBreak = (t1Break?.breakdown || []).find((b) => b.classId === fixedClass._id.toString());

  assert(!!t1PctClassBreak, `${t1.name} has percentage class breakdown row`);
  assert(!!t2PctClassBreak, `${t2.name} has percentage class breakdown row`);
  assert(!!t1FixedClassBreak, `${t1.name} has fixed-per-student class breakdown row`);

  assertApprox(
    t1FixedClassBreak?.calculatedEarning || 0,
    8000,
    `${t1.name} fixed class earning is capped to 2 students x 4000`,
  );

  assertApprox(
    t1FixedClassBreak?.academyShare || 0,
    8000,
    `${t1.name} fixed class academy share reflects remaining student payments`,
  );

  const t1StudentDetails = t1PctClassBreak?.studentDetails || [];
  assert(t1StudentDetails.length > 0, `${t1.name} percentage class shows student detail rows`);

  const hasUnknownStudent = t1StudentDetails.some((s) => !s.studentName || s.studentName === "Unknown");
  assert(!hasUnknownStudent, `${t1.name} student detail rows include real student names`);

  const academyPoolRows = afterEarn.data?.academyPoolBreakdown || [];
  const pctPoolRow = academyPoolRows.find((r) => r.classId === pctClass._id.toString());
  const fixedPoolRow = academyPoolRows.find((r) => r.classId === fixedClass._id.toString());

  assert(!!pctPoolRow, "Academy pool breakdown includes percentage class");
  assert(!!fixedPoolRow, "Academy pool breakdown includes fixed-per-student class");
  assert((pctPoolRow?.students || []).length > 0, "Academy pool row includes per-student proof entries");

  assertApprox(
    fixedPoolRow?.totalTeacherShare || 0,
    16000,
    "Fixed class total teacher share is exactly 2 students x (4000 x 2 teachers)",
  );

  assertApprox(
    fixedPoolRow?.totalAcademyShare || 0,
    16000,
    "Fixed class total academy share equals collected amount minus capped teacher share",
  );

  const poolUnknownStudent = (pctPoolRow?.students || []).some(
    (s) => !s.studentName || s.studentName === "Unknown",
  );
  assert(!poolUnknownStudent, "Academy pool proof rows include real student names");

  if (fixedTeacher) {
    const fixedAfterRow = teacherById(afterDash, fixedTeacher._id);
    const fixedAfterPending = fixedAfterRow?.balance?.pending || 0;
    const fixedSalary = fixedTeacher.compensation?.fixedSalary || 0;

    assert(
      fixedAfterPending >= beforeFixedPending,
      `${fixedTeacher.name} pending balance does not go down after salary generation`,
    );

    // In fresh seed this should increase by exactly fixed salary once.
    if (fixedSalary > 0) {
      assert(
        fixedAfterPending === beforeFixedPending + fixedSalary || fixedAfterPending === beforeFixedPending,
        `${fixedTeacher.name} fixed salary accrual behavior is stable (no duplicate accrual)`,
      );
    }

    const fixedTeacherBreak = teachersBreakdown.find(
      (t) => t.teacherId?.toString() === fixedTeacher._id.toString(),
    );
    assert(!!fixedTeacherBreak, `Earnings breakdown contains fixed-salary teacher ${fixedTeacher.name}`);
    assert(
      fixedTeacherBreak?.compensationType === "fixed",
      `${fixedTeacher.name} is marked as fixed compensation in breakdown`,
    );
  }

  console.log("\nSummary:");
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);

  await mongoose.connection.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error("\nFatal test error:", err.message);
  try {
    await mongoose.connection.close();
  } catch (_) {}
  process.exit(1);
});
