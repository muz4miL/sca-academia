const router = require('express').Router();
const {
    getAvailableSeats,
    bookSeat,
    releaseSeat,
    initializeSeats,
    getAllSeatsAdmin,
    vacateSeat,
    toggleReservation,
} = require('../controllers/seat-controller');
const { protect } = require('../middleware/authMiddleware');
const { protectStudent } = require('../middleware/auth');

// Student Routes (Protected with student JWT)
router.get('/:classId/:sessionId', protectStudent, getAvailableSeats);
router.post('/book', protectStudent, bookSeat);
router.post('/release', protectStudent, releaseSeat);

// Admin Routes (Protected)
router.get('/admin/:classId/:sessionId', protect, getAllSeatsAdmin);
router.post('/initialize', protect, initializeSeats);
router.post('/vacate/:seatId', protect, vacateSeat);
router.patch('/reserve/:seatId', protect, toggleReservation);

module.exports = router;
