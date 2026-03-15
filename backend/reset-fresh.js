/**
 * SCA ACADEMIA — Fresh Reset Script
 * Wipes ALL data and creates only the essentials:
 *  - Configuration (academy info)
 *  - Owner user (admin login)
 * Run: node reset-fresh.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

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

let PayoutRequest, Attendance, Inventory;
try { PayoutRequest = require("./models/PayoutRequest"); } catch(e) {}
try { Attendance = require("./models/Attendance"); } catch(e) {}
try { Inventory = require("./models/Inventory"); } catch(e) {}

const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/scaAcademiaDB";

async function main() {
  try {
    console.log("\n🔄 SCA ACADEMIA — FRESH RESET");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    await mongoose.connect(MONGO_URI);
    console.log(`✅ Connected to MongoDB: ${MONGO_URI}`);

    // ── WIPE ALL COLLECTIONS ──
    console.log("\n🗑️  Clearing ALL collections...");
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
    if (Inventory) clearPromises.push(Inventory.deleteMany({}));
    await Promise.all(clearPromises);
    console.log("✅ All collections cleared");

    // ── CREATE CONFIGURATION ──
    console.log("\n⚙️  Creating Configuration...");
    await Configuration.create({
      academyName: "STANDARD COACHING ACADEMY",
      academyAddress: "Opp. Islamia College, Danishabad, University Road, Peshawar",
      academyPhone: "091-5601600",
      systemAdminName: "Sir Osama Ali",
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
    console.log("✅ Configuration created (systemAdminName: Sir Osama Ali)");

    // ── CREATE OWNER USER ──
    console.log("\n👑 Creating Owner account...");
    await User.create({
      userId: "OWNER-001",
      username: "admin",
      password: "admin123",
      fullName: "Sir Osama Ali",
      role: "OWNER",
      permissions: [
        "dashboard", "admissions", "students", "teachers", "finance",
        "classes", "timetable", "sessions", "configuration", "users",
        "website", "payroll", "settlement", "gatekeeper", "frontdesk",
        "inquiries", "reports", "lectures",
      ],
      phone: "+92 334 5852326",
      isActive: true,
      canBeDeleted: false,
    });
    console.log("✅ Owner: admin / admin123");

    // ── DONE ──
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🎉 FRESH RESET COMPLETE!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  Login:    admin / admin123");
    console.log("  Database: Clean — no students, teachers, or classes");
    console.log("  Student IDs will start from: 1");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Reset failed:", err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();
