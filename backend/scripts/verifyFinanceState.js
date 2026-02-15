const mongoose = require("mongoose");
const path = require("path");
const FeeRecord = require("../models/FeeRecord");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const Transaction = require("../models/Transaction");
const TeacherPayment = require("../models/TeacherPayment");

require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const connect = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI or MONGODB_URI is missing from environment");
  }
  await mongoose.connect(mongoUri);
};

const formatResult = (label, ok, details) => {
  const status = ok ? "PASS" : "FAIL";
  console.log(`${status} | ${label}${details ? ` | ${details}` : ""}`);
  return ok;
};

const run = async () => {
  await connect();

  const student = await Student.findOne({ studentName: "Ali" }).lean();
  if (!student) {
    formatResult("Fee Check: Student Ali exists", false, "Student not found");
    await mongoose.disconnect();
    process.exit(1);
  }

  const feeRecord = await FeeRecord.findOne({ student: student._id })
    .sort({ createdAt: -1 })
    .lean();

  const feeOk =
    feeRecord?.amount === 20000 &&
    String(feeRecord?.status || "").toLowerCase() === "paid";
  formatResult(
    "Fee Check: FeeRecord 20,000 and status paid",
    feeOk,
    feeRecord
      ? `amount=${feeRecord.amount}, status=${feeRecord.status}`
      : "FeeRecord not found",
  );

  const teacher = await Teacher.findOne({ name: "Waqar" }).lean();
  if (!teacher) {
    formatResult("Teacher Logic: Waqar exists", false, "Teacher not found");
    await mongoose.disconnect();
    process.exit(1);
  }

  const feeTimestamp = feeRecord?.createdAt
    ? new Date(feeRecord.createdAt)
    : null;
  const timeFilter = feeTimestamp ? { date: { $gte: feeTimestamp } } : {};

  const earnedAgg = await Transaction.aggregate([
    {
      $match: {
        type: "CREDIT",
        category: "Teacher Share",
        "splitDetails.teacherId": teacher._id,
        description: { $regex: /Share from Ali/i },
        ...timeFilter,
      },
    },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const withdrawnAgg = await Transaction.aggregate([
    {
      $match: {
        type: "EXPENSE",
        category: {
          $in: [
            "Teacher Salary",
            "Teacher Advance",
            "Teacher Payout",
            "Teacher_Payout",
          ],
        },
        "splitDetails.teacherId": teacher._id,
        ...timeFilter,
      },
    },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const earnedAmount = earnedAgg[0]?.total || 0;
  const withdrawnAmount = withdrawnAgg[0]?.total || 0;

  const earnedOk = earnedAmount >= 4600 && earnedAmount <= 4700;
  const withdrawnOk = withdrawnAmount === 2000;

  formatResult(
    "Teacher Logic: Waqar earned ≈ 4666",
    earnedOk,
    `earned=${earnedAmount}`,
  );
  formatResult(
    "Teacher Logic: Waqar withdrawn 2000",
    withdrawnOk,
    `withdrawn=${withdrawnAmount}`,
  );

  const academyAgg = await Transaction.aggregate([
    {
      $match: {
        type: "INCOME",
        category: "Academy Share",
        description: { $regex: /Academy share from Ali/i },
        ...timeFilter,
      },
    },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const academyShare = academyAgg[0]?.total || 0;
  const academyOk = academyShare >= 6000;
  formatResult(
    "Academy Share: 30% cut recorded (>= 6000)",
    academyOk,
    `academyTotal=${academyShare}`,
  );

  const payoutRecord = await TeacherPayment.findOne({
    teacherId: teacher._id,
    amountPaid: 2000,
  })
    .sort({ paymentDate: -1 })
    .lean();
  formatResult(
    "Teacher Payments: Waqar payout 2000 exists",
    Boolean(payoutRecord),
    payoutRecord ? `voucher=${payoutRecord.voucherId}` : "not found",
  );

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Verification failed:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
