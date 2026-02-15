const mongoose = require("mongoose");
const path = require("path");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const Class = require("../models/Class");
const Session = require("../models/Session");
const FeeRecord = require("../models/FeeRecord");
const Transaction = require("../models/Transaction");
const TeacherPayment = require("../models/TeacherPayment");
const { distributeRevenue } = require("../controllers/financeController");

require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const connect = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI or MONGODB_URI is missing from environment");
  }
  await mongoose.connect(mongoUri);
};

const ensureSession = async () => {
  const existing = await Session.findOne({ sessionName: "Seed Session" }).sort({
    startDate: -1,
  });
  if (existing) return existing;

  const now = new Date();
  const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const endDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const session = await Session.create({
    sessionName: "Seed Session",
    description: "Seed session for revenue simulation",
    startDate,
    endDate,
    status: "active",
  });
  return session;
};

const ensureTeacher = async ({ name, subject, phone }) => {
  const existing = await Teacher.findOne({ name });
  if (existing) return existing;

  return Teacher.create({
    name,
    phone,
    subject,
    status: "active",
    compensation: {
      type: "percentage",
      teacherShare: 70,
      academyShare: 30,
    },
  });
};

const ensureClass = async ({ sessionId, teachers }) => {
  const existing = await Class.findOne({ classTitle: "Seed Revenue Class" });
  if (existing) return existing;

  return Class.create({
    classTitle: "Seed Revenue Class",
    gradeLevel: "11th Grade",
    group: "Pre-Medical",
    session: sessionId,
    days: ["Mon", "Wed", "Fri"],
    startTime: "10:00",
    endTime: "12:00",
    assignedTeacher: teachers.waqar._id,
    teacherName: teachers.waqar.name,
    revenueMode: "standard",
    subjects: [
      { name: "Biology", fee: 7000 },
      { name: "Chemistry", fee: 7000 },
      { name: "Physics", fee: 6000 },
    ],
    subjectTeachers: [
      {
        subject: "Biology",
        teacherId: teachers.zahid._id,
        teacherName: teachers.zahid.name,
      },
      {
        subject: "Chemistry",
        teacherId: teachers.waqar._id,
        teacherName: teachers.waqar.name,
      },
      {
        subject: "Physics",
        teacherId: teachers.saud._id,
        teacherName: teachers.saud.name,
      },
    ],
  });
};

const ensureStudent = async ({ classDoc, sessionDoc }) => {
  const existing = await Student.findOne({ studentName: "Ali" });
  if (existing) return existing;

  return Student.create({
    studentName: "Ali",
    fatherName: "Hassan Ali",
    class: classDoc.classTitle,
    group: classDoc.group,
    parentCell: "0300-0000000",
    studentCell: "0300-1111111",
    totalFee: 20000,
    paidAmount: 0,
    discountAmount: 0,
    classRef: classDoc._id,
    sessionRef: sessionDoc._id,
    subjects: [
      { name: "Biology", fee: 7000 },
      { name: "Chemistry", fee: 7000 },
      { name: "Physics", fee: 6000 },
    ],
  });
};

const createFeeRecord = async ({ student, classDoc, amount }) => {
  const month = new Date().toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  return FeeRecord.create({
    student: student._id,
    studentName: student.studentName,
    class: classDoc._id,
    className: classDoc.classTitle,
    subject: "Session",
    amount,
    month,
    status: "PAID",
    paymentMethod: "CASH",
    revenueSource: "standard-split",
    splitBreakdown: {
      teacherShare: Math.floor(amount * 0.7),
      academyShare: amount - Math.floor(amount * 0.7),
      teacherPercentage: 70,
      academyPercentage: 30,
    },
  });
};

const processWithdrawal = async ({ teacher, amount, session }) => {
  await Teacher.updateOne(
    { _id: teacher._id },
    { $inc: { "balance.pending": -amount, totalPaid: amount } },
  );

  await Transaction.create({
    type: "EXPENSE",
    category: "Teacher Salary",
    amount,
    description: `Seed payout to ${teacher.name}`,
    date: new Date(),
    status: "VERIFIED",
    splitDetails: {
      teacherId: teacher._id,
      teacherName: teacher.name,
      payoutType: "SALARY",
    },
  });

  const existingPayment = await TeacherPayment.findOne({
    teacherId: teacher._id,
    amountPaid: amount,
    notes: "Seed payout",
  });

  if (!existingPayment) {
    await TeacherPayment.create({
      teacherId: teacher._id,
      teacherName: teacher.name,
      subject: teacher.subject || "general",
      amountPaid: amount,
      compensationType: teacher.compensation?.type || "percentage",
      month: new Date().toLocaleString("en-US", { month: "long" }),
      year: new Date().getFullYear(),
      paymentMethod: "cash",
      status: "paid",
      notes: "Seed payout",
      sessionId: session?._id,
      sessionName: session?.sessionName,
    });
  }
};

const run = async () => {
  await connect();

  const session = await ensureSession();
  const teachers = {
    waqar: await ensureTeacher({
      name: "Waqar",
      subject: "chemistry",
      phone: "0300-1111111",
    }),
    zahid: await ensureTeacher({
      name: "Zahid",
      subject: "biology",
      phone: "0300-2222222",
    }),
    saud: await ensureTeacher({
      name: "Saud",
      subject: "physics",
      phone: "0300-3333333",
    }),
  };

  const classDoc = await ensureClass({ sessionId: session._id, teachers });
  const student = await ensureStudent({ classDoc, sessionDoc: session });

  const feeAmount = 20000;
  const feeRecord = await createFeeRecord({
    student,
    classDoc,
    amount: feeAmount,
  });

  student.paidAmount = (student.paidAmount || 0) + feeAmount;
  student.feeStatus = student.paidAmount >= student.totalFee ? "paid" : "partial";
  await student.save();

  await distributeRevenue({
    studentId: student._id,
    paidAmount: feeAmount,
    feeRecordId: feeRecord._id,
  });

  await processWithdrawal({
    teacher: teachers.waqar,
    amount: 2000,
    session,
  });

  const refreshed = await Teacher.findById(teachers.waqar._id).lean();
  console.log("Seed complete:", {
    student: student.studentName,
    feeAmount,
    waqarPending: refreshed?.balance?.pending || 0,
    waqarTotalPaid: refreshed?.totalPaid || 0,
  });

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Seed revenue failed:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
