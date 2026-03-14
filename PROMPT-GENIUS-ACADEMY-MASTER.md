# MASTER PROMPT: Bring Genius Academy ERP to Perfection

> **Context**: We have a fully working, battle-tested ERP system (SCA Academia) that we fixed from the ground up — Dashboard crashes, Payroll showing 0, Sidebar items hidden, Fee collection missing validation, Receipt PDFs missing schedule data, and more. Your system (Genius Academy ERP) shares the same codebase architecture (Node.js + Express + Mongoose backend, React + Vite + TypeScript + Tailwind + shadcn/ui + TanStack React Query frontend). This prompt gives you EVERY fix and pattern we implemented so you can apply them to bring Genius Academy to the same level of perfection. **Attendance module is NOT needed for Genius Academy — skip anything attendance-related.**

---

## TABLE OF CONTENTS

1. [FIX 1: Dashboard White Screen Crash — Hooks Order](#fix-1-dashboard-white-screen-crash)
2. [FIX 2: Dashboard Welcome Banner — Dynamic Admin Name](#fix-2-dashboard-welcome-banner)
3. [FIX 3: Payroll White Screen Crash — Hooks Order](#fix-3-payroll-white-screen-crash)
4. [FIX 4: Payroll Total Earned = 0 — CREDIT + LIABILITY Aggregation](#fix-4-payroll-total-earned--0)
5. [FIX 5: Sidebar Configuration Hidden — Flexbox Restructure](#fix-5-sidebar-configuration-hidden)
6. [FIX 6: Fee Collection Modal — Complete Overhaul](#fix-6-fee-collection-modal)
7. [FIX 7: Fee Status Auto-Calculation — Pre-Save Hook](#fix-7-fee-status-auto-calculation)
8. [FIX 8: Student Receipt PDF — Schedule Table with Teachers & Timings](#fix-8-receipt-pdf-with-schedule)
9. [FIX 9: Negative Balance Display Prevention](#fix-9-negative-balance-prevention)
10. [FIX 10: Subject Price Locking at Admission](#fix-10-subject-price-locking)
11. [Architecture: Manual Payroll Model](#architecture-manual-payroll-model)
12. [Architecture: Configuration Singleton](#architecture-configuration-singleton)
13. [Architecture: Transaction Stream Taxonomy](#architecture-transaction-stream-taxonomy)
14. [Complete Verification Checklist](#verification-checklist)

---

## FIX 1: Dashboard White Screen Crash

### The Problem
The Dashboard component has a conditional early return like `if (loading) return <Loading />` that appears **before** React hooks (`useState`, `useEffect`, `useQuery`). This violates React's Rules of Hooks — hooks must be called in the same order every render. The result: **white screen crash** on navigation.

### The Fix
Move ALL hooks to the TOP of the component, BEFORE any conditional return:

```tsx
const Dashboard = () => {
  // ✅ ALL hooks FIRST — before any conditional return
  const [systemAdminName, setSystemAdminName] = useState<string>("");
  const [stats, setStats] = useState({...});
  const { data, isLoading } = useQuery({...});
  
  useEffect(() => {
    // fetch configuration, stats, etc.
  }, []);

  // ✅ Conditional returns AFTER all hooks
  if (isLoading) return <Loading />;
  if (error) return <Error />;

  return <div>...</div>;
};
```

### Rules
- **NEVER** place a `return` statement before a hook call
- **NEVER** wrap hooks inside `if` blocks or conditionals
- Search your Dashboard component for any `return` that appears before `useState`, `useEffect`, `useQuery`, `useMutation`, or `useQueryClient` calls and move the hooks above it

---

## FIX 2: Dashboard Welcome Banner

### The Problem
The dashboard shows a generic "Welcome, Admin" instead of the actual academy owner's name.

### The Fix
Fetch the admin name from the Configuration API and display it dynamically:

```tsx
const [systemAdminName, setSystemAdminName] = useState<string>("");

useEffect(() => {
  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/config`, { credentials: "include" });
      const data = await res.json();
      if (data.success && data.data?.systemAdminName) {
        setSystemAdminName(data.data.systemAdminName);
      }
    } catch (e) {
      console.log("Config fetch failed:", e);
    }
  };
  fetchConfig();
}, []);

// In render:
<h1>Welcome back, <span className="text-red-400">{systemAdminName || "System Admin"}</span></h1>
```

### Backend Requirement
Your Configuration model needs a `systemAdminName` field:
```javascript
systemAdminName: {
  type: String,
  default: "System Admin",
  trim: true,
}
```

And a GET endpoint (e.g., `GET /api/config` or `GET /config`) that returns the configuration document.

---

## FIX 3: Payroll White Screen Crash

### The Problem
Same as Fix 1 but on the Payroll page. A non-owner role check like `if (user?.role !== "OWNER") return <AccessDenied />` appears before `useQuery` / `useMutation` hooks.

### The Fix
```tsx
const Payroll = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // ✅ ALL state hooks first
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  // ... all other useState calls ...
  
  // ✅ ALL query/mutation hooks second
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["payroll-dashboard"],
    queryFn: () => payrollApi.getDashboard(),
  });
  
  const { data: sessionsData } = useQuery({...});
  const { data: classesData } = useQuery({...});
  
  const payTeacherMutation = useMutation({...});
  const manualCreditMutation = useMutation({...});
  
  // ✅ THEN the role guard — AFTER all hooks
  if (user?.role !== "OWNER") {
    return (
      <DashboardLayout title="Payroll">
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <AlertCircle className="h-16 w-16 text-red-500" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">Only the Academy Owner can access payroll.</p>
        </div>
      </DashboardLayout>
    );
  }
  
  // Regular render below...
};
```

**Action**: Search your Payroll.tsx for any early return before hooks. Move ALL hooks above ALL conditional returns.

---

## FIX 4: Payroll Total Earned = 0

### The Problem
The Payroll Dashboard shows **Total Earned = 0** for all teachers. The backend aggregation pipeline only queries `type: "CREDIT"` transactions, but many teacher credits are recorded as `type: "LIABILITY"` (manual credits, payroll credits). The `$match` filter misses them entirely.

### The Fix
In your payroll controller's dashboard function, find the aggregation that calculates total earnings per teacher and change the `$match` to include BOTH types:

**BEFORE (broken):**
```javascript
const creditTotals = await Transaction.aggregate([
  { $match: { type: "CREDIT", "splitDetails.teacherId": { $ne: null } } },
  { $group: { _id: "$splitDetails.teacherId", total: { $sum: "$amount" } } },
]);
```

**AFTER (fixed):**
```javascript
const creditTotals = await Transaction.aggregate([
  { $match: { type: { $in: ["CREDIT", "LIABILITY"] }, "splitDetails.teacherId": { $ne: null } } },
  { $group: { _id: "$splitDetails.teacherId", total: { $sum: "$amount" } } },
]);
```

### Why This Matters
The Manual Payroll Model records teacher shares as LIABILITY when crediting them (since it's money the academy owes the teacher). If you only query CREDIT, you get 0. Adding LIABILITY captures all the real earned amounts.

### How to Find It
Search your payroll controller for:
- `Transaction.aggregate` near a `type: "CREDIT"` match
- Any aggregation pipeline building `totalEarned` or `creditTotals`
- Look for `$match: { type: "CREDIT"` and add `"LIABILITY"` to a `$in` array

---

## FIX 5: Sidebar Configuration Hidden

### The Problem
The Configuration menu item exists in the sidebar nav array but is **not visible** because the sidebar uses absolute positioning or overflow:hidden that clips the bottom items.

### The Fix
Restructure the sidebar to use a **flexbox column layout** with 3 zones:

```tsx
<aside className="fixed left-0 top-0 z-40 h-screen bg-sidebar flex flex-col">
  {/* Zone 1: Header/Logo — fixed height */}
  <div className="shrink-0 p-4">
    <img src={logo} />
    <h2>Academy Name</h2>
  </div>
  
  {/* Zone 2: Nav — scrollable, takes remaining space */}
  <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
    {navItems.map(item => <NavLink ... />)}
  </nav>
  
  {/* Zone 3: System Apps — fixed at bottom */}
  <div className="shrink-0 border-t px-3 py-2">
    {systemItems.map(item => <NavLink ... />)}
  </div>
  
  {/* Zone 4: Collapse toggle */}
  <div className="shrink-0 p-2">
    <Button onClick={toggleSidebar}>...</Button>
  </div>
</aside>
```

### Key CSS Properties
| Element | Class | Purpose |
|---|---|---|
| `<aside>` | `flex flex-col h-screen` | Column layout, full height |
| Header | `shrink-0` | Never shrinks |
| `<nav>` | `flex-1 min-h-0 overflow-y-auto` | Takes remaining space, scrolls when needed |
| Bottom items | `shrink-0` | Never shrinks, always visible |

### Critical Detail
- `min-h-0` on the nav section is **essential** — without it, flexbox children won't shrink below their content size and overflow-y-auto won't kick in
- Configuration should be an `ownerOnly: true` nav item so only OWNER role sees it

---

## FIX 6: Fee Collection Modal — Complete Overhaul

### The Problem
The Collect Fee dialog is basic — just Month dropdown + Subject dropdown + Amount input. It's missing financial context, validation, success feedback, and proper transaction recording.

### The Perfect Implementation

#### What the Modal Must Show:
1. **Student Financial Summary** (read-only gradient box):
   - Total Fee: `Rs. {student.totalFee}`
   - Paid Amount: `Rs. {student.paidAmount}`
   - Remaining Balance: `Rs. {totalFee - paidAmount}` (bold, prominent)

2. **Collection Month**: Auto-set to current month, **read-only** (NOT a dropdown)

3. **Amount (Rs.)**: Numeric input

4. **70/30 Split Note**: Informational text:
   ```
   Note: Fee will be automatically split:
   • 70% → Teacher's Unverified Balance
   • 30% → Academy's Unverified Balance
   ```

5. **Success State**: After collection → green checkmark, amount, month, "Done" button

#### What to REMOVE:
- ❌ Subject dropdown — use `"General"` as default in backend
- ❌ Month dropdown — replace with read-only current month display

#### Frontend State:
```tsx
const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
const [feeStudent, setFeeStudent] = useState<any | null>(null);
const [feeAmount, setFeeAmount] = useState("");
const [feeMonth, setFeeMonth] = useState("");
const [feeSuccess, setFeeSuccess] = useState<any | null>(null);
```

#### Frontend Mutation:
```tsx
const collectFeeMutation = useMutation({
  mutationFn: async ({ studentId, amount, month }) => {
    const res = await fetch(`${API_BASE_URL}/api/students/${studentId}/collect-fee`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ amount, month }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to collect fee");
    }
    return res.json();
  },
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ["students"] });
    setFeeSuccess(data.data);  // Switch to success screen
  },
  onError: (error) => {
    toast.error("Fee Collection Failed", { description: error.message });
  },
});
```

#### Backend `collectFee` Controller — Complete 5-Step Flow:
```javascript
const calculateFeeStatus = (paidAmount, totalFee) => {
  const paid = Number(paidAmount) || 0;
  const total = Number(totalFee) || 0;
  if (paid >= total && total > 0) return "paid";
  if (paid > 0 && paid < total) return "partial";
  return "pending";
};

exports.collectFee = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, month, paymentMethod, notes } = req.body;

    if (!amount || !month) {
      return res.status(400).json({ success: false, message: "Amount and month required" });
    }

    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    const amountNum = Number(amount);
    if (amountNum <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be greater than 0" });
    }

    // STEP 1: Prevent overpayment
    const remainingBalance = (student.totalFee || 0) - (student.paidAmount || 0);
    if (amountNum > remainingBalance) {
      return res.status(400).json({
        success: false,
        message: `Amount (Rs. ${amountNum.toLocaleString()}) exceeds remaining balance (Rs. ${remainingBalance.toLocaleString()})`,
      });
    }

    // STEP 2: Create FeeRecord
    const feeRecord = await FeeRecord.create({
      student: student._id,
      studentName: student.studentName,
      className: student.class,
      subject: "General",
      amount: amountNum,
      month,
      status: "PAID",
      collectedBy: req.user?._id,
      collectedByName: req.user?.fullName || "Staff",
      paymentMethod: paymentMethod || "CASH",
      notes,
    });

    // STEP 3: Update student's paidAmount + feeStatus
    const oldFeeStatus = student.feeStatus;
    student.paidAmount = (student.paidAmount || 0) + amountNum;
    student.feeStatus = calculateFeeStatus(student.paidAmount, student.totalFee || 0);
    await student.save();

    // STEP 4: Create INCOME Transaction (FLOATING until verified at daily close)
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

    // STEP 5: Track collector's cash for daily closing
    if (req.user?._id) {
      try {
        const collector = await User.findById(req.user._id);
        if (collector) {
          collector.totalCash = (collector.totalCash || 0) + amountNum;
          await collector.save();
        }
      } catch (e) { console.log("TotalCash update skipped:", e.message); }
    }

    // STEP 6: Notify OWNER
    try {
      const owner = await User.findOne({ role: "OWNER" });
      if (owner) {
        const newRemaining = (student.totalFee || 0) - student.paidAmount;
        await Notification.create({
          recipient: owner._id,
          recipientRole: "OWNER",
          message: `Fee collected from ${student.studentName} (${student.studentId}): Rs. ${amountNum.toLocaleString()} paid | Remaining: Rs. ${newRemaining.toLocaleString()}`,
          type: "FINANCE",
          relatedId: transaction._id,
        });
        // Special notification when FULLY PAID
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
    } catch (e) { console.log("Notification skipped:", e.message); }

    res.status(201).json({
      success: true,
      message: `Fee collected! Receipt: ${feeRecord.receiptNumber}`,
      data: { feeRecord },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

#### Routes:
```javascript
router.post("/:id/collect-fee", protect, collectFee);
router.get("/:id/fee-history", protect, getFeeHistory);
```

---

## FIX 7: Fee Status Auto-Calculation

### The Problem
Fee status can get out of sync if it's manually set or not updated on every payment.

### The Fix
The Student model's **pre-save hook** automatically calculates `feeStatus` on every save:

```javascript
studentSchema.pre("save", async function () {
  // Cast to numbers
  if (this.totalFee !== undefined) this.totalFee = Number(this.totalFee);
  if (this.paidAmount !== undefined) this.paidAmount = Number(this.paidAmount);

  const totalFee = Number(this.totalFee) || 0;
  const paidAmount = Number(this.paidAmount) || 0;

  if (paidAmount >= totalFee && totalFee > 0) this.feeStatus = "paid";
  else if (paidAmount > 0 && paidAmount < totalFee) this.feeStatus = "partial";
  else this.feeStatus = "pending";
});
```

### Critical Rule
In your student UPDATE route, **strip feeStatus from the request body** to prevent manual override:
```javascript
// In PUT /api/students/:id handler
delete updateData.feeStatus;  // Let pre-save hook handle it
```

---

## FIX 8: Receipt PDF — Schedule Table with Teachers & Timings

### The Problem
The student receipt/admission slip only shows a bullet list of subject names. No teacher names, no class timings. This makes the receipt much less useful.

### The Fix — 3 Files Need Changes

#### File 1: Backend `trackPrint` Controller
When generating a receipt, also fetch the class timetable and group by subject:

```javascript
exports.trackPrint = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    const version = (student.printHistory?.length || 0) + 1;
    const receiptId = `TOKEN-${student.studentId}-${Math.random().toString(36).substr(2, 4).toUpperCase()}-V${version}`;
    const isOriginal = version === 1;
    const printedAt = new Date();

    student.printHistory = student.printHistory || [];
    student.printHistory.push({ receiptId, printedAt, version });
    await student.save();

    // Fetch class timetable — group by subject for receipt
    let schedule = [];
    if (student.classRef) {
      try {
        const Timetable = require("../models/Timetable");
        const entries = await Timetable.find({
          classId: student.classRef,
          status: "active",
        }).populate("teacherId", "teacherName fullName");

        const subjectMap = new Map();
        for (const entry of entries) {
          const key = entry.subject;
          if (!subjectMap.has(key)) {
            subjectMap.set(key, {
              subject: entry.subject,
              teacherName: entry.teacherId?.teacherName || entry.teacherId?.fullName || "—",
              time: `${entry.startTime} – ${entry.endTime}`,
              days: [entry.day],
            });
          } else {
            const existing = subjectMap.get(key);
            if (!existing.days.includes(entry.day)) {
              existing.days.push(entry.day);
            }
          }
        }
        schedule = Array.from(subjectMap.values());
      } catch (e) { console.log("Schedule fetch skipped:", e.message); }
    }

    res.json({
      success: true,
      data: { receiptId, version, isOriginal, printedAt, student, schedule },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

#### File 2: `usePDFReceipt` Hook
Pass schedule data through to the PDF renderer:

```tsx
const receiptData = {
  student: {
    ...result.data.student,
    schedule: result.data.schedule || [],  // ← ADD THIS
  },
  receiptConfig: {
    receiptId: result.data.receiptId,
    version: result.data.version,
    isOriginal: result.data.isOriginal ?? (result.data.version === 1),
    printedAt: result.data.printedAt || new Date(),
  },
};
```

#### File 3: `ReceiptPDF.tsx` — Add schedule to interface + render table

**Add to StudentPDFData interface:**
```tsx
export interface StudentPDFData {
  // ...existing fields...
  schedule?: Array<{
    subject: string;
    teacherName: string;
    time: string;
    days: string[];
  }>;
}
```

**Add styles:**
```tsx
// Schedule table styles
scheduleSection: { marginTop: 8, paddingTop: 8, borderTop: "1pt solid #e5e7eb" },
scheduleTitle: { fontSize: 9, fontWeight: 700, color: "#374151", marginBottom: 4 },
scheduleHeader: {
  flexDirection: "row",
  backgroundColor: "#1a365d",
  paddingVertical: 3,
  paddingHorizontal: 3,
},
scheduleRow: {
  flexDirection: "row",
  paddingVertical: 2,
  paddingHorizontal: 3,
  borderBottom: "0.5pt solid #e5e7eb",
},
scheduleRowAlt: { backgroundColor: "#f8fafc" },
scheduleColSubject: { flex: 1.1 },
scheduleColTeacher: { flex: 1.4 },
scheduleColTime: { flex: 1.1 },
scheduleHeaderText: { fontSize: 7, fontWeight: 700, color: "#ffffff", textTransform: "uppercase", letterSpacing: 0.5 },
scheduleSubjectText: { fontSize: 8, color: "#1a365d", fontWeight: 700 },
scheduleTeacherText: { fontSize: 7.5, color: "#374151" },
scheduleTimeText: { fontSize: 7, color: "#4b5563" },
```

**Replace the bullet list with a conditional schedule table:**
```tsx
{student.schedule && student.schedule.length > 0 ? (
  <View style={styles.scheduleSection}>
    <Text style={styles.scheduleTitle}>Class Schedule:</Text>
    {/* Header */}
    <View style={styles.scheduleHeader}>
      <Text style={[styles.scheduleColSubject, styles.scheduleHeaderText]}>Subject</Text>
      <Text style={[styles.scheduleColTeacher, styles.scheduleHeaderText]}>Teacher</Text>
      <Text style={[styles.scheduleColTime, styles.scheduleHeaderText]}>Time</Text>
    </View>
    {/* Rows */}
    {student.schedule.map((s, idx) => (
      <View key={idx} style={[styles.scheduleRow, idx % 2 !== 0 ? styles.scheduleRowAlt : {}]}>
        <Text style={[styles.scheduleColSubject, styles.scheduleSubjectText]}>{s.subject}</Text>
        <Text style={[styles.scheduleColTeacher, styles.scheduleTeacherText]}>{s.teacherName}</Text>
        <Text style={[styles.scheduleColTime, styles.scheduleTimeText]}>{s.time}</Text>
      </View>
    ))}
  </View>
) : (
  /* Fallback: bullet list if no timetable data */
  student.subjects?.length > 0 && (
    <View style={styles.subjectsSection}>
      <Text style={styles.subjectsTitle}>Enrolled Subjects:</Text>
      {student.subjects.map((s, idx) => (
        <View key={idx} style={styles.subjectItem}>
          <Text style={styles.subjectBullet}>•</Text>
          <Text style={styles.subjectName}>{s.name}</Text>
        </View>
      ))}
    </View>
  )
)}
```

### Receipt Layout Overview
The PDF receipt is **half-letter size (8.5" × 5.5")** with this 3-column layout:

| Left (flex 1.4) | Center (flex 0.6) | Right (flex 0.8) |
|---|---|---|
| Student Name, Father, Class, Group, Contact | SMART GATE ID | FEE STATUS (PAID/PENDING) |
| **Schedule Table** (Subject / Teacher / Time) | Barcode image (CODE128) | Session Rate, Discount, Net Payable |
| | Student ID number | Paid, Balance |
| | "Scan for verification" | Authorized Signature line |

**Barcode**: Generated client-side using `JsBarcode` (CODE128 format) from the numeric `studentId`. Rendered as a Base64 PNG image in the PDF.

**Watermarks**: "DUPLICATE" on non-original copies (version > 1); academy name as subtle background watermark on all copies.

**Version tracking**: Each print creates a unique receipt ID (`TOKEN-{studentId}-{random}-V{version}`) stored in `student.printHistory[]`. V1 = ORIGINAL badge, V2+ = COPY badge.

---

## FIX 9: Negative Balance Prevention

### The Problem
Simple subtraction `totalFee - paidAmount` can show negative balance if overpayment somehow occurs.

### The Fix
Use `Math.max(0, ...)` everywhere balance is computed:

**Student model virtual:**
```javascript
studentSchema.virtual("balance").get(function () {
  return Math.max(0, this.totalFee - this.paidAmount);
});
```

**Frontend display:**
```tsx
const balance = Math.max(0, Number(student.totalFee || 0) - Number(student.paidAmount || 0));
```

**Backend collectFee:**
```javascript
const remainingBalance = (student.totalFee || 0) - (student.paidAmount || 0);
if (amountNum > remainingBalance) { /* reject */ }
```

---

## FIX 10: Subject Price Locking at Admission

### The Problem
If subject fees are read live from the Class model, changing a class fee retroactively changes all enrolled students' fees.

### The Fix
Copy subject prices from Class to Student at admission time (in the Student pre-save hook, only for new documents):

```javascript
if (this.isNew && this.classRef && (!this.subjects || this.subjects.length === 0)) {
  const Class = mongoose.model("Class");
  const classDoc = await Class.findById(this.classRef).lean();
  if (classDoc && classDoc.subjects) {
    this.subjects = classDoc.subjects.map(s => ({
      name: typeof s === "string" ? s : s.name,
      fee: typeof s === "object" ? s.fee || 0 : classDoc.baseFee || 0,
    }));
  }
}
```

This means:
- Student's subjects array is **immutable after enrollment**
- Changing a class fee only affects future enrollments
- Each student's receipt shows the fee they were charged, not the current class fee

---

## Architecture: Manual Payroll Model

The 70/30 split note in the fee collection modal is **informational only**. The actual system uses a **Manual Payroll Model**:

```
Fee Collection → INCOME transaction (FLOATING)
     ↓
Daily Closing → FLOATING → VERIFIED  
     ↓
Manual Credit → CREDIT/LIABILITY transaction per teacher
     ↓
Teacher Payout → EXPENSE transaction (Teacher Payout)
```

### Why Manual?
1. Not all fees split 70/30 — some classes are "partner" mode (100% to teacher)
2. Owner needs flexibility to adjust before paying
3. Decouples collection from teacher compensation
4. Payroll aggregation sums `CREDIT + LIABILITY` to calculate total earned

### Key Transaction Types
| Type | When Created | Purpose |
|---|---|---|
| `INCOME` | Fee collected | Revenue recorded |
| `CREDIT` | Manual credit to teacher | Teacher share allocated |
| `LIABILITY` | Payroll credit to teacher | Money owed to teacher |
| `EXPENSE` | Teacher paid out | Money disbursed |

### Payroll Dashboard Query
```javascript
const creditTotals = await Transaction.aggregate([
  { $match: { type: { $in: ["CREDIT", "LIABILITY"] }, "splitDetails.teacherId": { $ne: null } } },
  { $group: { _id: "$splitDetails.teacherId", total: { $sum: "$amount" } } },
]);
```

---

## Architecture: Configuration Singleton

A single Configuration document holds all system settings:

```javascript
const configurationSchema = new mongoose.Schema({
  // Academy Identity
  academyName: { type: String, default: "Academy" },
  systemAdminName: { type: String, default: "System Admin" },
  academyLogo: String,
  academyAddress: String,
  academyPhone: String,

  // Teacher Compensation (MUST sum to 100%)
  salaryConfig: {
    teacherShare: { type: Number, default: 70 },
    academyShare: { type: Number, default: 30 },
  },

  // Default Subject Fees
  defaultSubjectFees: [{ name: String, fee: Number }],

  // Session Pricing
  sessionPrices: [{ sessionId: ObjectId, sessionName: String, price: Number, isActive: Boolean }],

  // Financial Policies
  defaultLateFee: { type: Number, default: 500 },
  feeDueDay: { type: Number, enum: [1, 5, 10, 15], default: 10 },
});

// Pre-save: Validate salary split = 100%
configurationSchema.pre("save", function () {
  const total = this.salaryConfig.teacherShare + this.salaryConfig.academyShare;
  if (total !== 100) throw new Error(`Salary split must total 100%, got ${total}%`);
});
```

---

## Architecture: Transaction Stream Taxonomy

For granular revenue attribution, transactions use a `stream` field:

| Stream | Description |
|---|---|
| `ACADEMY_POOL` | 30% from staff tuition → Academy's share |
| `STAFF_TUITION` | Staff-taught subjects (70/30 split pool) |
| `OWNER_CHEMISTRY` | Owner's own subject (100% verified) |
| `PARTNER_CHEMISTRY`, `PARTNER_PHYSICS`, `PARTNER_BIO` | Partner teacher income |
| `UNALLOCATED_POOL` | 30% awaiting distribution |
| `JOINT_POOL` | Shared expenses pool |
| `TEACHER_LEDGER` | Per-teacher bonus/deduction entries |

This enables reports to show exactly where money came from and where it went.

---

## FeeRecord Model

Every individual payment is tracked:

```javascript
const feeRecordSchema = new mongoose.Schema({
  student: { type: ObjectId, ref: "Student", required: true },
  studentName: { type: String, required: true },
  className: { type: String, required: true },
  subject: String,
  amount: { type: Number, required: true, min: 1 },
  month: { type: String, required: true },
  status: { type: String, enum: ["PAID", "PENDING", "REFUNDED"], default: "PAID" },
  collectedBy: { type: ObjectId, ref: "User" },
  collectedByName: String,
  paymentMethod: { type: String, enum: ["CASH", "BANK", "ONLINE"], default: "CASH" },
  receiptNumber: { type: String, unique: true, sparse: true },
  splitBreakdown: {
    teacherShare: { type: Number, default: 0 },
    academyShare: { type: Number, default: 0 },
    teacherPercentage: { type: Number, default: 70 },
    academyPercentage: { type: Number, default: 30 },
  },
  notes: { type: String, maxlength: 500 },
  refundAmount: { type: Number, default: 0 },
  refundDate: Date,
  refundReason: String,
}, { timestamps: true });

// Auto-generate receipt number
feeRecordSchema.pre("save", async function () {
  if (this.isNew && !this.receiptNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    this.receiptNumber = `FEE-${year}${month}-${random}`;
  }
});

feeRecordSchema.index({ student: 1, month: 1 });
feeRecordSchema.index({ createdAt: -1 });
```

---

## Class Model — Subject Fees & Revenue Mode

```javascript
// Key fields in Class schema
subjects: [{ name: String, fee: Number }],          // Per-subject pricing
baseFee: { type: Number, default: 0 },               // Fallback fee
revenueMode: { type: String, enum: ["standard", "partner"], default: "standard" },
subjectTeachers: [{ subject: String, teacherId: ObjectId, teacherName: String }],
sessionType: { type: String, enum: ["regular", "etea", "mdcat", "ecat", "test-prep"] },
```

Pre-save hook migrates legacy string subjects to `{ name, fee }` objects.

---

## Verification Checklist

### Dashboard
- [ ] All `useState` / `useEffect` / `useQuery` hooks are BEFORE any conditional return
- [ ] Welcome banner fetches `systemAdminName` from Configuration API
- [ ] Fallback text if config fetch fails: `"System Admin"`

### Payroll
- [ ] All hooks (`useQuery`, `useMutation`, `useQueryClient`, `useState`) are BEFORE the role guard
- [ ] Role guard (`if (user?.role !== "OWNER")`) returns Access Denied page AFTER hooks
- [ ] Backend aggregation uses `$in: ["CREDIT", "LIABILITY"]` not just `"CREDIT"`
- [ ] `totalEarned` per teacher is correctly computed from the aggregation map

### Sidebar
- [ ] Sidebar uses `flex flex-col` layout with `h-screen`
- [ ] Nav section has `flex-1 min-h-0 overflow-y-auto`
- [ ] Configuration item visible to OWNER and scrollable to if list is long

### Fee Collection
- [ ] Collect Fee modal shows Total Fee, Paid Amount, Remaining Balance
- [ ] Month is auto-set to current month (read-only, not a dropdown)
- [ ] No Subject dropdown in modal
- [ ] Backend validates amount > 0 and amount ≤ remaining balance
- [ ] Backend creates FeeRecord + updates student.paidAmount + creates Transaction
- [ ] FeeRecord auto-generates receipt number (`FEE-YYYYMM-XXXX`)
- [ ] Transaction created as INCOME / FLOATING
- [ ] Collector's totalCash incremented
- [ ] Notification sent to OWNER on every collection
- [ ] Special notification on student becoming FULLY PAID
- [ ] Success screen shows green checkmark with amount and month
- [ ] Student list auto-refreshes after modal closes (React Query invalidation)

### Fee Status
- [ ] Student model has `feeStatus` enum: paid/partial/pending
- [ ] Pre-save hook auto-calculates feeStatus based on paidAmount vs totalFee
- [ ] Student update route strips feeStatus from body (`delete updateData.feeStatus`)
- [ ] `balance` virtual uses `Math.max(0, totalFee - paidAmount)`

### Receipt PDF
- [ ] `trackPrint` fetches timetable entries and groups by subject
- [ ] Schedule data (subject/teacher/time) passed through to PDF renderer
- [ ] PDF shows 3-column schedule table with navy header
- [ ] Fallback to bullet list if no timetable data
- [ ] Barcode generated from studentId (CODE128 format)
- [ ] Receipt versioning: V1 = ORIGINAL, V2+ = COPY with DUPLICATE watermark
- [ ] Print history tracked in student document

### Subject Pricing
- [ ] Subjects copied from Class to Student at admission (price locking)
- [ ] Subject prices immutable after enrollment
- [ ] Class model has `subjects: [{ name, fee }]` with baseFee fallback

### Configuration
- [ ] Singleton model with academyName, systemAdminName
- [ ] salaryConfig validates teacherShare + academyShare = 100%
- [ ] GET endpoint returns configuration for frontend use

---

## IMPORTANT NOTES

1. **Skip Attendance** — Genius Academy does not need the attendance/gatekeeper module
2. **Skip Student Photo Upload** — unless already present in Genius Academy
3. **Focus on** — Dashboard, Payroll, Sidebar, Fee Collection, Receipts, Finance tracking
4. **Test after each fix** — don't batch all fixes, verify each one works before moving to the next
5. **The hooks order fix (Fixes 1, 3) should be done FIRST** — they cause white screen crashes that block everything else
