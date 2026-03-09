const mongoose = require("mongoose");
require("dotenv").config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log("DB:", mongoose.connection.name);
  const db = mongoose.connection.db;

  // Simulate the FIXED payroll query (CREDIT + LIABILITY)
  const creditTotals = await db.collection("transactions").aggregate([
    { $match: { type: { $in: ["CREDIT", "LIABILITY"] }, "splitDetails.teacherId": { $ne: null } } },
    { $group: { _id: "$splitDetails.teacherId", total: { $sum: "$amount" } } },
  ]).toArray();
  console.log("\n=== PAYROLL: Total Earned (CREDIT + LIABILITY per teacher) ===");
  for (const c of creditTotals) {
    const t = await db.collection("teachers").findOne({ _id: c._id });
    console.log(`  ${t?.name}: PKR ${c.total.toLocaleString()}`);
  }

  // EXPENSE payouts
  const payoutTotals = await db.collection("transactions").aggregate([
    { $match: { type: "EXPENSE", category: { $in: ["Teacher Salary", "Teacher Advance", "Teacher Payout", "Teacher_Payout"] }, "splitDetails.teacherId": { $ne: null } } },
    { $group: { _id: "$splitDetails.teacherId", total: { $sum: "$amount" } } },
  ]).toArray();
  console.log("\n=== PAYROLL: Total Withdrawn (EXPENSE payouts per teacher) ===");
  for (const p of payoutTotals) {
    const t = await db.collection("teachers").findOne({ _id: p._id });
    console.log(`  ${t?.name}: PKR ${p.total.toLocaleString()}`);
  }

  // Teacher pending balances
  const teachers = await db.collection("teachers").find({ status: "active" }).toArray();
  console.log("\n=== PAYROLL: Net Payable (balance.pending) ===");
  let totalLiability = 0;
  for (const t of teachers) {
    const pending = t.balance?.pending || 0;
    totalLiability += pending;
    console.log(`  ${t.name}: PKR ${pending.toLocaleString()}`);
  }
  console.log(`  TOTAL LIABILITY: PKR ${totalLiability.toLocaleString()}`);

  // TeacherPayment totals (Paid This Session)
  const session = await db.collection("sessions").findOne({ status: "active" });
  if (session) {
    const paidSession = await db.collection("teacherpayments").aggregate([
      { $match: { sessionId: session._id } },
      { $group: { _id: null, total: { $sum: "$amountPaid" } } },
    ]).toArray();
    console.log(`\n=== PAYROLL: Paid This Session === PKR ${(paidSession[0]?.total || 0).toLocaleString()}`);
  }

  // Dashboard stats
  const marchStart = new Date(2026, 2, 1);
  const marchIncome = await db.collection("transactions").aggregate([
    { $match: { type: "INCOME", date: { $gte: marchStart } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]).toArray();
  const marchExpense = await db.collection("transactions").aggregate([
    { $match: { type: "EXPENSE", date: { $gte: marchStart } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]).toArray();
  
  const inc = marchIncome[0]?.total || 0;
  const exp = marchExpense[0]?.total || 0;
  console.log(`\n=== DASHBOARD: March Stats ===`);
  console.log(`  Income (INCOME type):  PKR ${inc.toLocaleString()}`);
  console.log(`  Expenses (EXPENSE type): PKR ${exp.toLocaleString()}`);
  console.log(`  Net Revenue: PKR ${(inc - exp).toLocaleString()}`);

  // Analytics quick stats (monthlyRevenue = INCOME - REFUND)
  const refunds = await db.collection("transactions").aggregate([
    { $match: { type: "REFUND", date: { $gte: marchStart } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]).toArray();
  console.log(`  Monthly Revenue (analytics): PKR ${(inc - (refunds[0]?.total || 0)).toLocaleString()}`);

  console.log(`\n  Students: ${await db.collection("students").countDocuments()}`);
  console.log(`  Teachers: ${await db.collection("teachers").countDocuments({ status: "active" })}`);
  console.log(`  Fee Records: ${await db.collection("feerecords").countDocuments()}`);

  console.log("\n✅ VERIFICATION COMPLETE");
  process.exit(0);
});
