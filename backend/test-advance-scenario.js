/**
 * Targeted test: Teacher gets paid advance, then new students enroll.
 * Verifies payable increases correctly after payout + new enrollment.
 *
 * Scenario:
 *   - 10 students enroll in percentage class (Rs.20,000 each)
 *   - Teacher A (70%) earns Rs.70,000, Teacher B (60%) earns Rs.60,000
 *   - Pay Teacher A Rs.20,000 advance → payable drops to Rs.50,000
 *   - Enroll Student 11 → Teacher A payable should rise to Rs.57,000
 *   - Pay Teacher B Rs.15,000 → payable drops
 *   - Enroll Student 12 in FIXED class → both teachers get fixed rate added
 *   - Verify everything stays in sync across multiple teachers
 */
require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const BASE = "http://localhost:5000";
let TOKEN, HEADERS;
let passed = 0, failed = 0;

async function api(method, path, body) {
  const opts = { method, headers: HEADERS };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();
  if (!data.success && res.status >= 400) throw new Error(`API ${method} ${path}: ${data.message}`);
  return data;
}

function assert(cond, msg) {
  if (!cond) { console.error(`  ❌ ${msg}`); failed++; return false; }
  console.log(`  ✅ ${msg}`); passed++; return true;
}

function approx(a, b, msg, tol = 1) {
  return assert(Math.abs(a - b) <= tol, `${msg} (got=${a}, expect=${b})`);
}

async function dash() { return api("GET", "/api/payroll/dashboard"); }
async function earnings() { return api("GET", "/api/payroll/earnings-breakdown"); }
function teacher(d, name) { return d.data.teachersWithBalances.find(t => t.name.includes(name)); }

async function enroll(name, cls, fee, paid, phone) {
  return api("POST", "/api/students", {
    studentName: name, fatherName: `Father of ${name}`,
    class: cls.classTitle, classRef: cls._id.toString(),
    sessionRef: cls.session.toString(), group: "Pre-Medical",
    subjects: (cls.subjects || []).map(s => ({ name: s.name, fee: s.fee || 0 })),
    totalFee: fee, paidAmount: paid,
    feeStatus: paid >= fee ? "paid" : paid > 0 ? "partial" : "pending",
    parentCell: phone, admissionDate: new Date().toISOString(),
  });
}

async function pay(teacherId, amount) {
  return api("POST", "/api/finance/teacher-payout", { teacherId, amount, notes: "Test payout" });
}

async function clean(db) {
  await db.collection("students").deleteMany({ studentName: { $regex: /^ScenarioTest/ } });
  await db.collection("transactions").deleteMany({
    $or: [
      { type: "LIABILITY", category: "Payroll_Credit" },
      { type: "DEBIT", category: "Teacher Share Reversal" },
      { type: "EXPENSE", category: "Academy Share Reversal" },
      { type: "EXPENSE", category: { $in: ["Teacher Salary", "Teacher Advance", "Teacher Payout", "Teacher_Payout"] } },
      { type: "REFUND", category: "Refund" },
      { type: "INCOME", category: "Tuition", description: { $regex: /ScenarioTest/ } },
    ],
  });
  await db.collection("feerecords").deleteMany({});
  await db.collection("teacherpayments").deleteMany({});
  await db.collection("teachers").updateMany({}, {
    $set: { "balance.pending": 0, "balance.floating": 0, "balance.verified": 0, totalPaid: 0 },
  });
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const owner = await db.collection("users").findOne({ role: "OWNER" });
  TOKEN = jwt.sign({ id: owner._id, role: owner.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
  HEADERS = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };

  const classes = await db.collection("classes").find({ status: "active" }).toArray();
  const pctClass = classes.find(c => c.revenueMode === "percentage" || !c.revenueMode);
  const fixedClass = classes.find(c => c.revenueMode === "fixed-per-student");
  const teachers = await db.collection("teachers").find({ status: "active" }).toArray();
  const sirAhmed = teachers.find(t => t.name.includes("Ahmed"));
  const sirBilal = teachers.find(t => t.name.includes("Bilal"));
  const ahmedPct = sirAhmed.compensation?.teacherShare || 70;
  const bilalPct = sirBilal.compensation?.teacherShare || 60;
  const fixedRate = fixedClass.teacherRatePerStudent || 5000;
  const numTeachers = 2;
  const feePerStudent = 20000;
  const perTeacherPortion = feePerStudent / numTeachers; // 10,000

  await clean(db);
  console.log("\n🧪 SCENARIO: 10 students → pay teacher → add more students → verify sync\n");

  // Track expected values
  let ahmedEarned = 0, bilalEarned = 0, academyPool = 0;
  let ahmedPaid = 0, bilalPaid = 0;

  // ═══════════════════════════════════════════════════════════════
  console.log("PHASE 1: Enroll 10 students in PERCENTAGE class (Rs.20,000 each)");
  console.log("═══════════════════════════════════════════════════════════════");

  for (let i = 1; i <= 10; i++) {
    await enroll(`ScenarioTest S${i}`, pctClass, feePerStudent, feePerStudent, `0300100000${i}`);
    ahmedEarned += Math.round(perTeacherPortion * (ahmedPct / 100));
    bilalEarned += Math.round(perTeacherPortion * (bilalPct / 100));
    academyPool += (Math.round(perTeacherPortion) - Math.round(perTeacherPortion * (ahmedPct / 100)))
                 + (Math.round(perTeacherPortion) - Math.round(perTeacherPortion * (bilalPct / 100)));
  }

  let d = await dash();
  let ahmed = teacher(d, "Ahmed");
  let bilal = teacher(d, "Bilal");

  console.log(`\n  After 10 students (each Rs.${feePerStudent}):`);
  console.log(`  Ahmed: earned=Rs.${ahmed.totalEarned}, payable=Rs.${ahmed.netPayable}`);
  console.log(`  Bilal: earned=Rs.${bilal.totalEarned}, payable=Rs.${bilal.netPayable}`);

  approx(ahmed.totalEarned, ahmedEarned, `Ahmed earned Rs.${ahmedEarned} (70% of Rs.${perTeacherPortion} × 10)`);
  approx(bilal.totalEarned, bilalEarned, `Bilal earned Rs.${bilalEarned} (60% of Rs.${perTeacherPortion} × 10)`);
  approx(ahmed.netPayable, ahmedEarned, `Ahmed payable = earned (no payouts yet)`);
  approx(bilal.netPayable, bilalEarned, `Bilal payable = earned (no payouts yet)`);

  let e = await earnings();
  approx(e.data.totalAcademyPool, academyPool, `Academy Pool Rs.${academyPool}`);

  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("PHASE 2: Pay Ahmed Rs.20,000 (salary payout)");
  console.log("═══════════════════════════════════════════════════════════════");

  await pay(sirAhmed._id.toString(), 20000);
  ahmedPaid += 20000;

  d = await dash();
  ahmed = teacher(d, "Ahmed");
  bilal = teacher(d, "Bilal");

  console.log(`  Ahmed: earned=Rs.${ahmed.totalEarned}, paid=Rs.${ahmed.totalWithdrawn}, payable=Rs.${ahmed.netPayable}`);
  approx(ahmed.totalEarned, ahmedEarned, `Ahmed earned UNCHANGED at Rs.${ahmedEarned}`);
  approx(ahmed.totalWithdrawn, ahmedPaid, `Ahmed paid out Rs.${ahmedPaid}`);
  approx(ahmed.netPayable, ahmedEarned - ahmedPaid, `Ahmed payable = ${ahmedEarned} - ${ahmedPaid} = Rs.${ahmedEarned - ahmedPaid}`);
  // Bilal should be totally unaffected
  approx(bilal.totalEarned, bilalEarned, `Bilal earned UNCHANGED (Ahmed's payout doesn't affect Bilal)`);
  approx(bilal.netPayable, bilalEarned - bilalPaid, `Bilal payable UNCHANGED`);

  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("PHASE 3: Enroll Student 11 in PERCENTAGE class → payable should INCREASE");
  console.log("═══════════════════════════════════════════════════════════════");

  const s11AhmedShare = Math.round(perTeacherPortion * (ahmedPct / 100));
  const s11BilalShare = Math.round(perTeacherPortion * (bilalPct / 100));

  await enroll("ScenarioTest S11", pctClass, feePerStudent, feePerStudent, "03001000011");
  ahmedEarned += s11AhmedShare;
  bilalEarned += s11BilalShare;
  academyPool += (Math.round(perTeacherPortion) - s11AhmedShare) + (Math.round(perTeacherPortion) - s11BilalShare);

  d = await dash();
  ahmed = teacher(d, "Ahmed");
  bilal = teacher(d, "Bilal");

  console.log(`  Ahmed: earned=Rs.${ahmed.totalEarned}, paid=Rs.${ahmed.totalWithdrawn}, payable=Rs.${ahmed.netPayable}`);
  console.log(`  Bilal: earned=Rs.${bilal.totalEarned}, paid=Rs.${bilal.totalWithdrawn}, payable=Rs.${bilal.netPayable}`);

  approx(ahmed.totalEarned, ahmedEarned, `Ahmed earned INCREASED to Rs.${ahmedEarned}`);
  approx(ahmed.netPayable, ahmedEarned - ahmedPaid,
    `Ahmed payable = Rs.${ahmedEarned} earned - Rs.${ahmedPaid} paid = Rs.${ahmedEarned - ahmedPaid} ← CORRECT INCREASE`);
  approx(bilal.totalEarned, bilalEarned, `Bilal earned INCREASED to Rs.${bilalEarned}`);
  approx(bilal.netPayable, bilalEarned - bilalPaid, `Bilal payable Rs.${bilalEarned - bilalPaid}`);

  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("PHASE 4: Pay Bilal Rs.15,000 → then enroll Student 12 in FIXED class");
  console.log("═══════════════════════════════════════════════════════════════");

  await pay(sirBilal._id.toString(), 15000);
  bilalPaid += 15000;

  d = await dash();
  bilal = teacher(d, "Bilal");
  approx(bilal.netPayable, bilalEarned - bilalPaid, `Bilal payable after payout = Rs.${bilalEarned - bilalPaid}`);

  // Now enroll S12 in FIXED class
  await enroll("ScenarioTest S12", fixedClass, 25000, 25000, "03001000012");
  ahmedEarned += fixedRate;
  bilalEarned += fixedRate;
  academyPool += Math.max(0, 25000 - (fixedRate * numTeachers));

  d = await dash();
  ahmed = teacher(d, "Ahmed");
  bilal = teacher(d, "Bilal");

  console.log(`  Ahmed: earned=Rs.${ahmed.totalEarned}, paid=Rs.${ahmed.totalWithdrawn}, payable=Rs.${ahmed.netPayable}`);
  console.log(`  Bilal: earned=Rs.${bilal.totalEarned}, paid=Rs.${bilal.totalWithdrawn}, payable=Rs.${bilal.netPayable}`);

  approx(ahmed.totalEarned, ahmedEarned, `Ahmed earned Rs.${ahmedEarned} (now includes fixed class)`);
  approx(ahmed.netPayable, ahmedEarned - ahmedPaid, `Ahmed payable = Rs.${ahmedEarned - ahmedPaid}`);
  approx(bilal.totalEarned, bilalEarned, `Bilal earned Rs.${bilalEarned} (now includes fixed class)`);
  approx(bilal.netPayable, bilalEarned - bilalPaid, `Bilal payable = Rs.${bilalEarned - bilalPaid}`);

  e = await earnings();
  approx(e.data.totalAcademyPool, academyPool, `Academy Pool Rs.${academyPool}`);

  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("PHASE 5: Pay Ahmed another Rs.30,000 → then enroll 3 more students");
  console.log("═══════════════════════════════════════════════════════════════");

  await pay(sirAhmed._id.toString(), 30000);
  ahmedPaid += 30000;

  // Enroll S13, S14 in pct class, S15 in fixed class
  for (let i = 13; i <= 14; i++) {
    await enroll(`ScenarioTest S${i}`, pctClass, feePerStudent, feePerStudent, `030010000${i}`);
    ahmedEarned += Math.round(perTeacherPortion * (ahmedPct / 100));
    bilalEarned += Math.round(perTeacherPortion * (bilalPct / 100));
    academyPool += (Math.round(perTeacherPortion) - Math.round(perTeacherPortion * (ahmedPct / 100)))
                 + (Math.round(perTeacherPortion) - Math.round(perTeacherPortion * (bilalPct / 100)));
  }
  await enroll("ScenarioTest S15", fixedClass, 18000, 18000, "03001000015");
  ahmedEarned += fixedRate;
  bilalEarned += fixedRate;
  academyPool += Math.max(0, 18000 - (fixedRate * numTeachers));

  d = await dash();
  ahmed = teacher(d, "Ahmed");
  bilal = teacher(d, "Bilal");

  console.log(`  Ahmed: earned=Rs.${ahmed.totalEarned}, paid=Rs.${ahmed.totalWithdrawn}, payable=Rs.${ahmed.netPayable}`);
  console.log(`  Bilal: earned=Rs.${bilal.totalEarned}, paid=Rs.${bilal.totalWithdrawn}, payable=Rs.${bilal.netPayable}`);

  approx(ahmed.totalEarned, ahmedEarned, `Ahmed earned Rs.${ahmedEarned}`);
  approx(ahmed.netPayable, ahmedEarned - ahmedPaid, `Ahmed payable = earned(${ahmedEarned}) - paid(${ahmedPaid}) = Rs.${ahmedEarned - ahmedPaid}`);
  approx(bilal.totalEarned, bilalEarned, `Bilal earned Rs.${bilalEarned}`);
  approx(bilal.netPayable, bilalEarned - bilalPaid, `Bilal payable = earned(${bilalEarned}) - paid(${bilalPaid}) = Rs.${bilalEarned - bilalPaid}`);

  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("PHASE 6: Withdraw S5 with full refund (mid-stream reversal after payouts)");
  console.log("═══════════════════════════════════════════════════════════════");

  // S5 was in pct class, paid 20000
  const s5Txns = await db.collection("transactions").find({
    type: "LIABILITY", category: "Payroll_Credit",
    studentId: (await db.collection("students").findOne({ studentName: "ScenarioTest S5" }))._id,
  }).toArray();
  const s5Student = await db.collection("students").findOne({ studentName: "ScenarioTest S5" });
  const s5Id = s5Student._id.toString();

  // Calculate expected reversals
  const s5TotalTeacher = s5Txns.reduce((s, t) => s + t.amount, 0);
  const s5TotalAcademy = s5Txns.reduce((s, t) => s + (t.splitDetails?.academyShare || 0), 0);
  const s5Distributed = s5TotalTeacher + s5TotalAcademy;
  const s5RefundRatio = Math.min(1, 20000 / s5Distributed);

  const s5AhmedTxn = s5Txns.find(t => t.splitDetails?.teacherId?.toString() === sirAhmed._id.toString());
  const s5BilalTxn = s5Txns.find(t => t.splitDetails?.teacherId?.toString() === sirBilal._id.toString());
  const s5AhmedReversal = Math.round((s5AhmedTxn?.amount || 0) * s5RefundRatio);
  const s5BilalReversal = Math.round((s5BilalTxn?.amount || 0) * s5RefundRatio);
  const s5AcademyReversal = Math.round(s5TotalAcademy * s5RefundRatio);

  await api("DELETE", `/api/students/${s5Id}`, { refundAmount: 20000, refundReason: "Test full refund" });
  ahmedEarned -= s5AhmedReversal;
  bilalEarned -= s5BilalReversal;
  academyPool -= s5AcademyReversal;

  d = await dash();
  ahmed = teacher(d, "Ahmed");
  bilal = teacher(d, "Bilal");

  console.log(`  Ahmed: earned=Rs.${ahmed.totalEarned}, paid=Rs.${ahmed.totalWithdrawn}, payable=Rs.${ahmed.netPayable}`);
  console.log(`  Bilal: earned=Rs.${bilal.totalEarned}, paid=Rs.${bilal.totalWithdrawn}, payable=Rs.${bilal.netPayable}`);

  approx(ahmed.totalEarned, ahmedEarned, `Ahmed earned Rs.${ahmedEarned} (after refund reversal)`);
  approx(ahmed.netPayable, ahmedEarned - ahmedPaid, `Ahmed payable = Rs.${ahmedEarned - ahmedPaid} (correctly adjusted)`);
  approx(bilal.totalEarned, bilalEarned, `Bilal earned Rs.${bilalEarned} (after refund reversal)`);
  approx(bilal.netPayable, bilalEarned - bilalPaid, `Bilal payable = Rs.${bilalEarned - bilalPaid}`);

  e = await earnings();
  approx(e.data.totalAcademyPool, academyPool, `Academy Pool Rs.${academyPool}`);

  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("FINAL INTEGRITY CHECK");
  console.log("═══════════════════════════════════════════════════════════════");

  const totalDistributed = ahmed.totalEarned + bilal.totalEarned + e.data.totalAcademyPool;
  console.log(`\n  📊 FINANCIAL LEDGER:`);
  console.log(`  ───────────────────────────────────────────────────`);
  console.log(`  Ahmed: earned=Rs.${ahmed.totalEarned}, paid=Rs.${ahmed.totalWithdrawn}, payable=Rs.${ahmed.netPayable}`);
  console.log(`  Bilal: earned=Rs.${bilal.totalEarned}, paid=Rs.${bilal.totalWithdrawn}, payable=Rs.${bilal.netPayable}`);
  console.log(`  Academy Pool:        Rs.${e.data.totalAcademyPool}`);
  console.log(`  Total Distributed:   Rs.${totalDistributed}`);
  console.log(`  ───────────────────────────────────────────────────`);

  assert(ahmed.netPayable === ahmed.totalEarned - ahmed.totalWithdrawn,
    `Ahmed payable FORMULA: ${ahmed.netPayable} = ${ahmed.totalEarned} - ${ahmed.totalWithdrawn} ✓`);
  assert(bilal.netPayable === bilal.totalEarned - bilal.totalWithdrawn,
    `Bilal payable FORMULA: ${bilal.netPayable} = ${bilal.totalEarned} - ${bilal.totalWithdrawn} ✓`);

  // Cleanup
  await clean(db);

  console.log(`\n═══════════════════════════════════════════════════════════════`);
  console.log(`  🏁 RESULT: ${passed} passed, ${failed} failed`);
  console.log(`═══════════════════════════════════════════════════════════════\n`);

  await mongoose.connection.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
