const router = require('express').Router();
const { approveSignup, promoteToStudent, getPendingSignups } = require('../controllers/admission-controller');
const { protect } = require('../middleware/authMiddleware');

router.get('/signups', protect, getPendingSignups);
router.post('/approve-signup/:signupId', protect, approveSignup);
router.post('/promote/:admissionId', protect, promoteToStudent);

module.exports = router;
