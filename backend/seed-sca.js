/**
 * SCA ACADEMIA — MEGA Seed Script v2
 * Creates a fully working, realistic dataset for ALL system modules
 * Dates are calibrated for March 2026 (current month)
 * Run: node seed-sca.js
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// Models
const User = require("./models/User");
const Session = require("./models/Session");
const Class = require("./models/Class");
const Teacher = require("./models/Teacher");
const Student = require("./models/Student");
const Transaction = require("./models/Transaction");
const Expense = require("./models/Expense");
const TeacherPayment = require("./models/TeacherPayment");
const FeeRecord = require("./models/FeeRecord");
const Configuration = require("./models/Configuration");
const Notification = require("./models/Notification");

// Also clear any other collections that may exist
let PayoutRequest, Attendance;
try { PayoutRequest = require("./models/PayoutRequest"); } catch(e) {}
try { Attendance = require("./models/Attendance"); } catch(e) {}

const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/scaAcademiaDB";

// ========================================
// DATE HELPERS — Calibrated for March 2026
// ========================================
const now = new Date();
const thisYear = now.getFullYear();
const thisMonthIdx = now.getMonth(); // 0-based (2 = March)
const thisMonth = now.toLocaleString("en-US", { month: "long" });

// Dates in current month (March 2026)
function thisMonthDay(day) {
  return new Date(thisYear, thisMonthIdx, day, 10, 0, 0);
}
// Dates in previous months
function monthDay(monthsAgo, day) {
  return new Date(thisYear, thisMonthIdx - monthsAgo, day, 10, 0, 0);
}
function prevMonthName(monthsAgo) {
  const d = new Date(thisYear, thisMonthIdx - monthsAgo, 1);
  return d.toLocaleString("en-US", { month: "long" });
}

// ========================================
// MAIN SEED
// ========================================
async function main() {
  try {
    console.log("\n🚀 SCA ACADEMIA — MEGA DATABASE SEED v2");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📅 Calibrated for: ${thisMonth} ${thisYear}`);

    await mongoose.connect(MONGO_URI);
    console.log(`✅ Connected to MongoDB: ${MONGO_URI}`);

    // ── WIPE ALL COLLECTIONS ──
    console.log("\n🗑️  Clearing all collections...");
    const clearPromises = [
      User.deleteMany({}),
      Session.deleteMany({}),
      Class.deleteMany({}),
      Teacher.deleteMany({}),
      Student.deleteMany({}),
      Transaction.deleteMany({}),
      Expense.deleteMany({}),
      TeacherPayment.deleteMany({}),
      FeeRecord.deleteMany({}),
      Configuration.deleteMany({}),
      Notification.deleteMany({}),
    ];
    if (PayoutRequest) clearPromises.push(PayoutRequest.deleteMany({}));
    if (Attendance) clearPromises.push(Attendance.deleteMany({}));
    await Promise.all(clearPromises);
    console.log("✅ All collections cleared");

    // ══════════════════════════════════════════════════════
    // 1. CONFIGURATION
    // ══════════════════════════════════════════════════════
    console.log("\n⚙️  Creating Configuration...");
    const config = await Configuration.create({
      academyName: "STANDARD COACHING ACADEMY",
      academyAddress: "University Road, Peshawar",
      academyPhone: "+92 91 5701234",
      systemAdminName: "Sir Usman",
      salaryConfig: { teacherShare: 70, academyShare: 30 },
      defaultSubjectFees: [
        { name: "Biology", fee: 4000 },
        { name: "Chemistry", fee: 4000 },
        { name: "Physics", fee: 3500 },
        { name: "Mathematics", fee: 3500 },
        { name: "English", fee: 2500 },
        { name: "Zoology", fee: 3000 },
      ],
    });
    console.log("✅ Configuration → systemAdminName: Sir Usman");

    // ══════════════════════════════════════════════════════
    // 2. USERS (Owner + Staff + Partner)
    // ══════════════════════════════════════════════════════
    console.log("\n👑 Creating User accounts...");
    const owner = await User.create({
      userId: "OWNER-001",
      username: "admin",
      password: "admin123",
      fullName: "Sir Waqar Baig",
      role: "OWNER",
      permissions: [
        "dashboard", "admissions", "students", "teachers", "finance",
        "classes", "timetable", "sessions", "configuration", "users",
        "website", "payroll", "settlement", "gatekeeper", "frontdesk",
        "inquiries", "reports", "lectures",
      ],
      phone: "+92 300 1234567",
      isActive: true,
      canBeDeleted: false,
    });

    const staffUser = await User.create({
      userId: "STAFF-001",
      username: "staff",
      password: "staff123",
      fullName: "Ali Receptionist",
      role: "STAFF",
      permissions: ["dashboard", "admissions", "students", "finance", "inquiries", "frontdesk"],
      phone: "+92 300 9876543",
      isActive: true,
    });

    const partnerUser = await User.create({
      userId: "PARTNER-001",
      username: "zahid",
      password: "zahid123",
      fullName: "Zahid Ullah",
      role: "PARTNER",
      permissions: ["dashboard", "students", "finance", "payroll"],
      phone: "+92 301 1234567",
      isActive: true,
    });

    console.log("   admin / admin123 (OWNER)");
    console.log("   staff / staff123 (STAFF)");
    console.log("   zahid / zahid123 (PARTNER)");

    // ══════════════════════════════════════════════════════
    // 3. SESSION
    // ══════════════════════════════════════════════════════
    console.log("\n📅 Creating Session...");
    const session = await Session.create({
      sessionName: "MDCAT 2025-2026",
      description: "Full academic session for MDCAT preparation",
      startDate: new Date("2025-09-01"),
      endDate: new Date("2026-06-30"),
      status: "active",
    });
    console.log(`   ${session.sessionName} [${session.sessionId}]`);

    config.sessionPrices = [{
      sessionId: session._id,
      sessionName: session.sessionName,
      price: 25000,
      isActive: true,
    }];
    await config.save();

    // ══════════════════════════════════════════════════════
    // 4. CLASSES
    // ══════════════════════════════════════════════════════
    console.log("\n🎓 Creating Classes...");
    const class1 = await Class.create({
      classTitle: "1st Year Pre-Medical",
      gradeLevel: "11th Grade",
      group: "Pre-Medical",
      session: session._id,
      subjects: [
        { name: "Biology", fee: 4000 },
        { name: "Chemistry", fee: 4000 },
        { name: "Physics", fee: 3500 },
      ],
      baseFee: 11500,
      days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      startTime: "08:00",
      endTime: "12:00",
      shift: "Morning",
      maxCapacity: 40,
      status: "active",
    });

    const class2 = await Class.create({
      classTitle: "2nd Year Pre-Medical",
      gradeLevel: "12th Grade",
      group: "Pre-Medical",
      session: session._id,
      subjects: [
        { name: "Biology", fee: 4000 },
        { name: "Chemistry", fee: 4000 },
        { name: "Physics", fee: 3500 },
        { name: "English", fee: 2500 },
      ],
      baseFee: 14000,
      days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      startTime: "14:00",
      endTime: "18:00",
      shift: "Evening",
      maxCapacity: 35,
      status: "active",
    });

    const class3 = await Class.create({
      classTitle: "MDCAT Crash Course",
      gradeLevel: "MDCAT Prep",
      group: "Pre-Medical",
      session: session._id,
      subjects: [
        { name: "Biology", fee: 5000 },
        { name: "Chemistry", fee: 5000 },
        { name: "Physics", fee: 4000 },
        { name: "English", fee: 3000 },
      ],
      baseFee: 17000,
      days: ["Mon", "Wed", "Fri", "Sat"],
      startTime: "09:00",
      endTime: "13:00",
      shift: "Morning",
      maxCapacity: 50,
      status: "active",
    });

    console.log(`   ${class1.classTitle} [${class1.classId}] — PKR ${class1.baseFee}`);
    console.log(`   ${class2.classTitle} [${class2.classId}] — PKR ${class2.baseFee}`);
    console.log(`   ${class3.classTitle} [${class3.classId}] — PKR ${class3.baseFee}`);

    // ══════════════════════════════════════════════════════
    // 5. TEACHERS (6 active teachers)
    // ══════════════════════════════════════════════════════
    console.log("\n👨‍🏫 Creating Teachers...");
    const teacherDefs = [
      { name: "Dr. Ahmed Khan",   subject: "biology",     phone: "03001234567", compType: "percentage", tShare: 70, aShare: 30 },
      { name: "Prof. Fatima Ali",  subject: "chemistry",   phone: "03009876543", compType: "percentage", tShare: 70, aShare: 30 },
      { name: "Engr. Hassan Raza", subject: "physics",     phone: "03001112222", compType: "percentage", tShare: 65, aShare: 35 },
      { name: "Sir Bilal Shah",    subject: "mathematics", phone: "03003334444", compType: "fixed", fixedSalary: 30000 },
      { name: "Ms. Sana Tariq",    subject: "english",     phone: "03005556666", compType: "percentage", tShare: 60, aShare: 40 },
      { name: "Sir Zahid Ullah",   subject: "zoology",     phone: "03007778888", compType: "percentage", tShare: 70, aShare: 30 },
    ];

    const teachers = [];
    for (let i = 0; i < teacherDefs.length; i++) {
      const td = teacherDefs[i];
      const username = td.name.split(" ").pop().toLowerCase() + (1000 + i);

      const comp = { type: td.compType };
      if (td.compType === "percentage") {
        comp.teacherShare = td.tShare;
        comp.academyShare = td.aShare;
      } else {
        comp.fixedSalary = td.fixedSalary;
      }

      const teacher = await Teacher.create({
        name: td.name,
        phone: td.phone,
        subject: td.subject,
        status: "active",
        username,
        plainPassword: "teacher123",
        compensation: comp,
        balance: { floating: 0, verified: 0, pending: 0 },
        totalPaid: 0,
      });

      const teacherUser = await User.create({
        userId: `TCH-${String(i + 1).padStart(3, "0")}`,
        username,
        password: "teacher123",
        fullName: td.name,
        role: "TEACHER",
        permissions: ["dashboard", "lectures"],
        phone: td.phone,
        isActive: true,
        teacherId: teacher._id,
      });

      teacher.userId = teacherUser._id;
      await teacher.save();
      teachers.push(teacher);
      console.log(`   ${td.name} (${td.subject}) — ${username} / teacher123`);
    }

    // Assign teachers to classes
    class1.subjectTeachers = [
      { subject: "Biology", teacherId: teachers[0]._id, teacherName: teachers[0].name },
      { subject: "Chemistry", teacherId: teachers[1]._id, teacherName: teachers[1].name },
      { subject: "Physics", teacherId: teachers[2]._id, teacherName: teachers[2].name },
    ];
    await class1.save();

    class2.subjectTeachers = [
      { subject: "Biology", teacherId: teachers[0]._id, teacherName: teachers[0].name },
      { subject: "Chemistry", teacherId: teachers[1]._id, teacherName: teachers[1].name },
      { subject: "Physics", teacherId: teachers[2]._id, teacherName: teachers[2].name },
      { subject: "English", teacherId: teachers[4]._id, teacherName: teachers[4].name },
    ];
    await class2.save();

    class3.subjectTeachers = [
      { subject: "Biology", teacherId: teachers[0]._id, teacherName: teachers[0].name },
      { subject: "Chemistry", teacherId: teachers[1]._id, teacherName: teachers[1].name },
      { subject: "Physics", teacherId: teachers[2]._id, teacherName: teachers[2].name },
      { subject: "English", teacherId: teachers[4]._id, teacherName: teachers[4].name },
    ];
    await class3.save();

    // ══════════════════════════════════════════════════════
    // 6. STUDENTS (15 students across 3 classes)
    // ══════════════════════════════════════════════════════
    console.log("\n👨‍🎓 Creating Students...");
    const studentDefs = [
      // Class 1 — 1st Year (baseFee 11,500)
      { name: "Saifullah Khan",    father: "Muhammad Khan",    gender: "Male",   phone: "03001111111", cls: class1, paid: 11500 },
      { name: "Ayesha Malik",      father: "Malik Riaz",       gender: "Female", phone: "03002222222", cls: class1, paid: 8000 },
      { name: "Ali Hassan",        father: "Hassan Ahmed",     gender: "Male",   phone: "03003333333", cls: class1, paid: 11500 },
      { name: "Zainab Fatima",     father: "Muhammad Arif",    gender: "Female", phone: "03004444444", cls: class1, paid: 6000 },
      { name: "Rehan Siddiqui",    father: "Siddiqui Sahab",   gender: "Male",   phone: "03001122334", cls: class1, paid: 11500 },
      // Class 2 — 2nd Year (baseFee 14,000)
      { name: "Hamza Tariq",       father: "Tariq Mahmood",    gender: "Male",   phone: "03005555555", cls: class2, paid: 14000 },
      { name: "Sara Ahmed",        father: "Ahmed Ali",        gender: "Female", phone: "03006666666", cls: class2, paid: 14000 },
      { name: "Usman Khalid",      father: "Khalid Mehmood",   gender: "Male",   phone: "03007777777", cls: class2, paid: 10000 },
      { name: "Nadia Shah",        father: "Shah Alam",        gender: "Female", phone: "03001234999", cls: class2, paid: 14000 },
      { name: "Kamran Yousuf",     father: "Yousuf Khan",      gender: "Male",   phone: "03009991234", cls: class2, paid: 7000 },
      // Class 3 — MDCAT Crash (baseFee 17,000)
      { name: "Fahad Iqbal",       father: "Iqbal Hussain",    gender: "Male",   phone: "03008888888", cls: class3, paid: 17000 },
      { name: "Maria Noor",        father: "Noor Muhammad",    gender: "Female", phone: "03009999999", cls: class3, paid: 17000 },
      { name: "Bilal Ahmad",       father: "Ahmad Shah",       gender: "Male",   phone: "03001010101", cls: class3, paid: 12000 },
      { name: "Hina Bibi",         father: "Gul Rehman",       gender: "Female", phone: "03002020202", cls: class3, paid: 17000 },
      { name: "Waqas Ali",         father: "Ali Muhammad",     gender: "Male",   phone: "03003030303", cls: class3, paid: 10000 },
    ];

    const students = [];
    for (let i = 0; i < studentDefs.length; i++) {
      const sd = studentDefs[i];
      // Admission dates spread across Jan, Feb, and early March
      const admDate = i < 5 ? monthDay(2, 5 + i * 3) : (i < 10 ? monthDay(1, 3 + i * 2) : thisMonthDay(1 + (i - 10)));

      const student = await Student.create({
        studentName: sd.name,
        fatherName: sd.father,
        gender: sd.gender,
        class: sd.cls.classTitle,
        group: sd.cls.group,
        parentCell: sd.phone,
        totalFee: sd.cls.baseFee,
        paidAmount: sd.paid,
        classRef: sd.cls._id,
        sessionRef: session._id,
        subjects: sd.cls.subjects,
        admissionDate: admDate,
        studentStatus: "Active",
        status: "active",
        referralSource: ["Facebook Ad", "Friend Referral", "Walk-in", "Google Search"][i % 4],
      });
      students.push(student);
    }
    console.log(`   Created ${students.length} students across 3 classes`);

    // ══════════════════════════════════════════════════════
    // 7. FEE RECORDS + INCOME TRANSACTIONS
    //    (All INCOME with status VERIFIED, spread across months)
    // ══════════════════════════════════════════════════════
    console.log("\n💰 Creating Fee Records & Income Transactions...");
    let totalIncome = 0;
    let feeSeqCounter = 1; // Sequential counter to avoid receiptNumber collision

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      if (student.paidAmount <= 0) continue;

      // Split payments into per-subject FeeRecords with teacher splits
      const subjectCount = student.subjects?.length || 1;
      const perSubjectAmount = Math.round(student.paidAmount / subjectCount);
      const cls = studentDefs[i].cls;
      const subjectTeachers = cls.subjectTeachers || [];

      // Determine date — first 5 students in Jan, next 5 in Feb, last 5 in March
      const feeDate = i < 5 ? monthDay(2, 8 + i) : (i < 10 ? monthDay(1, 5 + i) : thisMonthDay(2 + (i - 10)));
      const feeMonth = i < 5 ? prevMonthName(2) : (i < 10 ? prevMonthName(1) : thisMonth);

      for (let j = 0; j < subjectCount; j++) {
        const subjectName = student.subjects[j]?.name || "Tuition";
        const subjectFee = student.subjects[j]?.fee || perSubjectAmount;
        const actualAmount = Math.min(subjectFee, perSubjectAmount);

        // Find the teacher for this subject
        const st = subjectTeachers.find(t => t.subject === subjectName);
        const teacherIdx = teachers.findIndex(t => t._id.toString() === st?.teacherId?.toString());
        const teacher = teacherIdx >= 0 ? teachers[teacherIdx] : null;

        const tShare = teacher?.compensation?.type === "percentage" ? (teacher.compensation.teacherShare || 70) : 0;
        const aShare = teacher?.compensation?.type === "percentage" ? (teacher.compensation.academyShare || 30) : 100;
        const teacherAmount = Math.round(actualAmount * tShare / 100);
        const academyAmount = actualAmount - teacherAmount;

        await FeeRecord.create({
          student: student._id,
          studentName: student.studentName,
          class: cls._id,
          className: cls.classTitle,
          subject: subjectName,
          amount: actualAmount,
          month: feeMonth,
          status: "PAID",
          collectedBy: owner._id,
          collectedByName: owner.fullName,
          paymentMethod: "CASH",
          teacher: teacher?._id,
          teacherName: teacher?.name,
          receiptNumber: `FEE-SEED-${String(feeSeqCounter++).padStart(4, "0")}`,
          splitBreakdown: {
            teacherShare: teacherAmount,
            academyShare: academyAmount,
            teacherPercentage: tShare,
            academyPercentage: aShare,
          },
          notes: `${student.studentName} — ${subjectName} fee (${feeMonth})`,
          revenueSource: "standard-split",
        });
      }

      // Create ONE income transaction per student (total amount)
      await Transaction.create({
        type: "INCOME",
        category: "Tuition",
        amount: student.paidAmount,
        description: `Fee payment: ${student.studentName} (${student.studentId}) — ${student.class}`,
        date: feeDate,
        collectedBy: owner._id,
        status: "VERIFIED",
        studentId: student._id,
      });

      totalIncome += student.paidAmount;
    }
    console.log(`   Total fee income: PKR ${totalIncome.toLocaleString()} (${students.length} students)`);

    // ══════════════════════════════════════════════════════
    // 8. TEACHER CREDIT TRANSACTIONS (LIABILITY type)
    //    These represent what the academy owes each teacher
    //    Spread across Jan, Feb, and March for realistic history
    // ══════════════════════════════════════════════════════
    console.log("\n📋 Crediting teacher balances (payroll liabilities)...");

    // January credits (already partially paid out)
    const janCredits = [
      { teacher: teachers[0], amount: 20000, desc: "Biology classes Jan share" },
      { teacher: teachers[1], amount: 18000, desc: "Chemistry classes Jan share" },
      { teacher: teachers[2], amount: 14000, desc: "Physics classes Jan share" },
      { teacher: teachers[3], amount: 30000, desc: "Mathematics Jan fixed salary" },
      { teacher: teachers[4], amount: 7000,  desc: "English classes Jan share" },
      { teacher: teachers[5], amount: 10000, desc: "Zoology sessions Jan share" },
    ];

    // February credits
    const febCredits = [
      { teacher: teachers[0], amount: 24000, desc: "Biology classes Feb share" },
      { teacher: teachers[1], amount: 22000, desc: "Chemistry classes Feb share" },
      { teacher: teachers[2], amount: 16000, desc: "Physics classes Feb share" },
      { teacher: teachers[3], amount: 30000, desc: "Mathematics Feb fixed salary" },
      { teacher: teachers[4], amount: 8000,  desc: "English classes Feb share" },
      { teacher: teachers[5], amount: 11000, desc: "Zoology sessions Feb share" },
    ];

    // March credits (current month, partial)
    const marCredits = [
      { teacher: teachers[0], amount: 12000, desc: "Biology classes Mar share (so far)" },
      { teacher: teachers[1], amount: 10000, desc: "Chemistry classes Mar share (so far)" },
      { teacher: teachers[2], amount: 8000,  desc: "Physics classes Mar share (so far)" },
      { teacher: teachers[3], amount: 15000, desc: "Mathematics Mar accrual (half month)" },
      { teacher: teachers[4], amount: 4000,  desc: "English classes Mar share (so far)" },
      { teacher: teachers[5], amount: 6000,  desc: "Zoology sessions Mar share (so far)" },
    ];

    // Create all credit transactions and update teacher balances
    async function applyCredits(credits, monthsAgo, day) {
      for (const c of credits) {
        c.teacher.balance.pending += c.amount;
        await c.teacher.save();

        await Transaction.create({
          type: "LIABILITY",
          category: "Payroll_Credit",
          amount: c.amount,
          description: `${c.desc} — ${c.teacher.name}`,
          date: monthsAgo >= 0 ? monthDay(monthsAgo, day) : thisMonthDay(day),
          collectedBy: owner._id,
          status: "VERIFIED",
          splitDetails: {
            teacherId: c.teacher._id,
            teacherName: c.teacher.name,
            teacherShare: c.amount,
          },
        });
      }
    }

    await applyCredits(janCredits, 2, 28);   // Jan 28
    await applyCredits(febCredits, 1, 27);   // Feb 27
    await applyCredits(marCredits, 0, 8);    // Mar 8

    console.log("   Credits applied for Jan, Feb, Mar");

    // ══════════════════════════════════════════════════════
    // 9. TEACHER PAYOUTS — Past payments (reduces pending balance)
    //    Creates TeacherPayment records + EXPENSE transactions
    // ══════════════════════════════════════════════════════
    console.log("\n💸 Creating past teacher payouts...");

    const payouts = [
      // January payouts
      { teacher: teachers[0], amount: 20000, month: prevMonthName(2), date: monthDay(2, 30), notes: "January full salary payout" },
      { teacher: teachers[1], amount: 18000, month: prevMonthName(2), date: monthDay(2, 30), notes: "January full salary payout" },
      { teacher: teachers[2], amount: 14000, month: prevMonthName(2), date: monthDay(2, 30), notes: "January full salary payout" },
      { teacher: teachers[3], amount: 30000, month: prevMonthName(2), date: monthDay(2, 30), notes: "January fixed salary payout" },
      { teacher: teachers[4], amount: 7000,  month: prevMonthName(2), date: monthDay(2, 30), notes: "January full salary payout" },
      { teacher: teachers[5], amount: 10000, month: prevMonthName(2), date: monthDay(2, 30), notes: "January full salary payout" },
      // February partial payouts
      { teacher: teachers[0], amount: 15000, month: prevMonthName(1), date: monthDay(1, 28), notes: "February partial payout" },
      { teacher: teachers[1], amount: 12000, month: prevMonthName(1), date: monthDay(1, 28), notes: "February partial payout" },
      { teacher: teachers[2], amount: 10000, month: prevMonthName(1), date: monthDay(1, 28), notes: "February partial salary" },
      { teacher: teachers[3], amount: 20000, month: prevMonthName(1), date: monthDay(1, 28), notes: "February partial salary" },
    ];

    let totalPaidOut = 0;
    for (const p of payouts) {
      p.teacher.balance.pending -= p.amount;
      p.teacher.totalPaid += p.amount;
      await p.teacher.save();

      await TeacherPayment.create({
        teacherId: p.teacher._id,
        teacherName: p.teacher.name,
        subject: p.teacher.subject,
        amountPaid: p.amount,
        compensationType: p.teacher.compensation.type,
        month: p.month,
        year: thisYear,
        sessionId: session._id,
        sessionName: session.sessionName,
        paymentMethod: "cash",
        status: "paid",
        notes: p.notes,
        paymentDate: p.date,
      });

      await Transaction.create({
        type: "EXPENSE",
        category: "Teacher Payout",
        amount: p.amount,
        description: `Teacher Payout: ${p.teacher.name} (${p.teacher.subject}) — ${p.month}`,
        date: p.date,
        collectedBy: owner._id,
        status: "VERIFIED",
        splitDetails: {
          teacherId: p.teacher._id,
          teacherName: p.teacher.name,
        },
      });

      totalPaidOut += p.amount;
    }
    console.log(`   Total paid out: PKR ${totalPaidOut.toLocaleString()} across ${payouts.length} payouts`);

    // ══════════════════════════════════════════════════════
    // 10. OPERATIONAL EXPENSES (across months)
    // ══════════════════════════════════════════════════════
    console.log("\n🧾 Creating Expenses...");
    const expenseDefs = [
      // January
      { title: "Electricity Bill — Jan", category: "Electricity Bill", amount: 7500, vendor: "PESCO", date: monthDay(2, 15) },
      { title: "Generator Fuel — Jan", category: "Generator Fuel", amount: 5000, vendor: "PSO Station", date: monthDay(2, 20) },
      // February
      { title: "Electricity Bill — Feb", category: "Electricity Bill", amount: 8500, vendor: "PESCO", date: monthDay(1, 12) },
      { title: "Staff Tea — Feb", category: "Staff Tea & Refreshments", amount: 4500, vendor: "Local Cafe", date: monthDay(1, 10) },
      { title: "Stationery — Feb", category: "Stationery", amount: 2200, vendor: "Islamia Stationers", date: monthDay(1, 18) },
      { title: "Generator Fuel — Feb", category: "Generator Fuel", amount: 6000, vendor: "PSO Station", date: monthDay(1, 22) },
      // March (current month)
      { title: "Electricity Bill — Mar", category: "Electricity Bill", amount: 9000, vendor: "PESCO", date: thisMonthDay(5) },
      { title: "Staff Tea & Snacks — Mar", category: "Staff Tea & Refreshments", amount: 3500, vendor: "Local Cafe", date: thisMonthDay(3) },
      { title: "Whiteboard Markers", category: "Stationery", amount: 1800, vendor: "ABC Store", date: thisMonthDay(7) },
    ];

    let totalExpenses = 0;
    let marchExpenses = 0;
    for (const exp of expenseDefs) {
      await Expense.create({
        title: exp.title,
        category: exp.category,
        amount: exp.amount,
        vendorName: exp.vendor,
        expenseDate: exp.date,
        status: "paid",
        description: exp.title,
      });

      await Transaction.create({
        type: "EXPENSE",
        category: exp.category,
        amount: exp.amount,
        description: `Expense: ${exp.title}`,
        date: exp.date,
        collectedBy: owner._id,
        status: "VERIFIED",
      });

      totalExpenses += exp.amount;
      // Track march expenses for verification
      if (exp.date >= new Date(thisYear, thisMonthIdx, 1)) {
        marchExpenses += exp.amount;
      }
    }
    console.log(`   Total expenses: PKR ${totalExpenses.toLocaleString()} (March: PKR ${marchExpenses.toLocaleString()})`);

    // ══════════════════════════════════════════════════════
    // 11. NOTIFICATIONS
    // ══════════════════════════════════════════════════════
    console.log("\n🔔 Creating Notifications...");
    const notifDefs = [
      { msg: "💰 Dr. Ahmed Khan received PKR 15,000 (Feb payout)", type: "FINANCE" },
      { msg: "💰 Prof. Fatima Ali received PKR 12,000 (Feb payout)", type: "FINANCE" },
      { msg: "🎓 New student enrolled: Fahad Iqbal (MDCAT Crash Course)", type: "SYSTEM" },
      { msg: "🎓 New student enrolled: Maria Noor (MDCAT Crash Course)", type: "SYSTEM" },
      { msg: "⚡ Electricity Bill paid: PKR 9,000 (March)", type: "FINANCE" },
      { msg: "📊 February payroll completed — 6 teachers paid", type: "SYSTEM" },
    ];
    for (const n of notifDefs) {
      await Notification.create({
        recipient: owner._id,
        recipientRole: "OWNER",
        message: n.msg,
        type: n.type,
      });
    }
    console.log(`   ${notifDefs.length} notifications created`);

    // ══════════════════════════════════════════════════════
    // VERIFICATION REPORT
    // ══════════════════════════════════════════════════════
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 FINAL VERIFICATION REPORT");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Reload teachers to get final balances
    const finalTeachers = await Teacher.find({ status: "active" }).select("name subject balance totalPaid compensation");

    console.log("\n👨‍🏫 PAYROLL STATUS:");
    let totalLiability = 0;
    let teachersPayable = 0;
    let totalEarnedAll = 0;
    let totalWithdrawnAll = 0;
    for (const t of finalTeachers) {
      const pending = t.balance?.pending || 0;
      const paid = t.totalPaid || 0;
      const earned = pending + paid; // Total ever credited
      totalLiability += pending;
      totalEarnedAll += earned;
      totalWithdrawnAll += paid;
      if (pending > 0) teachersPayable++;
      console.log(`   ${t.name} (${t.subject}): Earned PKR ${earned.toLocaleString()} | Paid PKR ${paid.toLocaleString()} | Net Payable PKR ${pending.toLocaleString()}`);
    }

    // Calculate March income for dashboard verification
    const marchStart = new Date(thisYear, thisMonthIdx, 1);
    const marchIncomeTxns = await Transaction.find({ type: "INCOME", date: { $gte: marchStart } });
    const marchIncomeTotal = marchIncomeTxns.reduce((s, t) => s + t.amount, 0);
    const marchExpenseTxns = await Transaction.find({ type: "EXPENSE", date: { $gte: marchStart } });
    const marchExpenseTotal = marchExpenseTxns.reduce((s, t) => s + t.amount, 0);

    const totalStudentsCount = await Student.countDocuments();
    const totalTeachersCount = await Teacher.countDocuments({ status: "active" });
    const totalUsersCount = await User.countDocuments();
    const totalTxnCount = await Transaction.countDocuments();
    const totalFeeCount = await FeeRecord.countDocuments();
    const totalPaymentCount = await TeacherPayment.countDocuments();

    console.log(`\n📈 DASHBOARD EXPECTATIONS:`);
    console.log(`   NET REVENUE (March):    PKR ${(marchIncomeTotal - marchExpenseTotal).toLocaleString()} (Income ${marchIncomeTotal.toLocaleString()} - Expenses ${marchExpenseTotal.toLocaleString()})`);
    console.log(`   TODAY'S REVENUE:        PKR 0 (all fees dated in past)`);
    console.log(`   TOTAL STUDENTS:         ${totalStudentsCount}`);
    console.log(`   TOTAL TEACHERS:         ${totalTeachersCount}`);

    console.log(`\n💰 PAYROLL EXPECTATIONS:`);
    console.log(`   Total Liability:        PKR ${totalLiability.toLocaleString()}`);
    console.log(`   Paid This Session:      PKR ${totalPaidOut.toLocaleString()}`);
    console.log(`   Teachers w/ Payable:    ${teachersPayable}`);

    console.log(`\n🗄️  COLLECTION COUNTS:`);
    console.log(`   Students:      ${totalStudentsCount}`);
    console.log(`   Teachers:      ${totalTeachersCount}`);
    console.log(`   Users:         ${totalUsersCount}`);
    console.log(`   Transactions:  ${totalTxnCount}`);
    console.log(`   Fee Records:   ${totalFeeCount}`);
    console.log(`   Payments:      ${totalPaymentCount}`);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔐 LOGIN CREDENTIALS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   Owner:    admin / admin123");
    console.log("   Staff:    staff / staff123");
    console.log("   Partner:  zahid / zahid123");
    console.log("   Teachers: khan1000, ali1001, raza1002, shah1003, tariq1004, ullah1005 / teacher123");
    console.log("\n✅ MEGA SEED COMPLETE! Backend server will auto-restart via nodemon.");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ SEED FAILED:", error);
    process.exit(1);
  }
}

main();
