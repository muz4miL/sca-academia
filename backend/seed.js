const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/User");
const Student = require("./models/Student");
const Teacher = require("./models/Teacher");

// Load Environment Variables
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

// Connect to MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected for Seeding"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  });

const seedData = async () => {
  try {
    // 1. Wipe old data
    console.log("🧹 Wiping old data...");
    await User.deleteMany({});
    await Student.deleteMany({});
    await Teacher.deleteMany({});
    
    console.log("✅ Old data cleared.");

    // 2. Create Admin (Owner)
    await User.create({
      userId: "OWNER-001",
      username: "admin",
      fullName: "System Admin",
      password: "admin123", // Pre-save hook will hash this
      role: "OWNER",
      totalCash: 0,
      walletBalance: { floating: 0, verified: 0 },
      permissions: [
        "dashboard", "admissions", "students", "teachers", "finance", 
        "classes", "timetable", "sessions", "configuration", "users", 
        "website", "payroll", "settlement", "gatekeeper", "frontdesk", 
        "inquiries", "reports", "lectures"
      ]
    });
    console.log("👤 ADMIN Created: admin / admin123");

    // 3. Create Test Student
    // Note: Student model has its own barcode/studentId generation, but we can set them manually for seed
    await Student.create({
      studentId: "260001",
      studentName: "Test Student",
      fatherName: "Father Name",
      class: "10th",
      group: "Science",
      parentCell: "03001234567",
      totalFee: 5000,
      password: "student123", // Pre-save hook will hash this if provided
      plainPassword: "student123"
    });
    console.log("👤 STUDENT Created: 260001 / student123 (username: student)");

    // 4. Create Test Teacher
    const teacherUser = await User.create({
      userId: "TCH-001",
      username: "teacher",
      fullName: "Test Teacher",
      password: "teacher123",
      role: "TEACHER",
      permissions: ["dashboard", "lectures"]
    });

    await Teacher.create({
      name: "Test Teacher",
      phone: "03007654321",
      subject: "Mathematics",
      userId: teacherUser._id,
      username: "teacher",
      compensation: {
        type: "percentage",
        teacherShare: 70,
        academyShare: 30
      }
    });
    console.log("👤 TEACHER Created: teacher / teacher123");

    console.log("\n🌱 Seeding Complete! Ready for Launch.");
    process.exit();
  } catch (error) {
    console.error("❌ Seeding Failed:", error);
    process.exit(1);
  }
};

seedData();