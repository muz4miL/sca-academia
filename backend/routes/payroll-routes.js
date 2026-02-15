const router = require('express').Router();
const { grantAdvance, getTeacherPayroll, finalizeSalary } = require('../controllers/finance/payroll-controller');
const { protect } = require('../middleware/authMiddleware');

router.post('/advance', protect, grantAdvance);
router.get('/teacher/:teacherId', protect, getTeacherPayroll);
router.post('/finalize', protect, finalizeSalary);

module.exports = router;
