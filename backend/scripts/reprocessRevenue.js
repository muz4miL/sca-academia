const mongoose = require("mongoose");
const path = require("path");
const FeeRecord = require("../models/FeeRecord");
const Student = require("../models/Student");
const { distributeRevenue } = require("../controllers/financeController");

require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const connect = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI or MONGODB_URI is missing from environment");
  }
  await mongoose.connect(mongoUri);
};

const run = async () => {
  await connect();
  const records = await FeeRecord.find({
    status: { $in: ["PAID", "Paid", "paid"] },
  })
    .select("_id student amount")
    .lean();

  const studentIds = records
    .map((record) => record.student)
    .filter(Boolean)
    .map((id) => id.toString());

  const existingStudents = studentIds.length
    ? await Student.find({ _id: { $in: studentIds } })
        .select("_id")
        .lean()
    : [];
  const existingStudentSet = new Set(
    existingStudents.map((student) => student._id.toString()),
  );

  const validRecords = records.filter((record) =>
    existingStudentSet.has(record.student?.toString()),
  );

  console.log(
    `Found ${records.length} paid fee records. Reprocessing ${validRecords.length}.`,
  );

  let successCount = 0;
  let failureCount = 0;

  for (const record of validRecords) {
    try {
      await distributeRevenue({
        feeRecordId: record._id,
        studentId: record.student,
        paidAmount: record.amount,
      });
      successCount += 1;
    } catch (error) {
      failureCount += 1;
      console.error(
        `Failed to reprocess feeRecord ${record._id}:`,
        error.message,
      );
    }
  }

  console.log(
    `Reprocess complete. Success: ${successCount}, Failed: ${failureCount}`,
  );

  await mongoose.disconnect();
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Reprocess script failed:", error.message);
    process.exit(1);
  });
