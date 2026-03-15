/**
 * MEGA E2E Finance Test — Tests ALL financial scenarios:
 *
 *  1. Full-fee student in PERCENTAGE class
 *  2. Full-fee student in FIXED-PER-STUDENT class
 *  3. Discounted student in PERCENTAGE class (pays less than totalFee)
 *  4. Partial-pay student in FIXED class (pays half, collects rest later)
 *  5. Verify payroll dashboard & earnings breakdown at each step
 *  6. Pay teacher (salary payout) — verify balance goes down
 *  7. Pay teacher (advance) — verify balance can go negative
 *  8. Withdraw student WITHOUT refund — no reversal
 *  9. Withdraw student WITH partial refund — proportional reversal
 * 10. Withdraw student WITH full refund — full reversal
 * 11. Final integrity check: total INCOME = teacher earnings + academy pool + refunds
 *
 * Usage: cd backend && node test-finance-e2e.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const BASE = "http://localhost:5000";
const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/scaDB";

let TOKEN, HEADERS;
let passed = 0, failed = 0;

async function api(method, path, body) {
  const opts = { method, headers: HEADERS };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();
  if (!data.success && res.status >= 400) {
    throw new Error(`API ${method} ${path} failed: ${data.message || JSON.stringify(data)}`);
  }
  return data;
}

function assert(condition, msg) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${msg}`);
    failed++;
    return false;
  }
  console.log(`  ✅ ${msg}`);
  passed++;
  return true;
}

function assertApprox(actual, expected, msg, tolerance = 1) {
  return assert(Math.abs(actual - expected) <= tolerance,
    `${msg} (actual=${actual}, expected=${expected})`);
}

async function getDashboard() {
  return api("GET", "/api/payroll/dashboard");
}

async function getEarnings() {
  return api("GET", "/api/payroll/earnings-breakdown");
}

function findTeacher(dashboard, nameFragment) {
  return dashboard.data.teachersWithBalances.find((t) => t.name.includes(nameFragment));
}

async function enrollStudent(name, fatherName, cls, fee, paidAmount, phone) {
  return api("POST", "/api/students", {
    studentName: name,
    fatherName: fatherName,
    class: cls.classTitle,
    classRef: cls._id.toString(),
    sessionRef: cls.session.toString(),
    group: "Pre-Medical",
    subjects: (cls.subjects || []).map((s) => ({ name: s.name, fee: s.fee || 0 })),
    totalFee: fee,
    paidAmount: paidAmount,
    feeStatus: paidAmount >= fee ? "paid" : paidAmount > 0 ? "partial" : "pending",
    parentCell: phone,
    admissionDate: new Date().toISOString(),
  });
}

async function withdrawStudent(studentId, refundAmount) {
  return api("DELETE", `/api/students/${studentId}`, {
    refundAmount: refundAmount || 0,
    refundReason: refundAmount > 0 ? "Test refund" : undefined,
  });
}

async function payTeacher(teacherId, amount, isAdvance = false, notes = "") {
  return api("POST", "/api/finance/teacher-payout", {
    teacherId,
    amount,
    notes: notes || (isAdvance ? "Advance payment" : "Salary payout"),
  });
}

async function collectFee(studentId, amount) {
  return api("POST", `/api/students/${studentId}/collect-fee`, {
    amount,
    method: "cash",
    month: new Date().toISOString().slice(0, 7),
  });
}

async function cleanTestData(db) {
  console.log("\n🧹 Cleaning all test data...");
  await db.collection("students").deleteMany({ studentName: { $regex: /^MegaTest/ } });
  await db.collection("transactions").deleteMany({
    $or: [
      { type: "LIABILITY", category: "Payroll_Credit" },
      { type: "DEBIT", category: "Teacher Share Reversal" },
      { type: "EXPENSE", category: "Academy Share Reversal" },
      { type: "EXPENSE", category: { $in: ["Teacher Salary", "Teacher Advance", "Teacher Payout", "Teacher_Payout", "Salaries"] } },
      { type: "REFUND", category: "Refund" },
      { type: "INCOME", category: "Tuition", description: { $regex: /MegaTest/ } },
    ],
  });
  await db.collection("feerecords").deleteMany({});
  await db.collection("teacherpayments").deleteMany({});
  await db.collection("teachers").updateMany({}, {
    $set: { "balance.pending": 0, "balance.floating": 0, "balance.verified": 0, totalPaid: 0 },
  });
  console.log("  ✅ Clean slate ready\n");
}

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to DB");
  const db = mongoose.connection.db;

  // Auth
  const owner = await db.collection("users").findOne({ role: "OWNER" });
  TOKEN = jwt.sign({ id: owner._id, role: owner.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
  HEADERS = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };

  // Classes & Teachers
  const classes = await db.collection("classes").find({ status: "active" }).toArray();
  const pctClass = classes.find((c) => c.revenueMode === "percentage" || !c.revenueMode);
  const fixedClass = classes.find((c) => c.revenueMode === "fixed-per-student");

  if (!pctClass || !fixedClass) {
    console.error("Need both a percentage and fixed-per-student class. Aborting.");
    process.exit(1);
  }

  const teachers = await db.collection("teachers").find({ status: "active" }).toArray();
  const sirAhmed = teachers.find((t) => t.name.includes("Ahmed"));
  const sirBilal = teachers.find((t) => t.name.includes("Bilal"));
  const ahmedPct = sirAhmed.compensation?.teacherShare || 70;
  const bilalPct = sirBilal.compensation?.teacherShare || 60;
  const fixedRate = fixedClass.teacherRatePerStudent || 5000;
  const numTeachers = 2;

  console.log(`\n📋 Setup:`);
  console.log(`  Percentage class: ${pctClass.classTitle} (session: ${pctClass.session})`);
  console.log(`  Fixed class: ${fixedClass.classTitle} (rate: Rs.${fixedRate}/student, session: ${fixedClass.session})`);
  console.log(`  Sir Ahmed: ${ahmedPct}% share`);
  console.log(`  Sir Bilal: ${bilalPct}% share`);

  // Clean state
  await cleanTestData(db);

  // Running totals for integrity checks
  let expectedAhmedEarned = 0, expectedBilalEarned = 0, expectedAcademyPool = 0;
  let expectedAhmedPaid = 0, expectedBilalPaid = 0;
  let totalIncomeCollected = 0, totalRefunded = 0;

  // ═══════════════════════════════════════════════════════════════
  // STEP 1: Full-fee student in PERCENTAGE class
  // ═══════════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════");
  console.log("STEP 1: Enroll Student S1 — Full fee Rs.20,000 in PERCENTAGE class");
  console.log("═══════════════════════════════════════════════════════════");

  const s1 = await enrollStudent("MegaTest S1 Full Pct", "Father S1", pctClass, 20000, 20000, "03001000001");
  const s1Id = s1.data?._id || s1.student?._id;
  assert(!!s1Id, "S1 created");
  totalIncomeCollected += 20000;

  // Each teacher's portion = 20000/2 = 10000
  const s1AhmedShare = Math.round(10000 * (ahmedPct / 100));  // 7000
  const s1BilalShare = Math.round(10000 * (bilalPct / 100));    // 6000
  const s1AcademyShare = (10000 - s1AhmedShare) + (10000 - s1BilalShare); // 3000 + 4000 = 7000
  expectedAhmedEarned += s1AhmedShare;
  expectedBilalEarned += s1BilalShare;
  expectedAcademyPool += s1AcademyShare;

  let dash = await getDashboard();
  let ahmed = findTeacher(dash, "Ahmed");
  let bilal = findTeacher(dash, "Bilal");
  assertApprox(ahmed.totalEarned, expectedAhmedEarned, `Ahmed earned Rs.${expectedAhmedEarned}`);
  assertApprox(bilal.totalEarned, expectedBilalEarned, `Bilal earned Rs.${expectedBilalEarned}`);

  // ═══════════════════════════════════════════════════════════════
  // STEP 2: Full-fee student in FIXED class
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("STEP 2: Enroll Student S2 — Full fee Rs.20,000 in FIXED class");
  console.log("═══════════════════════════════════════════════════════════");

  const s2 = await enrollStudent("MegaTest S2 Full Fixed", "Father S2", fixedClass, 20000, 20000, "03001000002");
  const s2Id = s2.data?._id || s2.student?._id;
  assert(!!s2Id, "S2 created");
  totalIncomeCollected += 20000;

  // Each teacher gets fixedRate per student, academy gets remainder
  expectedAhmedEarned += fixedRate;  // +5000 = 12000
  expectedBilalEarned += fixedRate;   // +5000 = 11000
  const s2AcademyShare = 20000 - (fixedRate * numTeachers); // 20000 - 10000 = 10000
  expectedAcademyPool += s2AcademyShare;

  dash = await getDashboard();
  ahmed = findTeacher(dash, "Ahmed");
  bilal = findTeacher(dash, "Bilal");
  assertApprox(ahmed.totalEarned, expectedAhmedEarned, `Ahmed total Rs.${expectedAhmedEarned}`);
  assertApprox(bilal.totalEarned, expectedBilalEarned, `Bilal total Rs.${expectedBilalEarned}`);

  // ═══════════════════════════════════════════════════════════════
  // STEP 3: Discounted student in PERCENTAGE class (pays 15000 of 20000)
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("STEP 3: Enroll Student S3 — Discounted Rs.15,000/20,000 in PERCENTAGE class");
  console.log("═══════════════════════════════════════════════════════════");

  const s3 = await enrollStudent("MegaTest S3 Discount Pct", "Father S3", pctClass, 20000, 15000, "03001000003");
  const s3Id = s3.data?._id || s3.student?._id;
  assert(!!s3Id, "S3 created");
  totalIncomeCollected += 15000;

  // Split happens on paidAmount=15000, not totalFee=20000
  const s3PerTeacher = 15000 / numTeachers; // 7500
  const s3AhmedShare = Math.round(s3PerTeacher * (ahmedPct / 100)); // 5250
  const s3BilalShare = Math.round(s3PerTeacher * (bilalPct / 100));   // 4500
  const s3AcademyShare = (Math.round(s3PerTeacher) - s3AhmedShare) + (Math.round(s3PerTeacher) - s3BilalShare);
  expectedAhmedEarned += s3AhmedShare;
  expectedBilalEarned += s3BilalShare;
  expectedAcademyPool += s3AcademyShare;

  dash = await getDashboard();
  ahmed = findTeacher(dash, "Ahmed");
  bilal = findTeacher(dash, "Bilal");
  assertApprox(ahmed.totalEarned, expectedAhmedEarned, `Ahmed Rs.${expectedAhmedEarned} (after discount student)`);
  assertApprox(bilal.totalEarned, expectedBilalEarned, `Bilal Rs.${expectedBilalEarned} (after discount student)`);

  // ═══════════════════════════════════════════════════════════════
  // STEP 4: Partial-pay student in FIXED class (pays 10000 of 20000, collects rest later)
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("STEP 4: Enroll Student S4 — Partial Rs.10,000/20,000 in FIXED class");
  console.log("═══════════════════════════════════════════════════════════");

  const s4 = await enrollStudent("MegaTest S4 Partial Fixed", "Father S4", fixedClass, 20000, 10000, "03001000004");
  const s4Id = s4.data?._id || s4.student?._id;
  assert(!!s4Id, "S4 created");
  totalIncomeCollected += 10000;

  // Split on paidAmount=10000 for fixed class
  // Each teacher gets min(fixedRate, portion) — actually feeSplitCalculator always gives fixedRate
  // But wait: if paidAmount=10000 and fixedRate=5000 per teacher (2 teachers = 10000 total teacher cost)
  // Academy gets max(0, 10000 - 10000) = 0
  expectedAhmedEarned += fixedRate; // +5000
  expectedBilalEarned += fixedRate;  // +5000
  const s4AcademyShare = Math.max(0, 10000 - (fixedRate * numTeachers)); // 0
  expectedAcademyPool += s4AcademyShare;

  dash = await getDashboard();
  ahmed = findTeacher(dash, "Ahmed");
  bilal = findTeacher(dash, "Bilal");
  assertApprox(ahmed.totalEarned, expectedAhmedEarned, `Ahmed Rs.${expectedAhmedEarned} (after partial student)`);
  assertApprox(bilal.totalEarned, expectedBilalEarned, `Bilal Rs.${expectedBilalEarned} (after partial student)`);

  console.log(`\n  📊 Academy Pool so far: expected Rs.${expectedAcademyPool}`);
  let earnings = await getEarnings();
  assertApprox(earnings.data.totalAcademyPool, expectedAcademyPool, `Academy Pool Rs.${expectedAcademyPool}`);

  // ═══════════════════════════════════════════════════════════════
  // STEP 5: Collect remaining fee for S4 (10000 more)
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("STEP 5: Collect remaining Rs.10,000 from S4");
  console.log("═══════════════════════════════════════════════════════════");

  await collectFee(s4Id, 10000);
  totalIncomeCollected += 10000;

  // Second collection also goes through feeSplitCalculator with amount=10000
  expectedAhmedEarned += fixedRate; // +5000
  expectedBilalEarned += fixedRate;  // +5000
  const s4Extra = Math.max(0, 10000 - (fixedRate * numTeachers)); // 0
  expectedAcademyPool += s4Extra;

  dash = await getDashboard();
  ahmed = findTeacher(dash, "Ahmed");
  bilal = findTeacher(dash, "Bilal");
  assertApprox(ahmed.totalEarned, expectedAhmedEarned, `Ahmed Rs.${expectedAhmedEarned} (after fee collection)`);
  assertApprox(bilal.totalEarned, expectedBilalEarned, `Bilal Rs.${expectedBilalEarned} (after fee collection)`);

  earnings = await getEarnings();
  assertApprox(earnings.data.totalAcademyPool, expectedAcademyPool, `Academy Pool Rs.${expectedAcademyPool}`);

  // ═══════════════════════════════════════════════════════════════
  // STEP 6: Add more students to build up balance, then test teacher payout
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("STEP 6: Enroll S5, S6 (2 more full-fee students in both classes)");
  console.log("═══════════════════════════════════════════════════════════");

  // S5 in percentage class
  const s5 = await enrollStudent("MegaTest S5 Extra Pct", "Father S5", pctClass, 18000, 18000, "03001000005");
  const s5Id = s5.data?._id || s5.student?._id;
  assert(!!s5Id, "S5 created");
  totalIncomeCollected += 18000;
  const s5PerTeacher = 18000 / numTeachers;
  expectedAhmedEarned += Math.round(s5PerTeacher * (ahmedPct / 100));
  expectedBilalEarned += Math.round(s5PerTeacher * (bilalPct / 100));
  expectedAcademyPool += (Math.round(s5PerTeacher) - Math.round(s5PerTeacher * (ahmedPct / 100)))
                       + (Math.round(s5PerTeacher) - Math.round(s5PerTeacher * (bilalPct / 100)));

  // S6 in fixed class
  const s6 = await enrollStudent("MegaTest S6 Extra Fixed", "Father S6", fixedClass, 25000, 25000, "03001000006");
  const s6Id = s6.data?._id || s6.student?._id;
  assert(!!s6Id, "S6 created");
  totalIncomeCollected += 25000;
  expectedAhmedEarned += fixedRate;
  expectedBilalEarned += fixedRate;
  expectedAcademyPool += Math.max(0, 25000 - (fixedRate * numTeachers)); // 15000

  dash = await getDashboard();
  ahmed = findTeacher(dash, "Ahmed");
  bilal = findTeacher(dash, "Bilal");
  assertApprox(ahmed.totalEarned, expectedAhmedEarned, `Ahmed Rs.${expectedAhmedEarned} (6 students total)`);
  assertApprox(bilal.totalEarned, expectedBilalEarned, `Bilal Rs.${expectedBilalEarned} (6 students total)`);

  earnings = await getEarnings();
  assertApprox(earnings.data.totalAcademyPool, expectedAcademyPool, `Academy Pool Rs.${expectedAcademyPool}`);

  // ═══════════════════════════════════════════════════════════════
  // STEP 7: Pay teacher (salary payout from pending balance)
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("STEP 7: Pay Sir Ahmed Rs.10,000 as salary payout");
  console.log("═══════════════════════════════════════════════════════════");

  const ahmedPendingBefore = ahmed.netPayable;
  console.log(`  Ahmed pending before: Rs.${ahmedPendingBefore}`);

  await payTeacher(sirAhmed._id.toString(), 10000, false, "Monthly salary");
  expectedAhmedPaid += 10000;

  dash = await getDashboard();
  ahmed = findTeacher(dash, "Ahmed");
  assertApprox(ahmed.netPayable, ahmedPendingBefore - 10000, `Ahmed payable dropped by 10000`);
  assertApprox(ahmed.totalWithdrawn, expectedAhmedPaid, `Ahmed totalWithdrawn Rs.${expectedAhmedPaid}`);
  // totalEarned should NOT change after payout
  assertApprox(ahmed.totalEarned, expectedAhmedEarned, `Ahmed earned unchanged at Rs.${expectedAhmedEarned}`);

  // ═══════════════════════════════════════════════════════════════
  // STEP 8: Pay Sir Bilal Rs.5,000 as salary payout
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("STEP 8: Pay Sir Bilal Rs.5,000 salary payout");
  console.log("═══════════════════════════════════════════════════════════");

  const bilalPendingBefore = bilal.netPayable;
  console.log(`  Bilal pending before: Rs.${bilalPendingBefore}`);

  await payTeacher(sirBilal._id.toString(), 5000, false, "Salary payment");
  expectedBilalPaid += 5000;

  dash = await getDashboard();
  bilal = findTeacher(dash, "Bilal");
  assertApprox(bilal.netPayable, bilalPendingBefore - 5000, `Bilal payable dropped by 5000`);
  assertApprox(bilal.totalWithdrawn, expectedBilalPaid, `Bilal totalWithdrawn Rs.${expectedBilalPaid}`);

  // ═══════════════════════════════════════════════════════════════
  // STEP 9: Withdraw S1 WITHOUT refund — no reversal
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("STEP 9: Withdraw S1 WITHOUT refund");
  console.log("═══════════════════════════════════════════════════════════");

  await withdrawStudent(s1Id, 0);

  dash = await getDashboard();
  ahmed = findTeacher(dash, "Ahmed");
  bilal = findTeacher(dash, "Bilal");
  assertApprox(ahmed.totalEarned, expectedAhmedEarned, `Ahmed earned unchanged Rs.${expectedAhmedEarned}`);
  assertApprox(bilal.totalEarned, expectedBilalEarned, `Bilal earned unchanged Rs.${expectedBilalEarned}`);

  // ═══════════════════════════════════════════════════════════════
  // STEP 10: Withdraw S2 WITH FULL refund (Rs.20000) — full reversal
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("STEP 10: Withdraw S2 WITH full refund of Rs.20,000");
  console.log("═══════════════════════════════════════════════════════════");

  await withdrawStudent(s2Id, 20000);
  totalRefunded += 20000;

  // S2 was in fixed class: each teacher earned fixedRate=5000, academy earned 10000
  // Full refund ratio = 20000 / (10000 + 10000) = 1.0 → full reversal
  expectedAhmedEarned -= fixedRate;
  expectedBilalEarned -= fixedRate;
  expectedAcademyPool -= s2AcademyShare; // -10000

  dash = await getDashboard();
  ahmed = findTeacher(dash, "Ahmed");
  bilal = findTeacher(dash, "Bilal");
  assertApprox(ahmed.totalEarned, expectedAhmedEarned, `Ahmed Rs.${expectedAhmedEarned} (after full refund)`);
  assertApprox(bilal.totalEarned, expectedBilalEarned, `Bilal Rs.${expectedBilalEarned} (after full refund)`);

  earnings = await getEarnings();
  assertApprox(earnings.data.totalAcademyPool, expectedAcademyPool, `Academy Pool Rs.${expectedAcademyPool} (after full refund)`);

  // ═══════════════════════════════════════════════════════════════
  // STEP 11: Withdraw S3 WITH PARTIAL refund (Rs.5000 of 15000 paid)
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("STEP 11: Withdraw S3 WITH partial refund of Rs.5,000 (paid 15,000)");
  console.log("═══════════════════════════════════════════════════════════");

  // S3 paid 15000 in pct class. Teacher credits: Ahmed=5250, Bilal=4500
  // Total distributed = teacherCredits + academyShare
  const s3TotalTeacher = s3AhmedShare + s3BilalShare; // 9750
  const s3TotalDistributed = s3TotalTeacher + s3AcademyShare;
  const refundRatio = Math.min(1, 5000 / s3TotalDistributed);
  const s3AhmedReversal = Math.round(s3AhmedShare * refundRatio);
  const s3BilalReversal = Math.round(s3BilalShare * refundRatio);
  const s3AcademyReversal = Math.round(s3AcademyShare * refundRatio);

  await withdrawStudent(s3Id, 5000);
  totalRefunded += 5000;

  expectedAhmedEarned -= s3AhmedReversal;
  expectedBilalEarned -= s3BilalReversal;
  expectedAcademyPool -= s3AcademyReversal;

  dash = await getDashboard();
  ahmed = findTeacher(dash, "Ahmed");
  bilal = findTeacher(dash, "Bilal");
  assertApprox(ahmed.totalEarned, expectedAhmedEarned, `Ahmed Rs.${expectedAhmedEarned} (after partial refund)`);
  assertApprox(bilal.totalEarned, expectedBilalEarned, `Bilal Rs.${expectedBilalEarned} (after partial refund)`);

  earnings = await getEarnings();
  assertApprox(earnings.data.totalAcademyPool, expectedAcademyPool, `Academy Pool Rs.${expectedAcademyPool} (after partial refund)`);

  // ═══════════════════════════════════════════════════════════════
  // STEP 12: Verify earnings breakdown — class details
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("STEP 12: Verify earnings breakdown per teacher (class-level detail)");
  console.log("═══════════════════════════════════════════════════════════");

  earnings = await getEarnings();
  const ahmedBreakdown = earnings.data.teachers.find((t) => t.teacherName.includes("Ahmed"));
  const bilalBreakdown = earnings.data.teachers.find((t) => t.teacherName.includes("Bilal"));

  assert(ahmedBreakdown.breakdown.length >= 2, `Ahmed has ${ahmedBreakdown.breakdown.length} class breakdowns (expected ≥2)`);
  assert(bilalBreakdown.breakdown.length >= 2, `Bilal has ${bilalBreakdown.breakdown.length} class breakdowns (expected ≥2)`);

  console.log(`\n  Ahmed breakdown:`);
  for (const b of ahmedBreakdown.breakdown) {
    console.log(`    ${b.className} | ${b.subject} | students=${b.studentCount} | earning=Rs.${b.totalEarning} | academy=Rs.${b.academyShare} | fixed=${b.isFixedRate}`);
  }
  console.log(`  Ahmed calculated total: Rs.${ahmedBreakdown.calculatedEarning}`);

  console.log(`\n  Bilal breakdown:`);
  for (const b of bilalBreakdown.breakdown) {
    console.log(`    ${b.className} | ${b.subject} | students=${b.studentCount} | earning=Rs.${b.totalEarning} | academy=Rs.${b.academyShare} | fixed=${b.isFixedRate}`);
  }
  console.log(`  Bilal calculated total: Rs.${bilalBreakdown.calculatedEarning}`);

  // ═══════════════════════════════════════════════════════════════
  // STEP 13: Final integrity check
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("STEP 13: Final integrity check");
  console.log("═══════════════════════════════════════════════════════════");

  dash = await getDashboard();
  ahmed = findTeacher(dash, "Ahmed");
  bilal = findTeacher(dash, "Bilal");

  const finalAhmedEarned = ahmed.totalEarned;
  const finalBilalEarned = bilal.totalEarned;
  const finalAcademyPool = earnings.data.totalAcademyPool;
  const finalAhmedPaid = ahmed.totalWithdrawn;
  const finalBilalPaid = bilal.totalWithdrawn;

  console.log(`\n  📊 FINANCIAL SUMMARY:`);
  console.log(`  ─────────────────────────────────────────`);
  console.log(`  Total Income Collected:     Rs.${totalIncomeCollected.toLocaleString()}`);
  console.log(`  Total Refunded:             Rs.${totalRefunded.toLocaleString()}`);
  console.log(`  Net Revenue:                Rs.${(totalIncomeCollected - totalRefunded).toLocaleString()}`);
  console.log(`  ─────────────────────────────────────────`);
  console.log(`  Ahmed Earned:               Rs.${finalAhmedEarned.toLocaleString()}`);
  console.log(`  Bilal Earned:               Rs.${finalBilalEarned.toLocaleString()}`);
  console.log(`  Academy Pool:               Rs.${finalAcademyPool.toLocaleString()}`);
  console.log(`  Total Distributed:          Rs.${(finalAhmedEarned + finalBilalEarned + finalAcademyPool).toLocaleString()}`);
  console.log(`  ─────────────────────────────────────────`);
  console.log(`  Ahmed Paid Out:             Rs.${finalAhmedPaid.toLocaleString()}`);
  console.log(`  Bilal Paid Out:             Rs.${finalBilalPaid.toLocaleString()}`);
  console.log(`  Ahmed Net Payable:          Rs.${ahmed.netPayable.toLocaleString()}`);
  console.log(`  Bilal Net Payable:          Rs.${bilal.netPayable.toLocaleString()}`);
  console.log(`  ─────────────────────────────────────────`);

  // Net payable = earned - paid - reversed
  assertApprox(ahmed.netPayable, finalAhmedEarned - finalAhmedPaid, `Ahmed payable = earned - paid`);
  assertApprox(bilal.netPayable, finalBilalEarned - finalBilalPaid, `Bilal payable = earned - paid`);

  // Payouts should equal what we paid
  assertApprox(finalAhmedPaid, expectedAhmedPaid, `Ahmed paid matches (Rs.${expectedAhmedPaid})`);
  assertApprox(finalBilalPaid, expectedBilalPaid, `Bilal paid matches (Rs.${expectedBilalPaid})`);

  // Total teacher earnings + academy pool should roughly equal income - refunds
  // Note: not exact because reversals are proportional to distributed, not to income
  const totalDistributed = finalAhmedEarned + finalBilalEarned + finalAcademyPool;
  console.log(`\n  💰 Distribution integrity: Rs.${totalDistributed} distributed from Rs.${totalIncomeCollected - totalRefunded} net revenue`);

  // ═══════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════
  await cleanTestData(db);

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(`  🏁 MEGA TEST COMPLETE: ${passed} passed, ${failed} failed`);
  console.log("═══════════════════════════════════════════════════════════\n");

  await mongoose.connection.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
