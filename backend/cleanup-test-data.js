/**
 * Cleanup script: Resets students, fee records, finance transactions, and teacher balances
 * while preserving teachers, classes, sessions, users, and configuration.
 *
 * Usage: cd backend && node cleanup-test-data.js
 */
require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/scaDB";

async function cleanup() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`✅ Connected to MongoDB: ${MONGO_URI}`);

    const db = mongoose.connection.db;

    // 1. Delete all students
    const studentsResult = await db.collection("students").deleteMany({});
    console.log(`🗑️  Deleted ${studentsResult.deletedCount} students`);

    // 2. Delete all fee records
    const feeResult = await db.collection("feerecords").deleteMany({});
    console.log(`🗑️  Deleted ${feeResult.deletedCount} fee records`);

    // 3. Delete finance transactions (Teacher Share, Academy Share, Refunds, Reversals, Payouts)
    const txnResult = await db.collection("transactions").deleteMany({
      category: {
        $in: [
          "Teacher Share",
          "Academy Share",
          "Unallocated Pool",
          "Teacher Share Reversal",
          "Academy Share Reversal",
          "Refund",
          "Teacher Salary",
          "Teacher Advance",
          "Teacher Payout",
          "Teacher_Payout",
          "Payroll_Credit",
        ],
      },
    });
    console.log(`🗑️  Deleted ${txnResult.deletedCount} finance transactions`);

    // 4. Reset teacher balances and totalPaid
    const teacherResult = await db.collection("teachers").updateMany(
      {},
      {
        $set: {
          "balance.pending": 0,
          "balance.floating": 0,
          "balance.verified": 0,
          totalPaid: 0,
        },
      }
    );
    console.log(
      `🔄 Reset balances for ${teacherResult.modifiedCount} teachers`
    );

    // 5. Delete teacher payments
    const payResult = await db.collection("teacherpayments").deleteMany({});
    console.log(`🗑️  Deleted ${payResult.deletedCount} teacher payments`);

    // 6. Reset user totalCash
    await db
      .collection("users")
      .updateMany({}, { $set: { totalCash: 0 } });
    console.log(`🔄 Reset totalCash for all users`);

    // 7. Delete finance-related notifications
    const notifResult = await db
      .collection("notifications")
      .deleteMany({ type: "FINANCE" });
    console.log(`🗑️  Deleted ${notifResult.deletedCount} finance notifications`);

    console.log("\n✅ Cleanup complete! Ready for fresh testing.");
    console.log("   Teachers, Classes, Sessions, Users, and Config preserved.");
  } catch (error) {
    console.error("❌ Cleanup error:", error.message);
  } finally {
    await mongoose.connection.close();
  }
}

cleanup();
