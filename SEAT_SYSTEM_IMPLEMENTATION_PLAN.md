# 🪑 Seat Management System - Complete Implementation Plan
## 182-Seat Capacity with Gender Segregation

---

## 📋 EXECUTIVE SUMMARY

**Goal:** Implement a full-stack seat management system with 182 seats (13 rows × 14 columns) featuring gender-based wing segregation (Left=Girls, Right=Boys).

**Current State:**
- ✅ Basic seat schema exists (`seatSchema.js`)
- ✅ Basic CRUD operations in `seat-controller.js`
- ✅ Student model has `seatNumber` field
- ✅ Basic student seat selection page exists
- ⚠️ Current capacity: 30 seats (needs upgrade to 182)
- ❌ No admin interface for seat management
- ❌ No one-time selection enforcement
- ❌ No dashboard badge display

**Target Architecture:**
```
┌─────────────────────────────────────────────────────────┐
│                     SEAT LAYOUT                         │
│  Left Wing (Girls)  │  Aisle  │  Right Wing (Boys)     │
│   Cols 0-6 (7 seats)│         │  Cols 7-13 (7 seats)   │
│                                                         │
│  Row 1:  [G][G][G][G][G][G][G] │ [B][B][B][B][B][B][B]│
│  Row 2:  [G][G][G][G][G][G][G] │ [B][B][B][B][B][B][B]│
│  ...     (13 rows total)                               │
│  Row 13: [G][G][G][G][G][G][G] │ [B][B][B][B][B][B][B]│
│                                                         │
│  Total: 13 × 14 = 182 seats                            │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 PHASE 1: BACKEND FOUNDATION

### 1.1 Update Seat Schema (`backend/models/seatSchema.js`)

**Current Schema Analysis:**
```javascript
{
  sclass: ObjectId,
  session: ObjectId,
  seatNumber: Number,
  side: 'Left' | 'Right',
  position: { row: Number, column: Number },
  isTaken: Boolean,
  student: ObjectId,
  school: ObjectId,
  bookedAt: Date
}
```

**Changes Required:**
```javascript
// ADD NEW FIELDS:
{
  // Seat label for display (e.g., "R3-05" = Row 3, Column 5)
  seatLabel: {
    type: String,
    required: true,
    trim: true,
    // Format: R{rowNum}-{colNum} (e.g., "R01-07", "R13-13")
  },
  
  // Wing designation (replaces 'side')
  wing: {
    type: String,
    enum: ['Left', 'Right'],
    required: true,
    // Left = Girls (cols 0-6), Right = Boys (cols 7-13)
  },
  
  // Admin controls
  isReserved: {
    type: Boolean,
    default: false,
    // Marks seat as reserved for maintenance/VIP
  },
  
  reservedReason: {
    type: String,
    trim: true,
    // Optional note for why reserved (e.g., "Broken chair", "Principal's guest")
  },
  
  // Audit trail
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'admin'
  },
  
  history: [{
    action: {
      type: String,
      enum: ['booked', 'released', 'reserved', 'unreserved', 'vacated'],
      required: true
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'history.performedByModel'
    },
    performedByModel: {
      type: String,
      enum: ['student', 'admin']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String
  }]
}
```

**Migration Strategy:**
1. Rename `side` → `wing` (backward compatible)
2. Add `seatLabel` generation logic
3. Set default `isReserved: false` for existing seats
4. Create migration script to update existing 30 seats

---

### 1.2 Update Class Model (`backend/models/Class.js`)

**Add Seat Capacity Field:**
```javascript
// In classSchema, ADD after maxCapacity:

// Seat configuration for this class
seatConfig: {
  totalSeats: {
    type: Number,
    default: 182,
    min: 1
  },
  rows: {
    type: Number,
    default: 13,
    min: 1
  },
  columnsPerWing: {
    type: Number,
    default: 7,
    min: 1
  },
  // Auto-initialize seats on class creation
  autoInitializeSeats: {
    type: Boolean,
    default: true
  },
  // Track if seats have been initialized
  seatsInitialized: {
    type: Boolean,
    default: false
  }
}
```

---

### 1.3 Enhance Seat Controller (`backend/controllers/seat-controller.js`)

#### 1.3.1 **Update `initializeSeats` Function**

**Current Limitation:** Creates only 30 seats (15 left, 15 right)

**New Implementation:**
```javascript
/**
 * Initialize 182 seats for a class
 * Layout: 13 rows × 14 columns
 * - Left Wing (cols 0-6): Girls only
 * - Right Wing (cols 7-13): Boys only
 */
const initializeSeats = async (req, res) => {
  try {
    const { classId, sessionId, schoolId } = req.body;

    if (!classId || !sessionId || !schoolId) {
      return res.status(400).json({ 
        message: "classId, sessionId, and schoolId are required" 
      });
    }

    // Check if seats already exist
    const existingSeats = await Seat.find({ sclass: classId, session: sessionId });
    if (existingSeats.length > 0) {
      return res.status(400).json({ 
        message: `Seats already initialized (${existingSeats.length} seats exist)`,
        existingCount: existingSeats.length
      });
    }

    const ROWS = 13;
    const COLS_PER_WING = 7;
    const TOTAL_COLS = COLS_PER_WING * 2; // 14 columns
    
    const newSeats = [];
    let seatNumber = 1;

    for (let row = 1; row <= ROWS; row++) {
      for (let col = 0; col < TOTAL_COLS; col++) {
        // Determine wing based on column
        const wing = col < COLS_PER_WING ? 'Left' : 'Right';
        
        // Column number within wing (0-6)
        const wingCol = col < COLS_PER_WING ? col : col - COLS_PER_WING;
        
        // Seat label format: R01-03 (Row 1, Column 3)
        const seatLabel = `R${String(row).padStart(2, '0')}-${String(col).padStart(2, '0')}`;

        newSeats.push({
          sclass: classId,
          session: sessionId,
          school: schoolId,
          seatNumber: seatNumber++,
          seatLabel,
          wing,
          side: wing, // Keep for backward compatibility
          position: {
            row,
            column: col
          },
          isTaken: false,
          isReserved: false,
          student: null
        });
      }
    }

    const createdSeats = await Seat.insertMany(newSeats);
    
    // Update class seatConfig
    await Class.findByIdAndUpdate(classId, {
      'seatConfig.seatsInitialized': true
    });

    res.status(201).json({ 
      message: "Seats initialized successfully",
      count: createdSeats.length,
      layout: {
        rows: ROWS,
        totalColumns: TOTAL_COLS,
        leftWingCols: COLS_PER_WING,
        rightWingCols: COLS_PER_WING
      }
    });
  } catch (err) {
    res.status(500).json({ 
      message: "Error initializing seats", 
      error: err.message 
    });
  }
};
```

#### 1.3.2 **Add Admin Management Endpoints**

```javascript
/**
 * Get All Seats for Admin View
 * Returns full seat map with occupancy status
 */
const getAllSeatsAdmin = async (req, res) => {
  try {
    const { classId, sessionId } = req.params;

    const seats = await Seat.find({
      sclass: classId,
      session: sessionId
    })
    .populate('student', 'studentName gender studentId')
    .sort({ 'position.row': 1, 'position.column': 1 });

    // Calculate statistics
    const stats = {
      total: seats.length,
      occupied: seats.filter(s => s.isTaken).length,
      reserved: seats.filter(s => s.isReserved).length,
      available: seats.filter(s => !s.isTaken && !s.isReserved).length,
      leftWing: {
        total: seats.filter(s => s.wing === 'Left').length,
        occupied: seats.filter(s => s.wing === 'Left' && s.isTaken).length
      },
      rightWing: {
        total: seats.filter(s => s.wing === 'Right').length,
        occupied: seats.filter(s => s.wing === 'Right' && s.isTaken).length
      }
    };

    res.status(200).json({ seats, stats });
  } catch (err) {
    res.status(500).json({ 
      message: "Error fetching seats", 
      error: err.message 
    });
  }
};

/**
 * Vacate Seat (Admin Only)
 * Kicks student from their seat
 */
const vacateSeat = async (req, res) => {
  try {
    const { seatId } = req.params;
    const { reason, adminId } = req.body;

    const seat = await Seat.findById(seatId).populate('student', 'studentName');

    if (!seat) {
      return res.status(404).json({ message: "Seat not found" });
    }

    if (!seat.isTaken) {
      return res.status(400).json({ message: "Seat is already vacant" });
    }

    const studentName = seat.student?.studentName || 'Unknown';
    const studentId = seat.student?._id;

    // Add to history
    seat.history.push({
      action: 'vacated',
      performedBy: adminId,
      performedByModel: 'admin',
      notes: reason || 'Vacated by admin'
    });

    // Clear seat
    seat.isTaken = false;
    seat.student = null;
    seat.bookedAt = null;
    seat.lastModifiedBy = adminId;

    await seat.save();

    // Also clear seatNumber from student record
    if (studentId) {
      await Student.findByIdAndUpdate(studentId, {
        $unset: { seatNumber: 1 }
      });
    }

    res.status(200).json({ 
      message: `Seat vacated successfully (${studentName} removed)`,
      seat 
    });
  } catch (err) {
    res.status(500).json({ 
      message: "Error vacating seat", 
      error: err.message 
    });
  }
};

/**
 * Toggle Seat Reservation (Admin Only)
 * Marks seat as reserved/unreserved for maintenance
 */
const toggleReservation = async (req, res) => {
  try {
    const { seatId } = req.params;
    const { isReserved, reason, adminId } = req.body;

    const seat = await Seat.findById(seatId);

    if (!seat) {
      return res.status(404).json({ message: "Seat not found" });
    }

    if (seat.isTaken && isReserved) {
      return res.status(400).json({ 
        message: "Cannot reserve an occupied seat. Vacate it first." 
      });
    }

    seat.isReserved = isReserved;
    seat.reservedReason = isReserved ? reason : null;
    seat.lastModifiedBy = adminId;

    seat.history.push({
      action: isReserved ? 'reserved' : 'unreserved',
      performedBy: adminId,
      performedByModel: 'admin',
      notes: reason
    });

    await seat.save();

    res.status(200).json({ 
      message: `Seat ${isReserved ? 'reserved' : 'unreserved'} successfully`,
      seat 
    });
  } catch (err) {
    res.status(500).json({ 
      message: "Error toggling reservation", 
      error: err.message 
    });
  }
};
```

#### 1.3.3 **Enhance Student Booking with History**

```javascript
// Modify existing bookSeat function to add history tracking

const bookSeat = async (req, res) => {
  try {
    const { seatId } = req.body;
    const studentId = req.user.id;

    // Security: Extract student from DB
    const student = await Student.findById(studentId).select('gender sclassName studentName seatNumber');
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // CRITICAL: One-time selection enforcement
    if (student.seatNumber) {
      return res.status(403).json({ 
        message: "You have already selected a seat. Contact admin to change.",
        currentSeat: student.seatNumber
      });
    }

    // Get seat details
    const seat = await Seat.findById(seatId);
    if (!seat) {
      return res.status(404).json({ message: "Seat not found" });
    }

    // Check if reserved
    if (seat.isReserved) {
      return res.status(403).json({ 
        message: `Seat is reserved: ${seat.reservedReason || 'Not available'}` 
      });
    }

    // Gender Guard: Validate gender matches seat wing
    const allowedWing = student.gender === 'Female' ? 'Left' : 'Right';
    if (seat.wing !== allowedWing) {
      return res.status(403).json({
        message: `Access Denied: ${student.gender} students can only book seats on the ${allowedWing} wing`
      });
    }

    // Unbook any previous seat for this student in the same session (safety check)
    await Seat.updateMany(
      { student: studentId, session: seat.session },
      { $set: { isTaken: false, student: null, bookedAt: null } }
    );

    // Atomic Lock: Race condition protection
    const bookedSeat = await Seat.findOneAndUpdate(
      { _id: seatId, isTaken: false, isReserved: false },
      { 
        isTaken: true, 
        student: studentId, 
        bookedAt: new Date(),
        $push: {
          history: {
            action: 'booked',
            performedBy: studentId,
            performedByModel: 'student',
            notes: `Booked by ${student.studentName}`
          }
        }
      },
      { new: true }
    ).populate('student', 'studentName gender studentId');

    // Race Condition: Seat taken milliseconds ago
    if (!bookedSeat) {
      return res.status(409).json({ message: "Seat already taken or reserved" });
    }

    // Update student record with seat number
    student.seatNumber = bookedSeat.seatLabel;
    await student.save();

    res.status(200).json({ 
      message: "Seat booked successfully",
      seat: bookedSeat,
      seatLabel: bookedSeat.seatLabel
    });
  } catch (err) {
    res.status(500).json({ 
      message: "Error booking seat", 
      error: err.message 
    });
  }
};
```

---

### 1.4 Create New Route Endpoints (`backend/routes/seat-routes.js`)

```javascript
const router = require('express').Router();
const { 
  getAvailableSeats, 
  bookSeat, 
  releaseSeat, 
  initializeSeats,
  getAllSeatsAdmin,
  vacateSeat,
  toggleReservation
} = require('../controllers/seat-controller');
const { verifyStudent, verifyAdmin } = require('../middleware/auth');

// Student Routes
router.get('/:classId/:sessionId', verifyStudent, getAvailableSeats);
router.post('/book', verifyStudent, bookSeat);
router.post('/release', verifyStudent, releaseSeat);

// Admin Routes
router.get('/admin/:classId/:sessionId', verifyAdmin, getAllSeatsAdmin);
router.post('/initialize', verifyAdmin, initializeSeats);
router.post('/vacate/:seatId', verifyAdmin, vacateSeat);
router.patch('/reserve/:seatId', verifyAdmin, toggleReservation);

module.exports = router;
```

---

## 🎨 PHASE 2: FRONTEND - ADMIN INTERFACE

### 2.1 Create Admin Seat Management Component

**File:** `frontend/src/components/admin/SeatManagement.tsx`

**Features:**
- Visual 13×14 grid with left/right wing segregation
- Color coding:
  - 🟢 Green = Available
  - 🔵 Blue = Occupied (Boys/Right)
  - 🟣 Pink = Occupied (Girls/Left)
  - ⚫ Gray = Reserved
- Hover: Show student name tooltip
- Click: Open action menu (Vacate / Reserve / View Details)
- Statistics panel showing occupancy %

**Key Components:**
```tsx
interface SeatManagementProps {
  classId: string;
  sessionId: string;
}

const SeatManagement: React.FC<SeatManagementProps> = ({ classId, sessionId }) => {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [stats, setStats] = useState<SeatStats | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  // Fetch seats from API
  useEffect(() => {
    fetchSeats();
  }, [classId, sessionId]);

  const fetchSeats = async () => {
    const res = await fetch(`/api/seats/admin/${classId}/${sessionId}`, {
      credentials: 'include'
    });
    const data = await res.json();
    setSeats(data.seats);
    setStats(data.stats);
  };

  // Render 13×14 grid with aisle gap
  const renderGrid = () => {
    const ROWS = 13;
    const COLS_PER_WING = 7;
    
    return (
      <div className="seat-grid">
        {/* Row headers */}
        <div className="grid-header">
          <span>Row</span>
          <span>Left Wing (Girls)</span>
          <span className="aisle-gap">Aisle</span>
          <span>Right Wing (Boys)</span>
        </div>

        {/* Render rows */}
        {Array.from({ length: ROWS }).map((_, rowIndex) => (
          <div key={rowIndex} className="seat-row">
            <span className="row-label">Row {rowIndex + 1}</span>
            
            {/* Left Wing */}
            <div className="wing left-wing">
              {seats
                .filter(s => s.position.row === rowIndex + 1 && s.wing === 'Left')
                .sort((a, b) => a.position.column - b.position.column)
                .map(seat => (
                  <SeatButton 
                    key={seat._id} 
                    seat={seat} 
                    onClick={() => handleSeatClick(seat)}
                  />
                ))}
            </div>

            {/* Aisle */}
            <div className="aisle-gap" />

            {/* Right Wing */}
            <div className="wing right-wing">
              {seats
                .filter(s => s.position.row === rowIndex + 1 && s.wing === 'Right')
                .sort((a, b) => a.position.column - b.position.column)
                .map(seat => (
                  <SeatButton 
                    key={seat._id} 
                    seat={seat} 
                    onClick={() => handleSeatClick(seat)}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Action handlers
  const handleVacate = async (seatId: string) => {
    const reason = prompt("Reason for vacating seat:");
    if (!reason) return;

    await fetch(`/api/seats/vacate/${seatId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reason, adminId: currentUser._id })
    });

    fetchSeats(); // Refresh
    toast.success("Seat vacated successfully");
  };

  const handleToggleReservation = async (seatId: string, isReserved: boolean) => {
    const reason = isReserved ? prompt("Reason for reservation:") : null;
    
    await fetch(`/api/seats/reserve/${seatId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ isReserved, reason, adminId: currentUser._id })
    });

    fetchSeats();
    toast.success(isReserved ? "Seat reserved" : "Reservation removed");
  };

  return (
    <div className="seat-management-container">
      <div className="stats-panel">
        <StatCard 
          label="Total Seats" 
          value={stats?.total} 
          color="blue" 
        />
        <StatCard 
          label="Occupied" 
          value={stats?.occupied} 
          color="green" 
        />
        <StatCard 
          label="Available" 
          value={stats?.available} 
          color="gray" 
        />
        <StatCard 
          label="Reserved" 
          value={stats?.reserved} 
          color="red" 
        />
      </div>

      {renderGrid()}

      {/* Action Menu Dialog */}
      <Dialog open={actionMenuOpen} onOpenChange={setActionMenuOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Manage Seat {selectedSeat?.seatLabel}
            </DialogTitle>
          </DialogHeader>
          
          {selectedSeat?.isTaken && (
            <div className="student-info">
              <p><strong>Student:</strong> {selectedSeat.student?.studentName}</p>
              <p><strong>ID:</strong> {selectedSeat.student?.studentId}</p>
              <Button 
                variant="destructive" 
                onClick={() => handleVacate(selectedSeat._id)}
              >
                Vacate Seat
              </Button>
            </div>
          )}

          {!selectedSeat?.isTaken && (
            <Button 
              variant={selectedSeat?.isReserved ? "outline" : "default"}
              onClick={() => handleToggleReservation(
                selectedSeat._id, 
                !selectedSeat?.isReserved
              )}
            >
              {selectedSeat?.isReserved ? "Unreserve" : "Mark as Reserved"}
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
```

### 2.2 Add "Manage Seats" Button to Classes Page

**File:** `frontend/src/pages/Classes.tsx`

```tsx
// In the class list table, add an action column:

<Button 
  variant="outline" 
  onClick={() => navigate(`/classes/${classId}/seats`)}
  disabled={!class.seatConfig?.seatsInitialized}
>
  <Armchair className="h-4 w-4 mr-2" />
  Manage Seats
</Button>

// If not initialized, show:
<Button 
  variant="default" 
  onClick={() => initializeSeats(classId)}
>
  Initialize Seats (182)
</Button>
```

---

## 🎓 PHASE 3: FRONTEND - STUDENT INTERFACE

### 3.1 Enhance Student Seat Selection Page

**File:** `frontend/src/pages/StudentSeatSelection.tsx`

**Key Enhancements:**

#### 3.1.1 **One-Time Selection Modal**
```tsx
// On component mount, check if student has a seat
useEffect(() => {
  const checkExistingSeat = async () => {
    const student = await fetchCurrentStudent();
    
    if (student.seatNumber) {
      // Already has seat - show badge, don't allow re-selection
      setHasSeat(true);
      setCurrentSeat(student.seatNumber);
      setShowSelectionModal(false);
    } else {
      // Force open modal
      setShowSelectionModal(true);
    }
  };

  checkExistingSeat();
}, []);

// Prevent modal closure until seat is selected
<Dialog 
  open={showSelectionModal} 
  onOpenChange={() => {}} // Disable closing
>
  <DialogContent className="max-w-6xl">
    <DialogHeader>
      <DialogTitle>🪑 Select Your Seat (One-Time Only)</DialogTitle>
      <DialogDescription>
        This is a permanent choice. Choose wisely!
      </DialogDescription>
    </DialogHeader>
    
    <SeatGrid 
      classId={student.classRef} 
      sessionId={student.sessionRef}
      studentGender={student.gender}
      onSeatSelect={handleSeatSelect}
    />
  </DialogContent>
</Dialog>
```

#### 3.1.2 **Gender Firewall in Seat Grid**
```tsx
const SeatGrid: React.FC<SeatGridProps> = ({ 
  classId, 
  sessionId, 
  studentGender,
  onSeatSelect 
}) => {
  const [seats, setSeats] = useState<Seat[]>([]);
  const allowedWing = studentGender === 'Female' ? 'Left' : 'Right';

  // Fetch available seats
  useEffect(() => {
    fetchSeats();
  }, [classId, sessionId]);

  const fetchSeats = async () => {
    const res = await fetch(`/api/seats/${classId}/${sessionId}`, {
      credentials: 'include'
    });
    const data = await res.json();
    setSeats(data.seats);
  };

  const renderSeat = (seat: Seat) => {
    const isAllowed = seat.wing === allowedWing;
    const isAvailable = !seat.isTaken && !seat.isReserved;
    
    return (
      <button
        key={seat._id}
        className={cn(
          "seat-button",
          {
            "seat-available": isAllowed && isAvailable,
            "seat-occupied": seat.isTaken,
            "seat-reserved": seat.isReserved,
            "seat-disabled": !isAllowed, // Grey out opposite wing
          }
        )}
        onClick={() => isAllowed && isAvailable && onSeatSelect(seat)}
        disabled={!isAllowed || !isAvailable}
        title={
          !isAllowed 
            ? `${studentGender === 'Male' ? 'Girls' : 'Boys'} Wing - Not Accessible`
            : seat.isTaken 
            ? `Occupied (${seat.student?.studentName})`
            : seat.isReserved
            ? `Reserved: ${seat.reservedReason}`
            : `Available - ${seat.seatLabel}`
        }
      >
        <Armchair className={cn(
          "h-6 w-6",
          !isAllowed && "opacity-20"
        )} />
        <span className="seat-label">{seat.seatLabel}</span>
      </button>
    );
  };

  // Render 13×14 grid with visual aisle
  return (
    <div className="seat-grid-container">
      {/* Wing labels */}
      <div className="grid-labels">
        <div className={cn(
          "wing-label left",
          studentGender === 'Female' && "wing-label-active"
        )}>
          👧 Girls Wing (Left)
          {studentGender === 'Male' && <Lock className="h-4 w-4 ml-2 text-red-500" />}
        </div>
        
        <div className="aisle-label">Aisle</div>
        
        <div className={cn(
          "wing-label right",
          studentGender === 'Male' && "wing-label-active"
        )}>
          👦 Boys Wing (Right)
          {studentGender === 'Female' && <Lock className="h-4 w-4 ml-2 text-red-500" />}
        </div>
      </div>

      {/* Render rows */}
      <div className="seat-rows">
        {Array.from({ length: 13 }).map((_, rowIndex) => (
          <div key={rowIndex} className="seat-row">
            <span className="row-number">Row {rowIndex + 1}</span>
            
            {/* Left Wing (7 seats) */}
            <div className="wing-section left">
              {seats
                .filter(s => s.position.row === rowIndex + 1 && s.wing === 'Left')
                .sort((a, b) => a.position.column - b.position.column)
                .map(renderSeat)}
            </div>

            {/* Aisle gap */}
            <div className="aisle-gap" />

            {/* Right Wing (7 seats) */}
            <div className="wing-section right">
              {seats
                .filter(s => s.position.row === rowIndex + 1 && s.wing === 'Right')
                .sort((a, b) => a.position.column - b.position.column)
                .map(renderSeat)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

#### 3.1.3 **Seat Confirmation Flow**
```tsx
const handleSeatSelect = (seat: Seat) => {
  setSelectedSeat(seat);
  setConfirmDialogOpen(true);
};

const confirmBooking = async () => {
  try {
    const res = await fetch('/api/seats/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ seatId: selectedSeat._id })
    });

    if (res.ok) {
      const data = await res.json();
      toast.success(`Seat ${data.seatLabel} booked successfully!`);
      
      // Fire confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Close modal and show dashboard
      setShowSelectionModal(false);
      setCurrentSeat(data.seatLabel);
      navigate('/student-portal');
    } else {
      const error = await res.json();
      toast.error(error.message);
    }
  } catch (err) {
    toast.error("Failed to book seat");
  }
};

<Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Seat Selection</DialogTitle>
    </DialogHeader>
    
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          This is a ONE-TIME selection. You cannot change your seat later.
        </AlertDescription>
      </Alert>

      <div className="seat-preview">
        <p><strong>Seat:</strong> {selectedSeat?.seatLabel}</p>
        <p><strong>Wing:</strong> {selectedSeat?.wing} ({studentGender === 'Female' ? 'Girls' : 'Boys'})</p>
        <p><strong>Position:</strong> Row {selectedSeat?.position.row}, Column {selectedSeat?.position.column}</p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
          Cancel
        </Button>
        <Button onClick={confirmBooking}>
          Confirm & Book Seat
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
```

---

### 3.2 Dashboard Seat Badge

**File:** `frontend/src/pages/StudentPortal.tsx`

```tsx
// Add to student dashboard header
<Card className="seat-badge-card">
  <CardContent className="flex items-center gap-4 p-4">
    <Armchair className="h-10 w-10 text-amber-500" />
    <div>
      <p className="text-sm text-muted-foreground">Your Seat</p>
      <p className="text-2xl font-bold text-foreground">
        {student.seatNumber || "Not Assigned"}
      </p>
      <Badge variant={student.gender === 'Male' ? 'default' : 'secondary'}>
        {student.gender === 'Male' ? 'Right Wing' : 'Left Wing'}
      </Badge>
    </div>
  </CardContent>
</Card>
```

---

## 🔐 PHASE 4: SECURITY & VALIDATION

### 4.1 Backend Validation Rules

```javascript
// In seat-controller.js, enforce:

// 1. Gender Firewall (Double-Check)
if (student.gender === 'Male' && seat.wing === 'Left') {
  return res.status(403).json({ 
    message: "Security violation: Male students cannot access Left wing" 
  });
}

if (student.gender === 'Female' && seat.wing === 'Right') {
  return res.status(403).json({ 
    message: "Security violation: Female students cannot access Right wing" 
  });
}

// 2. One-Time Lock
const existingSeat = await Student.findById(studentId).select('seatNumber');
if (existingSeat.seatNumber) {
  return res.status(403).json({ 
    message: "You have already selected a seat",
    currentSeat: existingSeat.seatNumber,
    hint: "Contact administration to change seat"
  });
}

// 3. Reserved Seats
if (seat.isReserved) {
  return res.status(403).json({ 
    message: `Seat is reserved: ${seat.reservedReason}` 
  });
}

// 4. Atomic Lock (Race Condition Prevention)
const bookedSeat = await Seat.findOneAndUpdate(
  { 
    _id: seatId, 
    isTaken: false, // Must be available
    isReserved: false // Must not be reserved
  },
  { 
    isTaken: true, 
    student: studentId, 
    bookedAt: new Date() 
  },
  { new: true }
);

if (!bookedSeat) {
  return res.status(409).json({ 
    message: "Seat was just taken by another student" 
  });
}
```

### 4.2 Frontend Validation

```tsx
// Disable seat selection if conditions not met
const canSelectSeat = (seat: Seat) => {
  // 1. Check wing permission
  const allowedWing = studentGender === 'Female' ? 'Left' : 'Right';
  if (seat.wing !== allowedWing) return false;

  // 2. Check availability
  if (seat.isTaken || seat.isReserved) return false;

  // 3. Check if student already has seat
  if (currentStudent.seatNumber) return false;

  return true;
};

// Visual feedback
<Button
  disabled={!canSelectSeat(seat)}
  className={cn(
    canSelectSeat(seat) 
      ? "cursor-pointer hover:bg-green-500" 
      : "cursor-not-allowed opacity-50"
  )}
>
  {seat.seatLabel}
</Button>
```

---

## 📊 PHASE 5: TESTING & VALIDATION

### 5.1 Backend Testing Checklist

```bash
# Test 1: Initialize 182 seats
POST /api/seats/initialize
{
  "classId": "...",
  "sessionId": "...",
  "schoolId": "..."
}
# Expected: 182 seats created (13 rows × 14 cols)

# Test 2: Student booking (Male - Right wing)
POST /api/seats/book
{ "seatId": "..." } # Right wing seat
# Expected: Success

POST /api/seats/book
{ "seatId": "..." } # Left wing seat
# Expected: 403 Forbidden (Gender violation)

# Test 3: One-time enforcement
POST /api/seats/book (second attempt)
# Expected: 403 "Already selected a seat"

# Test 4: Admin vacate
POST /api/seats/vacate/:seatId
{ "reason": "Disciplinary action", "adminId": "..." }
# Expected: Seat cleared, student.seatNumber removed

# Test 5: Admin reserve
PATCH /api/seats/reserve/:seatId
{ "isReserved": true, "reason": "Broken chair", "adminId": "..." }
# Expected: Seat marked reserved

# Test 6: Race condition
# Simulate 2 students clicking same seat simultaneously
# Expected: One succeeds, other gets 409 Conflict
```

### 5.2 Frontend Testing Checklist

```
✅ Gender Firewall:
   - Male student: Left wing grayed out, Right wing active
   - Female student: Right wing grayed out, Left wing active

✅ One-Time Modal:
   - New student: Modal auto-opens on login
   - Existing seat holder: Modal doesn't appear, shows badge

✅ Seat Booking Flow:
   - Click available seat → Confirmation dialog
   - Confirm → API call → Success toast → Confetti → Dashboard badge

✅ Admin Seat Management:
   - Click occupied seat → Show student name
   - Vacate → Seat turns green, student loses seatNumber
   - Reserve → Seat turns gray, not selectable by students

✅ Visual Layout:
   - 13 rows visible
   - Clear aisle gap between wings
   - Color coding: Green (available), Blue (boys), Pink (girls), Gray (reserved)
```

---

## 🚀 DEPLOYMENT CHECKLIST

### Phase 1: Database Migration
```bash
# 1. Backup existing seat data
mongodump --db=academy --collection=seats --out=/backup

# 2. Update seat schema (add new fields with defaults)
# Run migration script:
node scripts/migrate-seat-schema.js

# 3. Initialize seats for all active classes
node scripts/initialize-all-class-seats.js
```

### Phase 2: Backend Deployment
```bash
# 1. Update controllers and routes
git add backend/controllers/seat-controller.js
git add backend/routes/seat-routes.js
git commit -m "feat: 182-seat capacity with gender segregation"

# 2. Deploy backend
pm2 restart api
```

### Phase 3: Frontend Deployment
```bash
# 1. Build frontend
cd frontend
npm run build

# 2. Deploy to production
scp -r dist/* user@server:/var/www/academy

# 3. Verify routes
# - /classes → Should show "Manage Seats" button
# - /student-portal → Should show seat badge
# - Login as student without seat → Modal should auto-open
```

### Phase 4: Post-Deployment Verification
```bash
# 1. Check all classes have seats initialized
GET /api/seats/admin/:classId/:sessionId
# Expected: 182 seats per class

# 2. Test student seat selection (one account from each gender)
# 3. Test admin seat management (vacate, reserve)
# 4. Monitor error logs for any race conditions
```

---

## 📝 DOCUMENTATION & TRAINING

### Admin User Guide

**How to Manage Seats:**

1. Navigate to **Classes** page
2. Click **"Manage Seats"** for desired class
3. View the 13×14 seat grid:
   - Left Wing (Pink) = Girls
   - Right Wing (Blue) = Boys
4. Actions:
   - **Hover** over seat → See student name (if occupied)
   - **Click** occupied seat → "Vacate Seat" option (removes student)
   - **Click** empty seat → "Mark Reserved" (blocks student access)
5. Monitor statistics panel for occupancy rates

**When to Vacate a Seat:**
- Student transfers to another class
- Disciplinary action
- Seat needs maintenance

**When to Reserve a Seat:**
- Physical damage to chair
- VIP guest temporary reservation
- Section reorganization

### Student User Guide

**How to Select Your Seat (First-Time Login):**

1. Upon first login, a **"Select Your Seat"** modal will appear
2. You will see ONLY your gender's wing:
   - 👧 **Girls**: Left Wing (Columns 0-6)
   - 👦 **Boys**: Right Wing (Columns 7-13)
3. **Green seats** = Available, **Gray seats** = Occupied/Reserved
4. Click your preferred seat (Row 1-13)
5. Confirm your selection (⚠️ **ONE-TIME CHOICE**)
6. Your seat badge will appear on the dashboard

**Important:**
- This is a **permanent** selection
- You **cannot** change it yourself (contact admin if needed)
- Your seat number will appear on your dashboard: **"Your Seat: R03-11"**

---

## 🛠️ MAINTENANCE & TROUBLESHOOTING

### Common Issues

**Issue 1: Seats Not Showing**
```bash
# Solution: Check if seats are initialized
GET /api/seats/admin/:classId/:sessionId

# If empty, initialize:
POST /api/seats/initialize
{
  "classId": "...",
  "sessionId": "...",
  "schoolId": "..."
}
```

**Issue 2: Student Can't Select Seat (Already Has One)**
```bash
# Solution: Clear student's seatNumber (admin action)
# In Students page, edit student record and clear seatNumber field
# OR via API:
PATCH /api/students/:id
{ "seatNumber": null }
```

**Issue 3: Gender Firewall Not Working**
```bash
# Check student gender in database
GET /api/students/:id

# Ensure gender is properly set ("Male" or "Female")
# Backend validation should reject mismatches
```

**Issue 4: Race Condition (Same Seat Booked Twice)**
```bash
# Check seat history
GET /api/seats/:seatId

# Verify atomic lock is working (findOneAndUpdate with conditions)
# Only one student should have isTaken=true
```

### Database Indexes for Performance

```javascript
// Ensure these indexes exist in MongoDB:

// Seat collection
db.seats.createIndex({ sclass: 1, session: 1, seatNumber: 1 }, { unique: true });
db.seats.createIndex({ sclass: 1, session: 1, wing: 1, isTaken: 1 });
db.seats.createIndex({ student: 1 });

// Student collection
db.students.createIndex({ seatNumber: 1 }, { sparse: true });
db.students.createIndex({ classRef: 1, sessionRef: 1 });
```

---

## 🎯 SUCCESS METRICS

After full implementation, verify:

✅ **Capacity**: All classes have exactly 182 seats (13×14 grid)  
✅ **Gender Segregation**: Left wing (cols 0-6) = Girls only, Right wing (cols 7-13) = Boys only  
✅ **One-Time Lock**: Students can only select seat once (seatNumber field enforced)  
✅ **Admin Control**: Admins can vacate seats and mark reserved  
✅ **Visual Aisle**: Clear visual separation between wings in both admin and student views  
✅ **Dashboard Badge**: Student portal shows "Your Seat: R03-11 (Right Wing)"  
✅ **No Race Conditions**: Atomic locking prevents double-bookings  
✅ **Security**: Gender firewall enforced at both frontend and backend  

---

## 📅 ESTIMATED TIMELINE

| Phase | Tasks | Duration |
|-------|-------|----------|
| **Phase 1: Backend** | Schema updates, controller enhancements, routes | 2-3 hours |
| **Phase 2: Admin UI** | Seat management component, grid layout, actions | 3-4 hours |
| **Phase 3: Student UI** | Enhanced selection page, gender firewall, dashboard badge | 2-3 hours |
| **Phase 4: Security** | Validation rules, testing | 1-2 hours |
| **Phase 5: Testing** | End-to-end testing, bug fixes | 2-3 hours |
| **Deployment** | Migration, production deploy, verification | 1-2 hours |
| **TOTAL** | | **11-17 hours** |

---

## 🎓 NEXT STEPS FOR OPUS

1. **Start with Phase 1.1**: Update `backend/models/seatSchema.js` (add new fields)
2. **Then Phase 1.3.1**: Modify `initializeSeats` function to create 182 seats
3. **Test seat initialization**: POST to `/api/seats/initialize` and verify 182 seats created
4. **Proceed with admin UI** (Phase 2)
5. **Enhance student UI** (Phase 3)
6. **Implement security checks** (Phase 4)
7. **End-to-end testing** (Phase 5)

**Critical Files to Modify:**
```
backend/models/seatSchema.js
backend/controllers/seat-controller.js
backend/routes/seat-routes.js
frontend/src/components/admin/SeatManagement.tsx (NEW)
frontend/src/pages/StudentSeatSelection.tsx (ENHANCE)
frontend/src/pages/Classes.tsx (ADD BUTTON)
frontend/src/pages/StudentPortal.tsx (ADD BADGE)
```

---

## 🔗 DEPENDENCIES

**Backend:**
- mongoose (existing)
- Express routes (existing)
- Auth middleware (existing)

**Frontend:**
- React 18+ (existing)
- lucide-react icons (existing)
- shadcn/ui components (existing)
- canvas-confetti (for celebration effect)

**New npm packages needed:**
```bash
npm install canvas-confetti
```

---

## ✅ DEFINITION OF DONE

The seat management system is complete when:

1. All 182 seats exist for every active class (13 rows × 14 columns)
2. Admin can view full seat map with occupancy status
3. Admin can vacate occupied seats
4. Admin can mark seats as reserved
5. Student sees one-time selection modal on first login
6. Student can only select seats from their gender's wing (enforced at UI and API)
7. Student cannot change seat after selection (one-time lock)
8. Student portal displays seat badge ("Your Seat: R03-11")
9. Gender firewall prevents cross-wing bookings
10. Race conditions prevented via atomic locks
11. Seat history tracked for audit trail
12. No TypeScript/ESLint errors
13. All tests passing (backend validation + frontend UI)

---

**END OF IMPLEMENTATION PLAN**

This document serves as the single source of truth for the 182-seat management system implementation. Hand this to Opus with the instruction: **"Implement the seat management system following this plan, starting with Phase 1.1."**
