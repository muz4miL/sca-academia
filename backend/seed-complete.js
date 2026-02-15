/**
 * COMPLETE DATABASE SEED SCRIPT
 * Clears all data and creates fresh test data with perfect sync
 * Run: node seed-complete.js
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

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/sca-academia";

async function clearDatabase() {
  console.log("\n🗑️  CLEARING DATABASE...");
  
  const User = require("./models/User");
  
  await Student.deleteMany({});
  await Teacher.deleteMany({});
  await Class.deleteMany({});
  await Session.deleteMany({});
  await Transaction.deleteMany({});
  await Expense.deleteMany({});
  await User.deleteMany({ role: { $ne: "OWNER" } }); // Delete all non-owner users
  
  console.log("✅ Database cleared");
}

async function seedSessions() {
  console.log("\n📅 CREATING SESSIONS...");
  
  const session = await Session.create({
    sessionName: "Academic Year 2025-2026",
    startDate: new Date("2025-09-01"),
    endDate: new Date("2026-06-30"),
    status: "active", // lowercase
    fee: 25000, // Default session fee
  });
  
  console.log(`✅ Created session: ${session.sessionName} (Fee: PKR ${session.fee})`);
  return session;
}

async function seedClasses(sessionId) {
  console.log("\n🎓 CREATING CLASSES...");
  
  // Create classes one by one to trigger pre-save hooks
  const class1 = await Class.create({
    classTitle: "SCA 1st Year (Pre-Med)",
    className: "SCA 1st Year (Pre-Med)",
    gradeLevel: "1st Year",
    group: "Pre-Medical",
    baseFee: 25000,
    session: sessionId,
    subjects: [
      { name: "Biology", fee: 5000 },
      { name: "Chemistry", fee: 5000 },
      { name: "Physics", fee: 4000 },
      { name: "Mathematics", fee: 4000 },
    ],
    schedule: "Morning • Mon, Tue, Wed, Thu, Fri",
    startTime: "08:00",
    endTime: "12:00",
    status: "active",
  });
  
  const class2 = await Class.create({
    classTitle: "SCA 2nd Year (Pre-Eng)",
    className: "SCA 2nd Year (Pre-Eng)",
    gradeLevel: "2nd Year",
    group: "Pre-Engineering",
    baseFee: 30000,
    session: sessionId,
    subjects: [
      { name: "Physics", fee: 6000 },
      { name: "Chemistry", fee: 6000 },
      { name: "Mathematics", fee: 6000 },
    ],
    schedule: "Evening • Mon, Tue, Wed, Thu, Fri",
    startTime: "14:00",
    endTime: "18:00",
    status: "active",
  });
  
  const classes = [class1, class2];
  
  console.log(`✅ Created ${classes.length} classes`);
  return classes;
}

async function seedTeachers() {
  console.log("\n👨‍🏫 CREATING TEACHERS...");
  
  const hashedPassword = await bcrypt.hash("teacher123", 10);
  
  // Helper function to generate username
  const generateUsername = (name) => {
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join("") || "";
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return (firstName + lastName).toLowerCase().replace(/[^a-z]/g, '') + randomSuffix;
  };
  
  const plainPassword = "teacher123";
  
  // Teacher 1: Dr. Ahmed Khan
  const username1 = generateUsername("Dr. Ahmed Khan");
  const teacher1 = await Teacher.create({
    name: "Dr. Ahmed Khan",
    email: "ahmed@sca.edu.pk",
    password: hashedPassword,
    subject: "Biology",
    qualification: "PhD Biology",
    phone: "03001234567",
    cnic: "12345-6789012-3",
    status: "active",
    username: username1,
    plainPassword: plainPassword,
    compensation: {
      type: "percentage",
      teacherShare: 70,
      academyShare: 30,
    },
    balance: {
      floating: 0,
      verified: 0,
      pending: 0,
    },
    totalPaid: 0,
  });
  
  // Teacher 2: Prof. Fatima Ali  
  const username2 = generateUsername("Prof. Fatima Ali");
  const teacher2 = await Teacher.create({
    name: "Prof. Fatima Ali",
    email: "fatima@sca.edu.pk",
    password: hashedPassword,
    subject: "Chemistry",
    qualification: "MSc Chemistry",
    phone: "03009876543",
    cnic: "12345-6789012-4",
    status: "active",
    username: username2,
    plainPassword: plainPassword,
    compensation: {
      type: "percentage",
      teacherShare: 70,
      academyShare: 30,
    },
    balance: {
      floating: 0,
      verified: 0,
      pending: 0,
    },
    totalPaid: 0,
  });
  
  // Teacher 3: Engr. Hassan Raza
  const username3 = generateUsername("Engr. Hassan Raza");
  const teacher3 = await Teacher.create({
    name: "Engr. Hassan Raza",
    email: "hassan@sca.edu.pk",
    password: hashedPassword,
    subject: "Physics",
    qualification: "BE Electrical Engineering",
    phone: "03001112222",
    cnic: "12345-6789012-5",
    status: "active",
    username: username3,
    plainPassword: plainPassword,
    compensation: {
      type: "percentage",
      teacherShare: 70,
      academyShare: 30,
    },
    balance: {
      floating: 0,
      verified: 0,
      pending: 0,
    },
    totalPaid: 0,
  });
  
  const teachers = [teacher1, teacher2, teacher3];
  
  // Create User accounts for teachers so they can login
  console.log("Creating User accounts for teachers...");
  
  const User = require("./models/User");
  
  await User.create({
    userId: "TCH0001",
    username: username1,
    password: plainPassword, // Will be hashed by User pre-save hook
    fullName: "Dr. Ahmed Khan",
    role: "TEACHER",
    permissions: ["dashboard", "lectures"],
    phone: "03001234567",
    isActive: true,
    teacherId: teacher1._id,
  });
  
  await User.create({
    userId: "TCH0002",
    username: username2,
    password: plainPassword,
    fullName: "Prof. Fatima Ali",
    role: "TEACHER",
    permissions: ["dashboard", "lectures"],
    phone: "03009876543",
    isActive: true,
    teacherId: teacher2._id,
  });
  
  await User.create({
    userId: "TCH0003",
    username: username3,
    password: plainPassword,
    fullName: "Engr. Hassan Raza",
    role: "TEACHER",
    permissions: ["dashboard", "lectures"],
    phone: "03001112222",
    isActive: true,
    teacherId: teacher3._id,
  });
  
  console.log(`✅ Created ${teachers.length} teachers with login accounts`);
  console.log(`   Teacher 1: ${username1} / ${plainPassword}`);
  console.log(`   Teacher 2: ${username2} / ${plainPassword}`);
  console.log(`   Teacher 3: ${username3} / ${plainPassword}`);
  
  return teachers;
}

async function seedStudents(classes, sessionId) {
  console.log("\n👨‍🎓 CREATING STUDENTS WITH PAYMENTS...");
  
  const studentsData = [
    // 10th Grade Medical - 5 students
    {
      studentName: "Saifullah Khan",
      fatherName: "Muhammad Khan",
      gender: "Male",
      class: "10th Grade Medical",
      group: "Pre-Medical",
      parentCell: "03001111111",
      studentCell: "03111111111",
      address: "Model Town, Lahore",
      totalFee: 25000,
      paidAmount: 25000, // Fully paid
      classRef: classes[0]._id,
      sessionRef: sessionId,
      referralSource: "Facebook Ad",
      studentStatus: "Active",
    },
    {
      studentName: "Ayesha Malik",
      fatherName: "Malik Riaz",
      gender: "Female",
      class: "10th Grade Medical",
      group: "Pre-Medical",
      parentCell: "03002222222",
      studentCell: "03122222222",
      address: "DHA Phase 5, Lahore",
      totalFee: 25000,
      paidAmount: 20000, // Partial payment
      classRef: classes[0]._id,
      sessionRef: sessionId,
      referralSource: "Friend Referral",
      studentStatus: "Active",
    },
    {
      studentName: "Ali Hassan",
      fatherName: "Hassan Ahmed",
      gender: "Male",
      class: "10th Grade Medical",
      group: "Pre-Medical",
      parentCell: "03003333333",
      studentCell: "03133333333",
      address: "Johar Town, Lahore",
      totalFee: 25000,
      paidAmount: 25000, // Fully paid
      classRef: classes[0]._id,
      sessionRef: sessionId,
      referralSource: "Google Search",
      studentStatus: "Active",
    },
    {
      studentName: "Zainab Fatima",
      fatherName: "Muhammad Fatima",
      gender: "Female",
      class: "10th Grade Medical",
      group: "Pre-Medical",
      parentCell: "03004444444",
      studentCell: "03144444444",
      address: "Gulberg, Lahore",
      totalFee: 25000,
      paidAmount: 15000, // Partial payment
      classRef: classes[0]._id,
      sessionRef: sessionId,
      referralSource: "Walk-in",
      studentStatus: "Active",
    },
    {
      studentName: "Hamza Tariq",
      fatherName: "Tariq Mahmood",
      gender: "Male",
      class: "10th Grade Medical",
      group: "Pre-Medical",
      parentCell: "03005555555",
      studentCell: "03155555555",
      address: "Faisal Town, Lahore",
      totalFee: 25000,
      paidAmount: 25000, // Fully paid
      classRef: classes[0]._id,
      sessionRef: sessionId,
      referralSource: "Friend Referral",
      studentStatus: "Active",
    },
    
    // 12th Grade Engineering - 3 students
    {
      studentName: "Bilal Ahmed",
      fatherName: "Ahmed Raza",
      gender: "Male",
      class: "12th Grade Engineering",
      group: "Pre-Engineering",
      parentCell: "03006666666",
      studentCell: "03166666666",
      address: "Bahria Town, Lahore",
      totalFee: 30000,
      paidAmount: 30000, // Fully paid
      classRef: classes[1]._id,
      sessionRef: sessionId,
      referralSource: "Instagram",
      studentStatus: "Active",
    },
    {
      studentName: "Usman Khalid",
      fatherName: "Khalid Mehmood",
      gender: "Male",
      class: "12th Grade Engineering",
      group: "Pre-Engineering",
      parentCell: "03007777777",
      studentCell: "03177777777",
      address: "Garden Town, Lahore",
      totalFee: 30000,
      paidAmount: 25000, // Partial payment
      classRef: classes[1]._id,
      sessionRef: sessionId,
      referralSource: "Friend Referral",
      studentStatus: "Active",
    },
    {
      studentName: "Fahad Iqbal",
      fatherName: "Iqbal Hussain",
      gender: "Male",
      class: "12th Grade Engineering",
      group: "Pre-Engineering",
      parentCell: "03008888888",
      studentCell: "03188888888",
      address: "Cavalry Ground, Lahore",
      totalFee: 30000,
      paidAmount: 30000, // Fully paid
      classRef: classes[1]._id,
      sessionRef: sessionId,
      referralSource: "Google Search",
      studentStatus: "Active",
    },
  ];
  
  // Create students one by one to trigger pre-save hooks
  const students = [];
  for (const studentData of studentsData) {
    const student = await Student.create(studentData);
    students.push(student);
  }
  
  console.log(`✅ Created ${students.length} students`);
  
  // Create INCOME transactions for all student payments
  console.log("\n💰 CREATING INCOME TRANSACTIONS...");
  let totalRevenue = 0;
  
  for (const student of students) {
    if (student.paidAmount > 0) {
      await Transaction.create({
        type: "INCOME",
        category: "Tuition",
        amount: student.paidAmount,
        description: `Admission fee from ${student.studentName} - ${student.class}`,
        date: new Date(), // All in Feb 2026
        status: "FLOATING",
        studentId: student._id,
        classId: student.classRef,
      });
      totalRevenue += student.paidAmount;
    }
  }
  
  console.log(`✅ Created ${students.length} INCOME transactions (Total: PKR ${totalRevenue.toLocaleString()})`);
  
  return students;
}

async function seedExpenses() {
  console.log("\n💸 CREATING EXPENSES...");
  
  const expense1 = await Expense.create({
    title: "Electricity Bill",
    category: "Electricity Bill", // Must match enum
    amount: 8500,
    vendorName: "LESCO",
    dueDate: new Date("2026-02-28"),
    expenseDate: new Date("2026-02-10"),
    status: "paid",
    description: "Monthly electricity bill",
  });
  
  const expense2 = await Expense.create({
    title: "Staff Tea & Refreshments",
    category: "Staff Tea & Refreshments", // Must match enum
    amount: 6000,
    vendorName: "Local Cafe",
    dueDate: new Date("2026-02-15"),
    expenseDate: new Date("2026-02-05"),
    status: "paid",
    description: "Monthly tea and snacks for staff",
  });
  
  const expenses = [expense1, expense2];
  
  console.log(`✅ Created ${expenses.length} expenses`);
  
  // Create EXPENSE transactions
  console.log("\n💸 CREATING EXPENSE TRANSACTIONS...");
  let totalExpenses = 0;
  
  for (const expense of expenses) {
    await Transaction.create({
      type: "EXPENSE",
      category: expense.category,
      amount: expense.amount,
      description: `Expense: ${expense.title}`,
      date: expense.expenseDate,
      status: "VERIFIED",
    });
    totalExpenses += expense.amount;
  }
  
  console.log(`✅ Created ${expenses.length} EXPENSE transactions (Total: PKR ${totalExpenses.toLocaleString()})`);
  
  return expenses;
}

async function verifySync() {
  console.log("\n✅ VERIFYING DATA SYNC...");
  
  // Student totals
  const studentStats = await Student.aggregate([
    {
      $group: {
        _id: null,
        totalFee: { $sum: "$totalFee" },
        paidAmount: { $sum: "$paidAmount" },
        count: { $sum: 1 },
      },
    },
  ]);
  
  // Transaction totals (February 2026)
  const now = new Date("2026-02-14");
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const incomeStats = await Transaction.aggregate([
    { $match: { type: "INCOME", date: { $gte: startOfMonth } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  
  const expenseStats = await Transaction.aggregate([
    { $match: { type: "EXPENSE", date: { $gte: startOfMonth } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  
  const totalStudentFees = studentStats[0]?.totalFee || 0;
  const totalStudentPaid = studentStats[0]?.paidAmount || 0;
  const totalStudentPending = totalStudentFees - totalStudentPaid;
  const totalTransactionIncome = incomeStats[0]?.total || 0;
  const totalTransactionExpense = expenseStats[0]?.total || 0;
  const netRevenue = totalTransactionIncome - totalTransactionExpense;
  
  console.log("\n📊 FINAL VERIFICATION:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Total Students: ${studentStats[0]?.count || 0}`);
  console.log(`Total Expected Fees: PKR ${totalStudentFees.toLocaleString()}`);
  console.log(`Total Collected Fees: PKR ${totalStudentPaid.toLocaleString()}`);
  console.log(`Total Pending Fees: PKR ${totalStudentPending.toLocaleString()}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Monthly Income (Transactions): PKR ${totalTransactionIncome.toLocaleString()}`);
  console.log(`Monthly Expenses (Transactions): PKR ${totalTransactionExpense.toLocaleString()}`);
  console.log(`Net Revenue: PKR ${netRevenue.toLocaleString()}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  // Verify sync
  if (totalStudentPaid === totalTransactionIncome) {
    console.log("✅ PERFECT SYNC: Student payments match Transaction INCOME records");
  } else {
    console.log("⚠️  MISMATCH: Student paid amount does not match Transaction INCOME");
    console.log(`   Student paidAmount: PKR ${totalStudentPaid.toLocaleString()}`);
    console.log(`   Transaction INCOME:  PKR ${totalTransactionIncome.toLocaleString()}`);
  }
  
  // Class revenue verification
  const classes = await Class.find();
  console.log("\n📚 CLASS REVENUE BREAKDOWN:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  for (const classDoc of classes) {
    const students = await Student.find({
      classRef: classDoc._id,
      studentStatus: "Active",
    });
    
    const classRevenue = students.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
    const teacherShare = Math.round(classRevenue * 0.7);
    
    console.log(`${classDoc.classTitle}:`);
    console.log(`   Students: ${students.length}`);
    console.log(`   Revenue: PKR ${classRevenue.toLocaleString()}`);
    console.log(`   Teacher Share (70%): PKR ${teacherShare.toLocaleString()}`);
  }
  
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

async function main() {
  try {
    console.log("🚀 STARTING COMPLETE DATABASE SEED");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");
    
    await clearDatabase();
    
    const session = await seedSessions();
    const classes = await seedClasses(session._id);
    const teachers = await seedTeachers();
    const students = await seedStudents(classes, session._id);
    const expenses = await seedExpenses();
    
    await verifySync();
    
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ DATABASE SEED COMPLETE!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n🔐 Test Credentials:");
    console.log("   Teacher: ahmed@sca.edu.pk / teacher123");
    console.log("\n📊 Expected Dashboard Metrics:");
    console.log("   Net Revenue: PKR 210,000 (this month)");
    console.log("   Expenses: PKR 14,500 (this month)");
    console.log("   Net Balance: PKR 195,500");
    console.log("   Total Students: 8");
    console.log("   Total Teachers: 3");
    console.log("\n🎓 Expected Class Revenue:");
    console.log("   10th Grade Medical: PKR 110,000 (70% = PKR 77,000)");
    console.log("   12th Grade Engineering: PKR 85,000 (70% = PKR 59,500)");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

main();
