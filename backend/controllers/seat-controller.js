const Seat = require('../models/seatSchema');
const Student = require('../models/Student');
const Class = require('../models/Class');

// ─────────────────────────────────────────────
// STUDENT ENDPOINTS
// ─────────────────────────────────────────────

/**
 * Get Available Seats (Student View)
 * Returns ALL seats for the class so the grid can render both wings
 */
const getAvailableSeats = async (req, res) => {
    try {
        const { classId, sessionId } = req.params;
        const studentId = req.student._id;

        // Get student gender and seat change count
        const student = await Student.findById(studentId).select('gender seatChangeCount');
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const allowedSide = student.gender === 'Female' ? 'Left' : 'Right';

        // Return ALL seats so fronted can render the full grid
        const seats = await Seat.find({
            sclass: classId,
            session: sessionId,
        })
            .sort({ seatNumber: 1 })
            .populate('student', 'studentName rollNum gender');

        // Map studentName → name for frontend compatibility
        const mappedSeats = seats.map(s => {
            const sObj = s.toObject();
            if (sObj.student && sObj.student.studentName) {
                sObj.student.name = sObj.student.studentName;
            }
            return sObj;
        });

        res.status(200).json({ 
            seats: mappedSeats, 
            allowedSide, 
            studentGender: student.gender,
            seatChangeCount: student.seatChangeCount || 0,
        });
    } catch (err) {
        res.status(500).json({ message: "Error fetching seats", error: err.message });
    }
};

/**
 * Book Seat - With Atomic Lock, Gender Guard, One-Time Lock, History
 */
const bookSeat = async (req, res) => {
    try {
        const { seatId } = req.body;
        const studentId = req.student._id;

        // Security: Extract student from DB
        const student = await Student.findById(studentId).select('gender sclassName studentName seatNumber seatChangeCount');
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // ENFORCE: Student must release current seat before booking a new one
        if (student.seatNumber) {
            return res.status(400).json({
                message: "Please release your current seat before selecting a new one",
                currentSeat: student.seatNumber,
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
                message: `Seat is reserved: ${seat.reservedReason || "Not available"}`,
            });
        }

        // Gender Guard: Validate gender matches seat wing
        const allowedSide = student.gender === 'Female' ? 'Left' : 'Right';
        if (seat.side !== allowedSide && seat.wing !== allowedSide) {
            return res.status(403).json({
                message: `Access Denied: ${student.gender} students can only book seats on the ${allowedSide} side`,
            });
        }

        // Note: No auto-release needed - students must explicitly release first

        const studentDisplayName = student.studentName || 'Student';

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
                        notes: `Booked by ${studentDisplayName}`,
                    },
                },
            },
            { new: true }
        ).populate('student', 'studentName rollNum gender');

        // Race Condition: Seat taken milliseconds ago
        if (!bookedSeat) {
            return res.status(409).json({ message: "Seat already taken or reserved" });
        }

        // Update student record with seat label
        student.seatNumber = bookedSeat.seatLabel || `Seat-${bookedSeat.seatNumber}`;
        await student.save();

        // Map for frontend
        const seatObj = bookedSeat.toObject();
        if (seatObj.student && seatObj.student.studentName) {
            seatObj.student.name = seatObj.student.studentName;
        }

        res.status(200).json({
            message: "Seat booked successfully",
            seat: seatObj,
            seatLabel: bookedSeat.seatLabel,
        });
    } catch (err) {
        console.error('❌ Error booking seat:', err);
        console.error('Stack:', err.stack);
        res.status(500).json({ message: "Error booking seat", error: err.message });
    }
};

/**
 * Release Seat - With History & Change Limit
 */
const releaseSeat = async (req, res) => {
    try {
        const { seatId } = req.body;
        const studentId = req.student._id;

        // Get student to check change limit
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Check seat change limit (max 2 changes allowed)
        const maxChanges = 2;
        if (student.seatChangeCount >= maxChanges) {
            return res.status(403).json({
                message: `Maximum ${maxChanges} seat changes allowed. Please contact admin to change your seat.`,
                changeCount: student.seatChangeCount,
                maxChanges,
            });
        }

        // Find and release seat only if it belongs to the student
        const seat = await Seat.findOneAndUpdate(
            { _id: seatId, student: studentId },
            {
                isTaken: false,
                student: null,
                bookedAt: null,
                $push: {
                    history: {
                        action: 'released',
                        performedBy: studentId,
                        performedByModel: 'student',
                        notes: 'Released by student',
                    },
                },
            },
            { new: true }
        );

        if (!seat) {
            return res.status(404).json({ message: "Seat not found or not booked by you" });
        }

        // Increment seat change counter and clear seatNumber
        await Student.findByIdAndUpdate(studentId, {
            $unset: { seatNumber: 1 },
            $inc: { seatChangeCount: 1 },
        });

        const remainingChanges = maxChanges - (student.seatChangeCount + 1);
        res.status(200).json({
            message: "Seat released successfully",
            seat,
            changeCount: student.seatChangeCount + 1,
            remainingChanges,
        });
    } catch (err) {
        res.status(500).json({ message: "Error releasing seat", error: err.message });
    }
};

// ─────────────────────────────────────────────
// ADMIN ENDPOINTS
// ─────────────────────────────────────────────

/**
 * Initialize 182 seats for a class
 * Layout: 13 rows × 14 columns
 * Left Wing (cols 0-6): Girls | Right Wing (cols 7-13): Boys
 */
const initializeSeats = async (req, res) => {
    try {
        console.log('🎫 Seat initialization request received');
        console.log('  Body:', req.body);
        console.log('  User:', req.user ? { userId: req.user.userId, _id: req.user._id } : 'NO USER');
        
        const { classId, sessionId } = req.body;
        // Always use authenticated user's _id as schoolId
        const schoolId = req.user?._id;

        if (!classId || !sessionId) {
            console.log('❌ Missing classId or sessionId');
            return res.status(400).json({ message: "classId and sessionId are required" });
        }

        if (!schoolId) {
            console.log('❌ No schoolId available');
            return res.status(400).json({ message: "Unable to determine school ID. Please ensure you are logged in." });
        }

        console.log('  Using schoolId:', schoolId);

        // Check if seats already exist
        const existingSeats = await Seat.find({ sclass: classId, session: sessionId });
        if (existingSeats.length > 0) {
            return res.status(400).json({
                message: `Seats already initialized (${existingSeats.length} seats exist)`,
                existingCount: existingSeats.length,
            });
        }

        const ROWS = 13;
        const COLS_PER_WING = 7;
        const TOTAL_COLS = COLS_PER_WING * 2; // 14

        const newSeats = [];
        let seatNumber = 1;

        for (let row = 1; row <= ROWS; row++) {
            for (let col = 0; col < TOTAL_COLS; col++) {
                const wing = col < COLS_PER_WING ? 'Left' : 'Right';
                const seatLabel = `R${String(row).padStart(2, '0')}-${String(col).padStart(2, '0')}`;

                newSeats.push({
                    sclass: classId,
                    session: sessionId,
                    school: schoolId,
                    seatNumber: seatNumber++,
                    seatLabel,
                    wing,
                    side: wing,
                    position: { row, column: col },
                    isTaken: false,
                    isReserved: false,
                    student: null,
                });
            }
        }

        const createdSeats = await Seat.insertMany(newSeats);

        // Update class seatConfig
        await Class.findByIdAndUpdate(classId, {
            'seatConfig.seatsInitialized': true,
        });

        res.status(201).json({
            message: "Seats initialized successfully",
            count: createdSeats.length,
            layout: {
                rows: ROWS,
                totalColumns: TOTAL_COLS,
                leftWingCols: COLS_PER_WING,
                rightWingCols: COLS_PER_WING,
            },
        });
    } catch (err) {
        console.error('❌ SEAT INITIALIZATION ERROR:', err);
        res.status(500).json({ message: "Error initializing seats", error: err.message });
    }
};

/**
 * Get All Seats for Admin View
 */
const getAllSeatsAdmin = async (req, res) => {
    try {
        const { classId, sessionId } = req.params;

        const seats = await Seat.find({
            sclass: classId,
            session: sessionId,
        })
            .populate('student', 'studentName gender rollNum')
            .sort({ 'position.row': 1, 'position.column': 1 });

        // Map studentName → name for frontend
        const mappedSeats = seats.map(s => {
            const sObj = s.toObject();
            if (sObj.student && sObj.student.studentName) {
                sObj.student.name = sObj.student.studentName;
            }
            return sObj;
        });

        const stats = {
            total: seats.length,
            occupied: seats.filter((s) => s.isTaken).length,
            reserved: seats.filter((s) => s.isReserved).length,
            available: seats.filter((s) => !s.isTaken && !s.isReserved).length,
            leftWing: {
                total: seats.filter((s) => s.wing === 'Left').length,
                occupied: seats.filter((s) => s.wing === 'Left' && s.isTaken).length,
            },
            rightWing: {
                total: seats.filter((s) => s.wing === 'Right').length,
                occupied: seats.filter((s) => s.wing === 'Right' && s.isTaken).length,
            },
        };

        res.status(200).json({ seats: mappedSeats, stats });
    } catch (err) {
        res.status(500).json({ message: "Error fetching seats", error: err.message });
    }
};

/**
 * Vacate Seat (Admin Only)
 */
const vacateSeat = async (req, res) => {
    try {
        const { seatId } = req.params;
        const { reason } = req.body;
        const adminId = req.user?._id; // Use authenticated user's ID

        const seat = await Seat.findById(seatId).populate('student', 'studentName');

        if (!seat) {
            return res.status(404).json({ message: "Seat not found" });
        }
        if (!seat.isTaken) {
            return res.status(400).json({ message: "Seat is already vacant" });
        }

        const studentName = seat.student?.studentName || 'Unknown';
        const studentRefId = seat.student?._id;

        seat.history.push({
            action: 'vacated',
            performedBy: adminId,
            performedByModel: 'admin',
            notes: reason || 'Vacated by admin',
        });

        seat.isTaken = false;
        seat.student = null;
        seat.bookedAt = null;
        seat.lastModifiedBy = adminId;

        await seat.save();

        // Clear seatNumber from student
        if (studentRefId) {
            await Student.findByIdAndUpdate(studentRefId, {
                $unset: { seatNumber: 1 },
            });
        }

        res.status(200).json({
            message: `Seat vacated successfully (${studentName} removed)`,
            seat,
        });
    } catch (err) {
        console.error('❌ Error vacating seat:', err);
        res.status(500).json({ message: "Error vacating seat", error: err.message });
    }
};

/**
 * Toggle Seat Reservation (Admin Only)
 */
const toggleReservation = async (req, res) => {
    try {
        console.log('🔄 Toggle reservation request:', req.params, req.body);
        const { seatId } = req.params;
        const { isReserved, reason } = req.body;
        const adminId = req.user?._id; // Use authenticated user's ID

        const seat = await Seat.findById(seatId);

        if (!seat) {
            return res.status(404).json({ message: "Seat not found" });
        }
        if (seat.isTaken && isReserved) {
            return res.status(400).json({ message: "Cannot reserve an occupied seat. Vacate it first." });
        }

        seat.isReserved = isReserved;
        seat.reservedReason = isReserved ? reason : null;
        seat.lastModifiedBy = adminId;

        seat.history.push({
            action: isReserved ? 'reserved' : 'unreserved',
            performedBy: adminId,
            performedByModel: 'admin',
            notes: reason || (isReserved ? 'Reserved by admin' : 'Unreserved'),
        });

        await seat.save();

        res.status(200).json({
            message: `Seat ${isReserved ? 'reserved' : 'unreserved'} successfully`,
            seat,
        });
    } catch (err) {
        res.status(500).json({ message: "Error toggling reservation", error: err.message });
    }
};

module.exports = {
    getAvailableSeats,
    bookSeat,
    releaseSeat,
    initializeSeats,
    getAllSeatsAdmin,
    vacateSeat,
    toggleReservation,
};
