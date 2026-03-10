# COMPREHENSIVE: Perfect the "Collect Fee" Module

> **Context**: We have a working ERP system (the "reference system" — SCA Academia) where the Collect Fee module is perfected. Your system (Edwardian Academy ERP) has a basic Collect Fee dialog but it's missing critical features. This prompt gives you EVERYTHING you need to make your Collect Fee module match the reference system exactly.

---

## WHAT THE PERFECT COLLECT FEE MODULE DOES

When a staff member clicks the **$** (DollarSign) button on any student row in the Students page, a modal opens showing:

1. **Student Financial Summary** (read-only, computed from student record):
   - **Total Fee** — the student's total fee amount
   - **Paid Amount** — how much has been collected so far
   - **Remaining Balance** — `totalFee - paidAmount` (computed live, never negative)

2. **Collection Month** — auto-set to the current month (e.g., "March 2026"), displayed as read-only text (NOT a dropdown — the user should NOT pick a different month)

3. **Amount (Rs.)** — numeric input for the amount being collected

4. **70/30 Split Note** — informational text:
   ```
   Note: Fee will be automatically split:
   • 70% → Teacher's Unverified Balance
   • 30% → Academy's Unverified Balance
   ```

5. **Buttons**: Cancel | $ Collect Fee

After successful collection:
- Modal switches to a **Success State** showing a green checkmark, "Fee Collected!", the amount collected, and the collection month
- A "Done" button closes the modal
- The student list auto-refreshes (React Query invalidation) to show updated fee status

---

## DIFFERENCES FROM YOUR CURRENT IMPLEMENTATION

Looking at your current Collect Fee dialog, here's what's wrong/missing:

| Issue | Your Current System | Reference (Correct) |
|-------|-------------------|---------------------|
| **No financial summary** | Just Month + Subject + Amount | Shows Total Fee, Paid Amount, Remaining Balance at top |
| **Month is a dropdown** | User can pick any month | Auto-set to current month, **read-only** (not a dropdown) |
| **Subject field exists** | Has a Subject dropdown | **No subject field** — fee is collected as "General" |
| **No validation against balance** | Can collect any amount | Backend rejects if amount > remaining balance |
| **No success state** | Modal just closes | Modal shows green success screen with receipt details |
| **No fee status auto-update** | Fee status may not update | Student's `feeStatus` auto-recalculates on every payment |
| **No receipt number** | No receipt generated | Auto-generates receipt: `FEE-YYYYMM-XXXX` |
| **No transaction ledger** | May not create transaction | Creates INCOME transaction in Transaction collection |
| **No notifications** | No owner notification | Sends FINANCE notification to OWNER + special "FULLY PAID" notification |
| **No collector tracking** | No cash tracking | Updates collector's `totalCash` for daily closing verification |

---

## IMPLEMENTATION GUIDE

### STEP 1: Student Model — Fee Fields

Your Student model MUST have these fields:

```javascript
// In your Student schema
feeStatus: {
  type: String,
  enum: ["paid", "partial", "pending"],
  default: "pending",
},
totalFee: {
  type: Number,
  required: true,
  min: 0,
},
paidAmount: {
  type: Number,
  default: 0,
  min: 0,
},
sessionRate: {
  type: Number,
  default: 0,
  min: 0,
},
discountAmount: {
  type: Number,
  default: 0,
  min: 0,
},
```

**Virtual field** (MUST be included for API responses):
```javascript
studentSchema.virtual("balance").get(function () {
  return Math.max(0, this.totalFee - this.paidAmount);
});

// Enable virtuals in JSON
studentSchema.set("toJSON", { virtuals: true });
studentSchema.set("toObject", { virtuals: true });
```

**Pre-save hook** — auto-calculates `feeStatus` on EVERY save:
```javascript
studentSchema.pre("save", async function () {
  // Ensure totalFee and paidAmount are Numbers
  if (this.totalFee !== undefined) {
    this.totalFee = Number(this.totalFee);
  }
  if (this.paidAmount !== undefined) {
    this.paidAmount = Number(this.paidAmount);
  }

  // Auto-calculate feeStatus
  const totalFee = Number(this.totalFee) || 0;
  const paidAmount = Number(this.paidAmount) || 0;

  if (paidAmount >= totalFee && totalFee > 0) {
    this.feeStatus = "paid";
  } else if (paidAmount > 0 && paidAmount < totalFee) {
    this.feeStatus = "partial";
  } else {
    this.feeStatus = "pending";
  }
});
```

**CRITICAL**: The `feeStatus` field should NEVER be manually set in update routes. Delete it from update data:
```javascript
// In your PUT /api/students/:id route handler
delete updateData.feeStatus; // Prevent manual override — pre-save hook handles it
```

---

### STEP 2: FeeRecord Model

Create a `FeeRecord` model to track every individual fee payment:

```javascript
const mongoose = require("mongoose");

const feeRecordSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student reference is required"],
    },
    studentName: { type: String, required: true, trim: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
    className: { type: String, required: true, trim: true },
    subject: { type: String, trim: true },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [1, "Amount must be at least 1"],
    },
    discountAmount: { type: Number, default: 0, min: 0 },
    sessionRate: { type: Number, default: 0, min: 0 },
    month: { type: String, required: [true, "Month is required"], trim: true },
    status: {
      type: String,
      enum: ["PAID", "PENDING", "REFUNDED"],
      default: "PAID",
    },
    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    collectedByName: { type: String, trim: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
    teacherName: { type: String, trim: true },
    isPartnerTeacher: { type: Boolean, default: false },
    splitBreakdown: {
      teacherShare: { type: Number, default: 0 },
      academyShare: { type: Number, default: 0 },
      teacherPercentage: { type: Number, default: 70 },
      academyPercentage: { type: Number, default: 30 },
    },
    paymentMethod: {
      type: String,
      enum: ["CASH", "BANK", "ONLINE"],
      default: "CASH",
    },
    receiptNumber: { type: String, unique: true, sparse: true },
    notes: { type: String, trim: true, maxlength: 500 },
    refundAmount: { type: Number, default: 0, min: 0 },
    refundDate: { type: Date },
    refundReason: { type: String, trim: true },
  },
  { timestamps: true }
);

// Auto-generate receipt number on create
feeRecordSchema.pre("save", async function () {
  if (this.isNew && !this.receiptNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    this.receiptNumber = `FEE-${year}${month}-${random}`;
  }
});

// Indexes for performance
feeRecordSchema.index({ student: 1, month: 1 });
feeRecordSchema.index({ teacher: 1 });
feeRecordSchema.index({ collectedBy: 1 });
feeRecordSchema.index({ createdAt: -1 });
feeRecordSchema.index({ status: 1 });

module.exports = mongoose.model("FeeRecord", feeRecordSchema);
```

---

### STEP 3: Transaction Model

Ensure your Transaction model supports fee income tracking:

```javascript
// Your Transaction schema MUST have AT LEAST these fields:
{
  type: {
    type: String,
    enum: ["INCOME", "EXPENSE", "CREDIT", "LIABILITY", "REFUND", ...],
    required: true,
  },
  category: {
    type: String,
    enum: ["Tuition", "Teacher Payout", "Rent", "Utilities", "Salaries", "Misc", ...],
    required: true,
  },
  amount: { type: Number, required: true },
  description: { type: String },
  date: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["FLOATING", "VERIFIED", "CANCELLED", "REFUNDED"],
    default: "FLOATING",
  },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
}
```

**Key concept**: When fee is collected, it enters as `status: "FLOATING"`. It becomes `"VERIFIED"` during daily closing. This prevents staff from spending unverified cash.

---

### STEP 4: Backend Controller — `collectFee`

```javascript
// Helper function — keep it DRY
const calculateFeeStatus = (paidAmount, totalFee) => {
  const paid = Number(paidAmount) || 0;
  const total = Number(totalFee) || 0;
  if (paid >= total && total > 0) return "paid";
  if (paid > 0 && paid < total) return "partial";
  return "pending";
};

// COLLECT FEE — The main function
exports.collectFee = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, month, subject, teacherId, paymentMethod, notes } = req.body;

    // --- VALIDATION ---
    if (!amount || !month) {
      return res.status(400).json({ success: false, message: "Amount and month required" });
    }

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const amountNum = Number(amount);

    if (amountNum <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be greater than 0" });
    }

    // CRITICAL: Prevent over-collection
    const remainingBalance = (student.totalFee || 0) - (student.paidAmount || 0);
    if (amountNum > remainingBalance) {
      return res.status(400).json({
        success: false,
        message: `Amount (Rs. ${amountNum.toLocaleString()}) exceeds remaining balance (Rs. ${remainingBalance.toLocaleString()})`,
      });
    }

    // --- STEP 1: Create Fee Record ---
    const feeRecord = await FeeRecord.create({
      student: student._id,
      studentName: student.studentName,
      className: student.class,
      subject: subject || "General",
      amount: amountNum,
      month,
      status: "PAID",
      collectedBy: req.user?._id,
      collectedByName: req.user?.fullName || "Staff",
      teacher: teacherId || undefined,
      paymentMethod: paymentMethod || "CASH",
      notes,
    });

    // --- STEP 2: Update Student's paidAmount ---
    const oldFeeStatus = student.feeStatus;
    student.paidAmount = (student.paidAmount || 0) + amountNum;
    student.feeStatus = calculateFeeStatus(student.paidAmount, student.totalFee || 0);
    await student.save();

    // --- STEP 3: Create INCOME Transaction ---
    // Full amount as INCOME (Manual Payroll Model — no auto-split at collection time)
    const transaction = await Transaction.create({
      type: "INCOME",
      category: "Tuition",
      amount: amountNum,
      description: `Fee collected from ${student.studentName} (${month})`,
      date: new Date(),
      collectedBy: req.user?._id,
      status: "FLOATING",
      studentId: student._id,
      classId: student.classRef,
    });

    // --- STEP 4: Track collector's cash (for daily closing) ---
    if (req.user?._id) {
      try {
        const collector = await User.findById(req.user._id);
        if (collector) {
          collector.totalCash = (collector.totalCash || 0) + amountNum;
          await collector.save();
        }
      } catch (e) {
        console.log("TotalCash update skipped:", e.message);
      }
    }

    // --- STEP 5: Send notifications to OWNER ---
    try {
      const owner = await User.findOne({ role: "OWNER" });
      if (owner) {
        const newRemainingBalance = (student.totalFee || 0) - student.paidAmount;

        await Notification.create({
          recipient: owner._id,
          recipientRole: "OWNER",
          message: `Fee collected from ${student.studentName} (${student.studentId}): Rs. ${amountNum.toLocaleString()} paid | Remaining Balance: Rs. ${newRemainingBalance.toLocaleString()}`,
          type: "FINANCE",
          relatedId: transaction._id,
        });

        // Special notification if student is now FULLY PAID
        if (student.feeStatus === "paid" && oldFeeStatus !== "paid") {
          await Notification.create({
            recipient: owner._id,
            recipientRole: "OWNER",
            message: `✅ ${student.studentName} (${student.studentId}) has FULLY PAID their fee of Rs. ${student.totalFee.toLocaleString()}`,
            type: "FINANCE",
            relatedId: student._id,
          });
        }
      }
    } catch (e) {
      console.log("Notification creation skipped:", e.message);
    }

    // --- RESPONSE ---
    res.status(201).json({
      success: true,
      message: `Fee collected! Receipt: ${feeRecord.receiptNumber}`,
      data: { feeRecord },
    });
  } catch (error) {
    console.error("CollectFee Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
```

---

### STEP 5: Backend Controller — `getFeeHistory`

```javascript
exports.getFeeHistory = async (req, res) => {
  try {
    const records = await FeeRecord.find({ student: req.params.id }).sort({ createdAt: -1 });
    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

---

### STEP 6: Routes

```javascript
const { collectFee, getFeeHistory } = require("../controllers/studentController");
const { protect } = require("../middleware/authMiddleware");

// POST /api/students/:id/collect-fee — Collect fee payment
router.post("/:id/collect-fee", protect, collectFee);

// GET /api/students/:id/fee-history — Get payment history
router.get("/:id/fee-history", protect, getFeeHistory);
```

---

### STEP 7: Frontend — The Perfect Collect Fee Modal

Replace your current Collect Fee dialog with this exact implementation:

#### State Variables (add to your Students page component):
```tsx
// Fee Collection Modal State
const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
const [feeStudent, setFeeStudent] = useState<any | null>(null);
const [feeAmount, setFeeAmount] = useState("");
const [feeMonth, setFeeMonth] = useState("");
const [feeSuccess, setFeeSuccess] = useState<any | null>(null);
```

#### Mutation (add to your Students page component):
```tsx
const collectFeeMutation = useMutation({
  mutationFn: async ({
    studentId,
    amount,
    month,
  }: {
    studentId: string;
    amount: number;
    month: string;
  }) => {
    const res = await fetch(
      `${API_BASE_URL}/api/students/${studentId}/collect-fee`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount, month }),
      },
    );
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to collect fee");
    }
    return res.json();
  },
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ["students"] });
    setFeeSuccess(data.data);
  },
  onError: (error: any) => {
    toast.error("Fee Collection Failed", {
      description: error.message || "Failed to collect fee",
      duration: 4000,
    });
  },
});
```

#### Month Options Helper:
```tsx
const getMonthOptions = () => {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthStr = date.toLocaleString("default", { month: "long", year: "numeric" });
    months.push(monthStr);
  }
  return months;
};
```

#### Handler Functions:
```tsx
const handleCollectFee = (student: any) => {
  if (!student || !student._id) {
    toast.error("Invalid Student", {
      description: "Student data is missing. Please refresh and try again.",
    });
    return;
  }
  setFeeStudent(student);
  setFeeAmount("");
  setFeeMonth(getMonthOptions()[0] || "");
  setFeeSuccess(null);
  setIsFeeModalOpen(true);
};

const submitFeeCollection = () => {
  if (!feeStudent || !feeStudent._id) {
    toast.error("Invalid Student", { description: "Student information is missing." });
    return;
  }
  if (!feeAmount || parseFloat(feeAmount) <= 0) {
    toast.error("Invalid Amount", { description: "Please enter a valid fee amount greater than 0." });
    return;
  }
  if (!feeMonth) {
    toast.error("Missing Month", { description: "Please select a month for this fee collection." });
    return;
  }
  collectFeeMutation.mutate({
    studentId: feeStudent._id,
    amount: parseFloat(feeAmount),
    month: feeMonth,
  });
};

const closeFeeModal = () => {
  setIsFeeModalOpen(false);
  setFeeStudent(null);
  setFeeSuccess(null);
  setFeeAmount("");
  setFeeMonth("");
};
```

#### The Collect Fee Button (in your student row actions column):
```tsx
{student.studentStatus !== "Withdrawn" && (
  <Button
    variant="ghost"
    size="icon"
    className="h-8 w-8 hover:bg-green-50 hover:text-green-600"
    onClick={() => handleCollectFee(student)}
    title="Collect Fee"
  >
    <DollarSign className="h-4 w-4" />
  </Button>
)}
```

#### The Complete Modal JSX:
```tsx
{/* Fee Collection Modal */}
<Dialog open={isFeeModalOpen} onOpenChange={(open) => !open && closeFeeModal()}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-green-600" />
        Collect Fee
      </DialogTitle>
      <DialogDescription>
        {feeStudent
          ? `Collecting fee for ${feeStudent?.studentName || feeStudent?.name || "Student"} (${feeStudent?.studentId || "N/A"})`
          : "Loading student information..."}
      </DialogDescription>
    </DialogHeader>

    {feeSuccess ? (
      /* ========== SUCCESS STATE ========== */
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center py-6">
          <CheckCircle className="h-20 w-20 text-green-500 mb-3" />
          <h3 className="text-xl font-bold text-green-700">Fee Collected!</h3>
        </div>

        <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">Amount Collected</span>
            <span className="text-lg font-bold text-green-700 dark:text-green-300">
              Rs. {feeSuccess?.feeRecord?.amount?.toLocaleString() || "0"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">Collection Month</span>
            <span className="font-semibold text-foreground">
              {feeSuccess?.feeRecord?.month || "N/A"}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={closeFeeModal} className="w-full bg-green-600 hover:bg-green-700">
            Done
          </Button>
        </DialogFooter>
      </div>
    ) : (
      /* ========== COLLECTION FORM ========== */
      <div className="space-y-4">
        {/* Student Financial Summary — THE KEY FEATURE */}
        {feeStudent && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Fee</p>
                <p className="font-semibold text-blue-700 dark:text-blue-300">
                  Rs. {Number(feeStudent.totalFee || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Paid Amount</p>
                <p className="font-semibold text-green-700 dark:text-green-300">
                  Rs. {Number(feeStudent.paidAmount || 0).toLocaleString()}
                </p>
              </div>
              <div className="col-span-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                <p className="text-xs text-muted-foreground mb-1">Remaining Balance</p>
                <p className="font-bold text-lg text-purple-700 dark:text-purple-300">
                  Rs. {(Number(feeStudent.totalFee || 0) - Number(feeStudent.paidAmount || 0)).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Month — Read-only, auto-set to current month */}
        <div className="space-y-2">
          <Label htmlFor="feeMonth" className="text-sm font-medium">Collection Month</Label>
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border rounded-md">
            <span className="text-sm font-medium text-muted-foreground">{feeMonth}</span>
            <span className="ml-auto text-xs text-muted-foreground">(Current Month)</span>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="feeAmount">Amount (Rs.)</Label>
          <Input
            id="feeAmount"
            type="number"
            placeholder="Enter fee amount"
            value={feeAmount}
            onChange={(e) => setFeeAmount(e.target.value)}
            min={0}
          />
        </div>

        {/* 70/30 Split Note */}
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-sm">
          <p className="text-blue-700 dark:text-blue-300">
            <strong>Note:</strong> Fee will be automatically split:
          </p>
          <ul className="mt-1 text-blue-600 dark:text-blue-400 text-xs space-y-0.5">
            <li>• 70% → Teacher's Unverified Balance</li>
            <li>• 30% → Academy's Unverified Balance</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={closeFeeModal}>Cancel</Button>
          <Button
            onClick={submitFeeCollection}
            disabled={!feeAmount || parseFloat(feeAmount) <= 0 || collectFeeMutation.isPending}
          >
            {collectFeeMutation.isPending ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Processing...
              </>
            ) : (
              <>
                <DollarSign className="mr-2 h-4 w-4" />
                Collect Fee
              </>
            )}
          </Button>
        </DialogFooter>
      </div>
    )}
  </DialogContent>
</Dialog>
```

---

### STEP 8: Fee Status Display in Students Table

The student table should show a colored badge for fee status:

```tsx
<TableCell className="text-center">
  <div
    className="inline-flex items-center justify-center"
    style={{
      filter:
        student.feeStatus === "paid" || student.feeStatus === "Paid"
          ? "drop-shadow(0 0 8px rgba(34, 197, 94, 0.3))"   // green glow
          : "drop-shadow(0 0 8px rgba(217, 119, 6, 0.3))",  // amber glow
    }}
  >
    <StatusBadge status={student.feeStatus} />
  </div>
</TableCell>
```

Where `StatusBadge` renders:
- **paid** → green badge "Paid"
- **partial** → amber/orange badge "Partial"  
- **pending** → red badge "Pending"

---

## ARCHITECTURAL NOTES

### The Manual Payroll Model (70/30 Split)

The 70/30 split note is **informational only** at collection time. The actual split happens during **payroll/teacher payout**, NOT during fee collection. Here's why:

1. **Fee Collection** → Records FULL amount as a single `INCOME` / `FLOATING` transaction
2. **Daily Closing** → Staff verifies cash, FLOATING → VERIFIED
3. **Teacher Payout** → Owner manually pays teachers, creating `EXPENSE` / `Teacher Payout` transactions

The `splitBreakdown` fields exist on FeeRecord for future use but are **not populated** during collection. This is intentional — it gives the owner flexibility to adjust payouts.

### Fee Status Lifecycle

```
Student Created → feeStatus: "pending" (paidAmount = 0)
    ↓
First partial payment → feeStatus: "partial" (0 < paidAmount < totalFee)
    ↓
Full payment → feeStatus: "paid" (paidAmount >= totalFee)
```

The `feeStatus` is computed by the Student model's pre-save hook. It should NEVER be manually set via API updates.

### Transaction Status Lifecycle

```
Fee collected → status: "FLOATING" (unverified cash in collector's hands)
    ↓
Daily closing → status: "VERIFIED" (cash deposited/accounted for)
    ↓
(If refund needed) → status: "REFUNDED"
```

---

## WHAT TO REMOVE FROM YOUR CURRENT DIALOG

1. **Remove the Subject dropdown** — Fee collection is per-student, not per-subject. Use `"General"` as the subject in the backend.
2. **Remove the Month dropdown** — Replace with a read-only display showing the current month. The month is auto-set when the modal opens.

## WHAT TO ADD TO YOUR CURRENT DIALOG

1. **Student Financial Summary** — The blue/purple gradient box showing Total Fee, Paid Amount, and Remaining Balance
2. **Success State** — After successful collection, show a green checkmark screen with amount and month
3. **Backend validation** — Amount cannot exceed remaining balance
4. **Receipt number generation** — Auto-generate `FEE-YYYYMM-XXXX` format
5. **Transaction creation** — Create an INCOME/FLOATING transaction for every fee collection
6. **Notification system** — Notify OWNER on every collection, special notification on FULLY PAID
7. **Collector cash tracking** — Update `req.user.totalCash` for daily closing

---

## COMPLETE CHECKLIST

### Backend:
- [ ] Student model has `feeStatus`, `totalFee`, `paidAmount`, `sessionRate`, `discountAmount`
- [ ] Student model has `balance` virtual field (`Math.max(0, totalFee - paidAmount)`)
- [ ] Student model pre-save hook auto-calculates `feeStatus`
- [ ] Student update route strips `feeStatus` from body (`delete updateData.feeStatus`)
- [ ] FeeRecord model exists with all fields (student, amount, month, receiptNumber, etc.)
- [ ] FeeRecord pre-save generates receipt number (`FEE-YYYYMM-XXXX`)
- [ ] Transaction model supports `INCOME`/`FLOATING` entries
- [ ] `collectFee` controller validates: amount > 0, amount ≤ remaining balance
- [ ] `collectFee` creates FeeRecord + updates student.paidAmount + creates Transaction
- [ ] `collectFee` tracks collector's totalCash
- [ ] `collectFee` sends notification to OWNER
- [ ] `collectFee` sends special notification on FULLY PAID status change
- [ ] `getFeeHistory` returns all FeeRecords for a student sorted by date desc
- [ ] Routes: `POST /:id/collect-fee` and `GET /:id/fee-history` with auth protection

### Frontend:
- [ ] Modal state: `isFeeModalOpen`, `feeStudent`, `feeAmount`, `feeMonth`, `feeSuccess`
- [ ] `handleCollectFee` sets student, resets form, auto-sets current month
- [ ] `submitFeeCollection` validates amount > 0 and month exists before calling API
- [ ] `collectFeeMutation` POSTs to `/api/students/:id/collect-fee` with `{ amount, month }`
- [ ] On success: sets `feeSuccess` to show success screen, invalidates students query
- [ ] On error: shows toast with backend error message
- [ ] Modal shows Student Financial Summary (Total Fee, Paid Amount, Remaining Balance)
- [ ] Month is read-only (auto-set to current month, NOT a dropdown)
- [ ] NO Subject field in the modal
- [ ] Amount input is `type="number"` with `min={0}`
- [ ] 70/30 split note displayed as informational text
- [ ] Collect Fee button disabled while `isPending` or amount invalid
- [ ] Success state shows green checkmark, amount collected, collection month
- [ ] "Done" button closes modal and resets all state
- [ ] Fee Status column shows colored badge with glow effect
- [ ] Collect Fee button ($) only visible for non-Withdrawn students

---

## TESTING VERIFICATION

After implementation, verify:

1. **Open modal** → Shows Total Fee, Paid Amount, Remaining Balance correctly
2. **Month auto-set** → Shows current month (e.g., "March 2026"), not editable
3. **Collect partial** → Enter amount less than remaining balance → Status changes to "Partial"
4. **Collect remaining** → Enter exact remaining balance → Status changes to "Paid"
5. **Over-collection blocked** → Enter amount > remaining balance → Backend returns error
6. **Success screen** → After collection, see green checkmark with amount and month
7. **List refreshes** → After closing modal, student's fee status badge updated
8. **FeeRecord created** → Check database for new FeeRecord with receipt number
9. **Transaction created** → Check database for new INCOME/FLOATING transaction
10. **Notification sent** → OWNER receives notification bell/badge
