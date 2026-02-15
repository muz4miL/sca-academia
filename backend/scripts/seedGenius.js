/**
 * ================================================================
 * SCIENCES COACHING ACADEMY — Master Seed Script (Single-Owner Edition)
 * ================================================================
 * Populates the database with realistic test data:
 *   1 Owner (admin)
 *   3 Teachers (Physics, Chemistry, Math) — 70% share
 *   1 Session (2025–2026)
 *   2 Classes (10th Medical, 12th Engineering)
 *   5 Students assigned to those classes
 *   1 Configuration (academy share defaults)
 *   10 Fee Payments (~200k total, with verified transactions)
 *   5 Expenses (~50k total)
 *   3 Timetable entries for 10th Medical
 * ================================================================
 * Usage:  node backend/scripts/seedSCA.js
 * ================================================================
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

// ── Models ──────────────────────────────────────────────────────
const User = require("../models/User");
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const Class = require("../models/Class");
const Session = require("../models/Session");
const Configuration = require("../models/Configuration");
const Transaction = require("../models/Transaction");
const FeeRecord = require("../models/FeeRecord");
const Expense = require("../models/Expense");
const Timetable = require("../models/Timetable");
const Notification = require("../models/Notification");

// ── Config ──────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sca-academia";

// ── Helpers ─────────────────────────────────────────────────────
const log = (emoji, msg) => console.log(`${emoji}  ${msg}`);

async function clearDatabase() {
  log("🗑️", "Clearing existing data...");
  await Promise.all([
    User.deleteMany({}),
    Teacher.deleteMany({}),
    Student.deleteMany({}),
    Class.deleteMany({}),
    Session.deleteMany({}),
    Configuration.deleteMany({}),
    Transaction.deleteMany({}),
    FeeRecord.deleteMany({}),
    Expense.deleteMany({}),
    Timetable.deleteMany({}),
    Notification.deleteMany({}),
  ]);
  log("✅", "Database cleared.");
}

// ── MAIN SEED FUNCTION ──────────────────────────────────────────
async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    log("📡", `Connected to MongoDB: ${MONGO_URI}`);

    await clearDatabase();

    // ════════════════════════════════════════════════════════════
    // 1. CONFIGURATION
    // ════════════════════════════════════════════════════════════
    log("⚙️", "Creating Configuration...");
    const config = new Configuration({
      academyName: "SCIENCES COACHING ACADEMY",
      salaryConfig: {
        teacherShare: 70,
        academyShare: 30,
      },
      defaultSubjectFees: [
        { name: "Physics", fee: 5000 },
        { name: "Chemistry", fee: 5000 },
        { name: "Mathematics", fee: 5000 },
        { name: "Biology", fee: 4000 },
        { name: "English", fee: 3000 },
      ],
    });
    await config.save();

    // ════════════════════════════════════════════════════════════
    // 2. SESSION (Academic Year 2025–2026)
    // ════════════════════════════════════════════════════════════
    log("📅", "Creating Session...");
    const session = await Session.create({
      sessionName: "Academic Year 2025-2026",
      description: "Main academic session for SCIENCES COACHING ACADEMY",
      startDate: new Date("2025-04-01"),
      endDate: new Date("2026-03-31"),
    });

    // ════════════════════════════════════════════════════════════
    // 3. OWNER (Admin User)
    // ════════════════════════════════════════════════════════════
    log("👑", "Creating Owner...");
    const ownerUser = await User.create({
      userId: "USR-OWNER-001",
      username: "admin",
      password: "admin123",
      fullName: "Academy Owner",
      role: "OWNER",
      permissions: [
        "dashboard", "admissions", "students", "teachers", "finance",
        "classes", "timetable", "sessions", "configuration", "users",
        "website", "payroll", "settlement", "gatekeeper", "frontdesk",
        "inquiries", "reports", "lectures",
      ],
      isActive: true,
      canBeDeleted: false,
    });

    // ════════════════════════════════════════════════════════════
    // 4. TEACHERS (3 teachers with 70% share)
    // ════════════════════════════════════════════════════════════
    log("🧑‍🏫", "Creating Teachers...");

    const teacherData = [
      { name: "Sir Ahmad Khan", phone: "03001234567", subject: "physics", username: "ahmad.khan" },
      { name: "Sir Bilal Raza", phone: "03009876543", subject: "chemistry", username: "bilal.raza" },
      { name: "Sir Kamran Ali", phone: "03005556667", subject: "mathematics", username: "kamran.ali" },
    ];

    const teachers = [];
    const teacherUsers = [];

    for (const td of teacherData) {
      // Create Teacher doc first
      const teacher = await Teacher.create({
        name: td.name,
        phone: td.phone,
        subject: td.subject,
        joiningDate: new Date("2025-04-01"),
        status: "active",
        username: td.username,
        plainPassword: "teacher123",
        compensation: {
          type: "percentage",
          teacherShare: 70,
          academyShare: 30,
        },
        balance: { floating: 0, verified: 0, pending: 0 },
        totalPaid: 0,
      });

      // Create linked User for teacher login
      const teacherUser = await User.create({
        userId: `USR-TCH-${teacher._id.toString().slice(-4)}`,
        username: td.username,
        password: "teacher123",
        fullName: td.name,
        role: "TEACHER",
        permissions: ["dashboard", "timetable", "students"],
        isActive: true,
        teacherId: teacher._id,
      });

      // Back-link
      teacher.userId = teacherUser._id;
      await teacher.save();

      teachers.push(teacher);
      teacherUsers.push(teacherUser);
      log("  ✅", `${td.name} (${td.subject}) — login: ${td.username} / teacher123`);
    }

    const [physicsTeacher, chemistryTeacher, mathTeacher] = teachers;

    // ════════════════════════════════════════════════════════════
    // 5. CLASSES (2 classes)
    // ════════════════════════════════════════════════════════════
    log("🏫", "Creating Classes...");

    const class10th = await Class.create({
      classTitle: "10th Grade Medical",
      gradeLevel: "10th Grade",
      sessionType: "regular",
      group: "Pre-Medical",
      shift: "Morning",
      session: session._id,
      days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      startTime: "09:00",
      endTime: "13:00",
      roomNumber: "Room A1",
      maxCapacity: 30,
      enrolledCount: 0,
      assignedTeacher: physicsTeacher._id,
      teacherName: physicsTeacher.name,
      subjects: [
        { name: "Physics", fee: 5000 },
        { name: "Chemistry", fee: 5000 },
        { name: "Biology", fee: 4000 },
        { name: "English", fee: 3000 },
      ],
      baseFee: 5000,
      revenueMode: "standard",
    });

    const class12th = await Class.create({
      classTitle: "12th Grade Engineering",
      gradeLevel: "12th Grade",
      sessionType: "regular",
      group: "Pre-Engineering",
      shift: "Evening",
      session: session._id,
      days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      startTime: "14:00",
      endTime: "18:00",
      roomNumber: "Room B2",
      maxCapacity: 25,
      enrolledCount: 0,
      assignedTeacher: mathTeacher._id,
      teacherName: mathTeacher.name,
      subjects: [
        { name: "Physics", fee: 6000 },
        { name: "Chemistry", fee: 6000 },
        { name: "Mathematics", fee: 6000 },
      ],
      baseFee: 6000,
      revenueMode: "standard",
    });

    log("  ✅", `${class10th.classTitle} (classId: ${class10th.classId})`);
    log("  ✅", `${class12th.classTitle} (classId: ${class12th.classId})`);

    // ════════════════════════════════════════════════════════════
    // 6. STUDENTS (5 students)
    // ════════════════════════════════════════════════════════════
    log("🎒", "Creating Students...");

    const studentData = [
      // 3 in 10th Medical
      {
        studentName: "Ali Hassan", fatherName: "Hassan Khan", class: class10th.classTitle,
        group: "Pre-Medical", gender: "Male", parentCell: "03111111111", studentCell: "03211111111",
        email: "ali.hassan@student.sca.edu.pk", address: "Islamabad",
        classRef: class10th._id, assignedTeacher: physicsTeacher._id, assignedTeacherName: physicsTeacher.name,
        subjects: [{ name: "Physics", fee: 5000 }, { name: "Chemistry", fee: 5000 }, { name: "Biology", fee: 4000 }],
        totalFee: 14000, paidAmount: 0,
      },
      {
        studentName: "Fatima Noor", fatherName: "Noor Muhammad", class: class10th.classTitle,
        group: "Pre-Medical", gender: "Female", parentCell: "03122222222", studentCell: "03222222222",
        email: "fatima.noor@student.sca.edu.pk", address: "Rawalpindi",
        classRef: class10th._id, assignedTeacher: physicsTeacher._id, assignedTeacherName: physicsTeacher.name,
        subjects: [{ name: "Physics", fee: 5000 }, { name: "Chemistry", fee: 5000 }, { name: "English", fee: 3000 }],
        totalFee: 13000, paidAmount: 0,
      },
      {
        studentName: "Usman Tariq", fatherName: "Tariq Mehmood", class: class10th.classTitle,
        group: "Pre-Medical", gender: "Male", parentCell: "03133333333", studentCell: "03233333333",
        email: "usman.tariq@student.sca.edu.pk", address: "Peshawar",
        classRef: class10th._id, assignedTeacher: chemistryTeacher._id, assignedTeacherName: chemistryTeacher.name,
        subjects: [{ name: "Physics", fee: 5000 }, { name: "Chemistry", fee: 5000 }, { name: "Biology", fee: 4000 }, { name: "English", fee: 3000 }],
        totalFee: 17000, paidAmount: 0,
      },
      // 2 in 12th Engineering
      {
        studentName: "Sara Ahmed", fatherName: "Ahmed Malik", class: class12th.classTitle,
        group: "Pre-Engineering", gender: "Female", parentCell: "03144444444", studentCell: "03244444444",
        email: "sara.ahmed@student.sca.edu.pk", address: "Lahore",
        classRef: class12th._id, assignedTeacher: mathTeacher._id, assignedTeacherName: mathTeacher.name,
        subjects: [{ name: "Physics", fee: 6000 }, { name: "Mathematics", fee: 6000 }],
        totalFee: 12000, paidAmount: 0,
      },
      {
        studentName: "Hamza Sheikh", fatherName: "Sheikh Rashid", class: class12th.classTitle,
        group: "Pre-Engineering", gender: "Male", parentCell: "03155555555", studentCell: "03255555555",
        email: "hamza.sheikh@student.sca.edu.pk", address: "Karachi",
        classRef: class12th._id, assignedTeacher: mathTeacher._id, assignedTeacherName: mathTeacher.name,
        subjects: [{ name: "Physics", fee: 6000 }, { name: "Chemistry", fee: 6000 }, { name: "Mathematics", fee: 6000 }],
        totalFee: 18000, paidAmount: 0,
      },
    ];

    const students = [];
    for (const sd of studentData) {
      const student = await Student.create({
        ...sd,
        sessionRef: session._id,
        admissionDate: new Date("2025-04-15"),
        status: "active",
        feeStatus: "pending",
        password: "student123",
        plainPassword: "student123",
      });
      students.push(student);
      log("  ✅", `${student.studentName} (ID: ${student.studentId}) — ${sd.class}`);
    }

    // Update class enrolledCount
    class10th.enrolledCount = 3;
    class12th.enrolledCount = 2;
    await class10th.save();
    await class12th.save();

    // ════════════════════════════════════════════════════════════
    // 7. FEE PAYMENTS (10 payments, ~200k total)
    // ════════════════════════════════════════════════════════════
    log("💰", "Recording Fee Payments...");

    // Each payment: student, amount, month, teacher, and the 70/30 split
    const feePayments = [
      // Ali Hassan — 3 payments
      { student: students[0], amount: 14000, month: "2025-05", teacher: physicsTeacher, subject: "Physics" },
      { student: students[0], amount: 14000, month: "2025-06", teacher: physicsTeacher, subject: "Physics" },
      { student: students[0], amount: 14000, month: "2025-07", teacher: physicsTeacher, subject: "Physics" },
      // Fatima Noor — 2 payments
      { student: students[1], amount: 13000, month: "2025-05", teacher: chemistryTeacher, subject: "Chemistry" },
      { student: students[1], amount: 13000, month: "2025-06", teacher: chemistryTeacher, subject: "Chemistry" },
      // Usman Tariq — 2 payments
      { student: students[2], amount: 17000, month: "2025-05", teacher: chemistryTeacher, subject: "Chemistry" },
      { student: students[2], amount: 17000, month: "2025-06", teacher: chemistryTeacher, subject: "Chemistry" },
      // Sara Ahmed — 2 payments
      { student: students[3], amount: 12000, month: "2025-05", teacher: mathTeacher, subject: "Mathematics" },
      { student: students[3], amount: 12000, month: "2025-06", teacher: mathTeacher, subject: "Mathematics" },
      // Hamza Sheikh — 1 payment
      { student: students[4], amount: 18000, month: "2025-05", teacher: mathTeacher, subject: "Mathematics" },
    ];

    let totalFeeCollected = 0;

    for (const fp of feePayments) {
      const teacherShare = Math.round(fp.amount * 0.70);
      const academyShare = fp.amount - teacherShare;

      // Create FeeRecord
      await FeeRecord.create({
        student: fp.student._id,
        studentName: fp.student.studentName,
        className: fp.student.class,
        subject: fp.subject,
        amount: fp.amount,
        month: fp.month,
        status: "PAID",
        collectedBy: ownerUser._id,
        collectedByName: ownerUser.fullName,
        teacher: fp.teacher._id,
        teacherName: fp.teacher.name,
        isPartnerTeacher: false,
        revenueSource: "standard-split",
        splitBreakdown: {
          teacherShare,
          academyShare,
          teacherPercentage: 70,
          academyPercentage: 30,
        },
        paymentMethod: "CASH",
      });

      // Create Transaction (VERIFIED — already closing-verified for seed realism)
      await Transaction.create({
        type: "INCOME",
        category: "Tuition",
        stream: "STAFF_TUITION",
        amount: fp.amount,
        description: `Fee: ${fp.student.studentName} — ${fp.month} (${fp.subject})`,
        collectedBy: ownerUser._id,
        status: "VERIFIED",
        studentId: fp.student._id,
        date: new Date(`${fp.month}-15`),
        splitDetails: {
          teacherShare,
          academyShare,
          teacherPercentage: 70,
          academyPercentage: 30,
          teacherId: fp.teacher._id,
          teacherName: fp.teacher.name,
        },
      });

      // Credit teacher's verified balance
      fp.teacher.balance.verified += teacherShare;
      totalFeeCollected += fp.amount;

      // Update student paid amount
      fp.student.paidAmount += fp.amount;
    }

    // Save updated teacher balances
    for (const t of teachers) {
      await t.save();
    }

    // Save updated student paid amounts & fee statuses
    for (const s of students) {
      if (s.paidAmount >= s.totalFee) {
        s.feeStatus = "paid";
      } else if (s.paidAmount > 0) {
        s.feeStatus = "partial";
      }
      await s.save();
    }

    log("  ✅", `10 fee payments recorded — Total: PKR ${totalFeeCollected.toLocaleString()}`);

    // Teacher balance summary
    for (const t of teachers) {
      log("  💵", `${t.name}: Verified Balance = PKR ${t.balance.verified.toLocaleString()}`);
    }

    // ════════════════════════════════════════════════════════════
    // 8. EXPENSES (5 expenses, ~50k total)
    // ════════════════════════════════════════════════════════════
    log("🧾", "Creating Expenses...");

    const expenseData = [
      {
        title: "Generator Diesel — May", category: "Generator Fuel",
        amount: 12000, vendorName: "Shell Fuel Station",
        expenseDate: new Date("2025-05-10"), dueDate: new Date("2025-05-15"),
        status: "paid", paidDate: new Date("2025-05-10"),
      },
      {
        title: "Monthly Rent — May", category: "Rent",
        amount: 20000, vendorName: "Building Owner",
        expenseDate: new Date("2025-05-01"), dueDate: new Date("2025-05-05"),
        status: "paid", paidDate: new Date("2025-05-01"),
      },
      {
        title: "Staff Tea & Snacks — May", category: "Staff Tea & Refreshments",
        amount: 3500, vendorName: "Local Canteen",
        expenseDate: new Date("2025-05-20"), dueDate: new Date("2025-05-25"),
        status: "paid", paidDate: new Date("2025-05-20"),
      },
      {
        title: "Generator Diesel — June", category: "Generator Fuel",
        amount: 8000, vendorName: "Shell Fuel Station",
        expenseDate: new Date("2025-06-10"), dueDate: new Date("2025-06-15"),
        status: "paid", paidDate: new Date("2025-06-10"),
      },
      {
        title: "Electricity Bill — May", category: "Electricity Bill",
        amount: 7500, vendorName: "WAPDA",
        expenseDate: new Date("2025-05-28"), dueDate: new Date("2025-06-05"),
        status: "pending",
      },
    ];

    let totalExpenses = 0;
    for (const ed of expenseData) {
      await Expense.create({
        ...ed,
        paidByType: "ACADEMY_CASH",
        paidBy: ownerUser._id,
      });

      // Also record paid expenses as EXPENSE transactions
      if (ed.status === "paid") {
        await Transaction.create({
          type: "EXPENSE",
          category: "Miscellaneous",
          stream: "ACADEMY_POOL",
          amount: ed.amount,
          description: ed.title,
          collectedBy: ownerUser._id,
          status: "VERIFIED",
          date: ed.expenseDate,
        });
      }

      totalExpenses += ed.amount;
    }

    log("  ✅", `5 expenses created — Total: PKR ${totalExpenses.toLocaleString()}`);

    // ════════════════════════════════════════════════════════════
    // 9. TIMETABLE (3 entries for 10th Medical)
    // ════════════════════════════════════════════════════════════
    log("📅", "Creating Timetable Entries...");

    const timetableEntries = [
      {
        classId: class10th._id,
        teacherId: mathTeacher._id,
        subject: "Mathematics",
        day: "Monday",
        startTime: "09:00 AM",
        endTime: "10:30 AM",
        room: "Room A1",
        status: "active",
      },
      {
        classId: class10th._id,
        teacherId: physicsTeacher._id,
        subject: "Physics",
        day: "Tuesday",
        startTime: "10:00 AM",
        endTime: "11:30 AM",
        room: "Room A1",
        status: "active",
      },
      {
        classId: class10th._id,
        teacherId: chemistryTeacher._id,
        subject: "Chemistry",
        day: "Wednesday",
        startTime: "11:00 AM",
        endTime: "12:30 PM",
        room: "Room A1",
        status: "active",
      },
    ];

    for (const te of timetableEntries) {
      const entry = await Timetable.create(te);
      log("  ✅", `${te.day} ${te.startTime}–${te.endTime} → ${te.subject} (${te.room})`);
    }

    // ════════════════════════════════════════════════════════════
    // SUMMARY
    // ════════════════════════════════════════════════════════════
    console.log("\n" + "═".repeat(60));
    log("🎉", "SCIENCES COACHING ACADEMY SEED COMPLETE!");
    console.log("═".repeat(60));
    console.log(`
    📊 Summary:
    ├── 1 Owner         → admin / admin123
    ├── 3 Teachers      → ahmad.khan, bilal.raza, kamran.ali / teacher123
    ├── 1 Session       → Academic Year 2025-2026
    ├── 2 Classes       → 10th Grade Medical, 12th Grade Engineering
    ├── 5 Students      → 3 in 10th, 2 in 12th (password: student123)
    ├── 10 Fee Payments → PKR ${totalFeeCollected.toLocaleString()} total
    ├── 5 Expenses      → PKR ${totalExpenses.toLocaleString()} total
    ├── 3 Timetable     → Mon/Tue/Wed for 10th Medical
    └── Net Revenue     → PKR ${(totalFeeCollected - totalExpenses).toLocaleString()}

    🔑 Login Credentials:
    ├── Owner:    admin / admin123
    ├── Teacher:  ahmad.khan / teacher123
    ├── Teacher:  bilal.raza / teacher123
    └── Teacher:  kamran.ali / teacher123

    Teacher Balances (70% of collected fees):
    ├── ${teachers[0].name}: PKR ${teachers[0].balance.verified.toLocaleString()}
    ├── ${teachers[1].name}: PKR ${teachers[1].balance.verified.toLocaleString()}
    └── ${teachers[2].name}: PKR ${teachers[2].balance.verified.toLocaleString()}
    `);

  } catch (error) {
    console.error("\n❌ SEED FAILED:", error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    log("🔌", "Disconnected from MongoDB.");
    process.exit(0);
  }
}

// ── Run ─────────────────────────────────────────────────────────
seed();
