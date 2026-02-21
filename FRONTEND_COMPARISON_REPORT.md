# Frontend Source Code Comparison Report

**SOURCE (genius):** `genius-academia/frontend/src`
**TARGET (sca):** `sca-academia/frontend/src`
**Generated:** 2026-02-21

---

## 1. Directory Listing Comparison

### pages/

| File | Genius | SCA | Status |
|------|--------|-----|--------|
| Admissions.tsx | ✅ | ✅ | Present in both |
| Attendance.tsx | ❌ | ✅ | **SCA-ONLY** |
| Classes.tsx | ✅ | ✅ | Present in both |
| Configuration.tsx | ✅ | ✅ | Present in both |
| Dashboard.tsx | ✅ | ✅ | Present in both |
| Finance.tsx | ✅ | ✅ | Present in both |
| Finance.tsx.backup | ✅ | ✅ | Present in both |
| FinanceNew.tsx | ✅ | ✅ | Present in both |
| Gatekeeper.tsx | ✅ | ✅ | Present in both |
| KioskRegister.tsx | ✅ | ✅ | Present in both |
| Leads.tsx | ✅ | ✅ | Present in both |
| Login.tsx | ✅ | ✅ | Present in both |
| NotFound.tsx | ✅ | ✅ | Present in both |
| Payroll.tsx | ✅ | ✅ | Present in both |
| PendingApprovals.tsx | ✅ | ✅ | Present in both |
| PublicLanding.tsx | ✅ | ✅ | Present in both |
| PublicRegister.tsx | ✅ | ✅ | Present in both |
| Reports.tsx | ✅ | ✅ | Present in both |
| SeatManagementPage.tsx | ✅ | ❌ | **GENIUS-ONLY** |
| Sessions.tsx | ✅ | ✅ | Present in both |
| StudentCard.tsx | ✅ | ✅ | Present in both |
| StudentPortal.tsx | ✅ | ✅ | Present in both |
| StudentProfile.tsx | ✅ | ✅ | Present in both |
| Students.tsx | ✅ | ✅ | Present in both |
| StudentSeatSelection.tsx | ✅ | ❌ | **GENIUS-ONLY** |
| TeacherProfile.tsx | ✅ | ✅ | Present in both |
| Teachers.tsx | ✅ | ✅ | Present in both |
| Timetable.tsx | ✅ | ✅ | Present in both |
| VerificationHub.tsx | ✅ | ✅ | Present in both |

### components/dashboard/

| File | Genius | SCA | Status |
|------|--------|-----|--------|
| AddTeacherModal.tsx | ✅ | ✅ | Present in both |
| Charts.tsx | ✅ | ✅ | Present in both |
| DeleteStudentDialog.tsx | ✅ | ✅ | Present in both |
| DeleteTeacherDialog.tsx | ✅ | ✅ | Present in both |
| HeaderBanner.tsx | ✅ | ✅ | Present in both |
| KPICard.tsx | ✅ | ✅ | Present in both |
| RevenueSplitCard.tsx | ✅ | ✅ | Present in both |
| TeacherFinanceModal.tsx | ✅ | ✅ | Present in both |
| TeacherPaymentReceipt.tsx | ✅ | ✅ | Present in both |
| ViewEditStudentModal.tsx | ✅ | ✅ | Present in both |
| ViewEditTeacherModal.tsx | ✅ | ✅ | Present in both |
| WithdrawStudentDialog.tsx | ✅ | ❌ | **GENIUS-ONLY** |

### components/finance/

| File | Genius | SCA | Status |
|------|--------|-----|--------|
| AddExpenseDialog.tsx | ✅ | ✅ | Present in both |
| DayClosingModal.tsx | ✅ | ✅ | Present in both |
| ExpenseTracker.tsx | ✅ | ✅ | Present in both |
| FeeReceipt.tsx | ✅ | ✅ | Present in both |
| PaymentReceipt.tsx | ✅ | ✅ | Present in both |
| TeacherPayrollTable.tsx | ✅ | ✅ | Present in both |

### components/print/

| File | Genius | SCA | Status |
|------|--------|-----|--------|
| MiscPaymentPDF.tsx | ✅ | ✅ | Present in both |
| ReceiptPDF.BACKUP.tsx | ✅ | ❌ | **GENIUS-ONLY** |
| ReceiptPDF.tsx | ✅ | ✅ | Present in both |
| ReceiptTemplate.tsx | ✅ | ✅ | Present in both |
| StudentIDCardPDF.tsx | ✅ | ✅ | Present in both |
| TeacherPaymentPDF.tsx | ✅ | ✅ | Present in both |
| TeacherPaymentVoucherPDF.tsx | ✅ | ✅ | Present in both |

---

## 2. File-by-File Comparison

---

### 2.1 pages/Dashboard.tsx

| Metric | Genius | SCA |
|--------|--------|-----|
| Lines | 1926 | 1926 |
| Status | **DIFFERENT** (branding only) | |
| Diff Lines | 12 | |

**Differences:** Branding text changes only. All 6 changed lines are academy name substitutions:

| Genius | SCA |
|--------|-----|
| `Genius Islamian's Academy` | `SCIENCES COACHING ACADEMY` |

Affected locations:
- Financial report title
- Generated-on footer text
- Confidential report paragraph
- Management Dashboard header
- Date-display header
- Staff Panel header

**Verdict:** Functionally identical. Branding-only differences.

---

### 2.2 pages/Finance.tsx

| Metric | Genius | SCA |
|--------|--------|-----|
| Lines | 1575 | 1480 |
| Status | **DIFFERENT** (significant feature gap) | |
| Diff Lines | 205 | |

**Key Differences:**

1. **Branding:** `Genius Islamian's Academy` → `SCIENCES COACHING ACADEMY` in revenue header.

2. **REFUND type styling (GENIUS-ONLY):**
   - Genius has distinct amber-colored styling for `REFUND`-type items in the finance table.
   - SCA only has a single emerald color for all non-expense items.

3. **Outsider/Walk-in Payment Feature (GENIUS-ONLY — ~95 lines):**
   - Genius has a full **"Outsider / Walk-in"** payment system that SCA completely lacks:
     - Toggle between "Enrolled Student" and "Outsider / Walk-in" modes
     - State variables: `isOutsider`, `outsiderName`, `outsiderFatherName`, `outsiderContact`
     - When outsider mode is active, shows a manual entry form (amber-themed) with fields for Full Name, Father's Name, and Contact Number
     - Mutation sends `isOutsider: true` with outsider details instead of `studentId`
     - In payment history table, outsider payments display "(Walk-in)" badge in amber

4. **Misc Payment Dialog UI:**
   - Genius: Title is "Record Misc Payment", has enrolled/outsider toggle buttons
   - SCA: Title is "Record Student Misc Payment", only has student search
   - SCA's student search layout is slightly simpler (no nested `<div>` wrappers for selected student info)

5. **Submit button disabled logic:**
   - Genius: `disabled={... || (!isOutsider && !selectedStudent) || (isOutsider && !outsiderName.trim()) || !amount}`
   - SCA: `disabled={... || !selectedStudent || !amount}`

**Verdict:** Genius has a significantly richer Finance page with outsider payment support and refund-type styling.

---

### 2.3 pages/Students.tsx

| Metric | Genius | SCA |
|--------|--------|-----|
| Lines | 1121 | 1064 |
| Status | **DIFFERENT** (significant feature gap) | |
| Diff Lines | 155 | |

**Key Differences:**

1. **Branding:** `Genius Islamian's Academy` → `SCIENCES COACHING ACADEMY`

2. **Student Deletion vs Withdrawal:**
   - **SCA:** Uses `DeleteStudentDialog` → permanent hard delete (`studentApi.delete`)
   - **Genius:** Uses `WithdrawStudentDialog` → soft withdrawal with optional refund (`studentApi.withdraw`)
     - Passes `refundAmount` and `refundReason` parameters
     - Success message includes refund amount if applicable
     - Also invalidates `["classes"]` query cache on success

3. **Student Photo Display (GENIUS-ONLY):**
   - Genius renders actual student photos (`student.photo || student.imageUrl`) with:
     - URL resolution logic (handles `data:`, `http`, and relative API paths)
     - `onError` fallback that hides the broken image and shows initials circle
   - SCA only shows the colored initials circle (no photo support)

4. **Seat Number Column (GENIUS-ONLY):**
   - Genius has an extra `<TableHead>Seat</TableHead>` column
   - Displays `student.seatNumber` with color coding (pink for "L" prefix, sky-blue otherwise)
   - Shows "–" dash if no seat assigned

5. **Withdrawn Student Handling (GENIUS-ONLY):**
   - Row gets `opacity-50` class when `student.studentStatus === "Withdrawn"`
   - Status badge shows "Withdrawn" in amber instead of regular `StatusBadge`
   - Status dot uses orange glow for withdrawn students
   - Action buttons (Collect Fee, Edit, Delete) are completely hidden for withdrawn students
   - Active count in subtitle excludes withdrawn students: `s.status === "active" && s.studentStatus !== "Withdrawn"`

6. **Action Button Layout:**
   - SCA: Flat list of 3 buttons (Collect Fee, Edit, Delete) — always visible
   - Genius: Conditional rendering — buttons wrapped in `{student.studentStatus !== "Withdrawn" && (...)}` checks

**Verdict:** Genius has a substantially more feature-rich Students page with photo support, seat management, soft-delete (withdraw with refund), and withdrawn-student status handling.

---

### 2.4 pages/Teachers.tsx

| Metric | Genius | SCA |
|--------|--------|-----|
| Lines | 727 | 727 |
| Status | **DIFFERENT** (branding only) | |
| Diff Lines | 2 | |

**Differences:** Single branding change:
- `Genius Islamian's Academy` → `SCIENCES COACHING ACADEMY`

**Verdict:** Functionally identical. Branding-only difference.

---

### 2.5 pages/Classes.tsx

| Metric | Genius | SCA |
|--------|--------|-----|
| Lines | 1705 | 1602 |
| Status | **DIFFERENT** (significant feature gap) | |
| Diff Lines | 165 | |

**Key Differences:**

1. **Schedule/Timetable System (GENIUS-ONLY — ~103 lines):**
   - Genius imports `Calendar` icon and has a full scheduling system:
     - Interface fields: `days: string[]`, `startTime: string`, `endTime: string`, `roomNumber?: string`
     - Form state includes `days`, `startTime`, `endTime`, `roomNumber`
     - `DAYS_OF_WEEK` constant array (Mon–Sun) with toggle buttons
     - `toggleDay()` function for day selection
     - Validation: "At least one day must be selected", start/end time required
     - UI: Blue-themed schedule configuration section with day toggle pills, time pickers, and room number input
   - SCA has none of this — it uses a simple "Shift / Batch" dropdown (`SHIFT_OPTIONS`) instead

2. **Shift vs Schedule Display:**
   - **SCA table column:** "Group / Shift" — shows only `classDoc.shift`
   - **Genius table column:** "Group / Schedule" — shows `classDoc.shift • Mon, Wed, Fri` (shift + days joined)

3. **Student Count Field:**
   - SCA: `classDoc.studentCount || 0`
   - Genius: `classDoc.enrolledStudents || classDoc.studentCount || 0` (prefers `enrolledStudents`)

4. **Teacher Share Display:**
   - SCA: Hardcoded `70%` label: `70% = PKR {estimatedTeacherShare}`
   - Genius: Dynamic percentage: `{classDoc.teacherSharePct || 70}% = PKR {estimatedTeacherShare}`

5. **Session Dropdown:**
   - SCA: "All Academic Sessions" label, uses `mergedSessions` with `session._id || session.sessionId`
   - Genius: "All Sessions" label, uses `sessions` with `session._id`

6. **Form Submission Payload:**
   - Genius includes: `days`, `startTime`, `endTime`, `roomNumber` in create/update payloads
   - SCA does not include these fields

**Verdict:** Genius has a full class scheduling system (days, times, rooms) while SCA only has a simple shift selector. Genius also has dynamic teacher share percentages.

---

### 2.6 pages/Sessions.tsx

| Metric | Genius | SCA |
|--------|--------|-----|
| Lines | 611 | 611 |
| Status | **IDENTICAL** ✅ | |

Files are byte-for-byte identical (hash match).

---

### 2.7 pages/Notifications.tsx

| Metric | Genius | SCA |
|--------|--------|-----|
| Lines | N/A | N/A |
| Status | **DOES NOT EXIST in either codebase** | |

Neither genius nor SCA has a `Notifications.tsx` page file.

---

### 2.8 pages/StudentPortal.tsx

| Metric | Genius | SCA |
|--------|--------|-----|
| Lines | 1463 | 1001 |
| Status | **DIFFERENT** (massive differences — 462 fewer lines in SCA) | |
| Diff Lines | 1212 (nearly complete rewrite) | |

**Key Differences:**

1. **Animation & Visual Effects (GENIUS-ONLY — ~200+ lines):**
   - Genius imports `useRef`, `useMotionValue`, `useSpring` from framer-motion
   - **Spotlight component:** Custom warm gold radial-gradient spotlight that follows mouse cursor
   - **Waterfall animation:** Custom entrance animation variant
   - **Ripple animation:** Custom interaction animation variant
   - **3D card tilt effect:** `useMotionValue` for interactive card hover with spring physics
   - **Mouse tracking:** `mouseX`/`mouseY` motion values with smooth spring interpolation
   - SCA uses basic `motion` from framer-motion only (no advanced physics/effects)

2. **Card component (GENIUS-ONLY):**
   - Genius imports `Card, CardContent` from UI library
   - SCA does not use Card component

3. **Student Photo Upload (GENIUS-ONLY):**
   - Genius has `photoInputRef = useRef<HTMLInputElement>(null)` for photo upload support
   - Not present in SCA

4. **UI Complexity:**
   - Genius: Highly animated, premium-feeling UI with spotlight effects, 3D card interactions, waterfall/ripple animations throughout
   - SCA: Simpler, functional UI without advanced animation effects

5. **Timetable:**
   - Both have timetable functionality, but the UI rendering differs significantly
   - Genius uses animated cards with motion effects for each timetable entry
   - SCA has a straightforward timetable section with `id="timetable-section"` for scroll-to navigation

6. **Code Organization:**
   - SCA is 462 lines shorter — much leaner implementation
   - Genius has significantly more visual polish at the cost of code complexity

**Verdict:** Genius StudentPortal is a premium, heavily-animated experience. SCA is a clean, functional version stripped of visual effects. Nearly the entire file differs.

---

### 2.9 pages/StudentProfile.tsx

| Metric | Genius | SCA |
|--------|--------|-----|
| Lines | 482 | 482 |
| Status | **IDENTICAL** ✅ | |

Files are byte-for-byte identical (hash match).

---

## 3. Summary

### Files Only in Genius (not in SCA)
| File | Description |
|------|-------------|
| `pages/SeatManagementPage.tsx` | Full seat management page |
| `pages/StudentSeatSelection.tsx` | Student seat selection/booking page |
| `components/dashboard/WithdrawStudentDialog.tsx` | Soft-delete dialog with refund options |
| `components/print/ReceiptPDF.BACKUP.tsx` | Backup of receipt PDF |

### Files Only in SCA (not in Genius)
| File | Description |
|------|-------------|
| `pages/Attendance.tsx` | Attendance management page |

### Comparison Matrix

| File | Lines (G/S) | Status | Difference Category |
|------|-------------|--------|-------------------|
| Dashboard.tsx | 1926/1926 | DIFFERENT | Branding only |
| Finance.tsx | 1575/1480 | DIFFERENT | **Outsider payments, refund styling** |
| Students.tsx | 1121/1064 | DIFFERENT | **Photo, seats, withdraw vs delete** |
| Teachers.tsx | 727/727 | DIFFERENT | Branding only |
| Classes.tsx | 1705/1602 | DIFFERENT | **Full scheduling system (days/times/rooms)** |
| Sessions.tsx | 611/611 | IDENTICAL | — |
| Notifications.tsx | —/— | N/A | Does not exist in either |
| StudentPortal.tsx | 1463/1001 | DIFFERENT | **Major rewrite — animations, effects, photo** |
| StudentProfile.tsx | 482/482 | IDENTICAL | — |

### Feature Gap Summary (Genius has, SCA lacks)

1. **Seat Management System** — Seat numbers, seat assignment pages, seat display in student table
2. **Student Withdrawal with Refund** — Soft-delete flow vs hard delete
3. **Outsider/Walk-in Payments** — Accept payments from non-enrolled people
4. **Class Scheduling** — Day-of-week selection, start/end times, room numbers
5. **Student Photo Display** — Photo rendering with error fallback in student table
6. **Premium Animations** — Spotlight, waterfall, ripple, 3D tilt effects in Student Portal
7. **Dynamic Teacher Share %** — Per-class teacher percentage (not hardcoded 70%)
8. **Refund-type Styling** — Amber color coding for refund transactions in Finance
9. **Withdrawn Student State** — Visual indicators, disabled actions for withdrawn students
