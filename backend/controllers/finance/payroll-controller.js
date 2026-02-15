const Teacher = require('../../models/teacherSchema');

// Grant Advance Payment
const grantAdvance = async (req, res) => {
    try {
        const { teacherId, amount, reason } = req.body;
        const adminId = req.user.id;

        // Validation
        if (!teacherId || !amount || amount <= 0) {
            return res.status(400).json({ message: "teacherId and valid amount are required" });
        }

        // Find teacher
        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        // Month tracking: "YYYY-MM" format
        const currentMonth = new Date().toISOString().slice(0, 7);

        // Check if advance would exceed base salary
        const currentMonthAdvances = teacher.advanceHistory
            .filter(adv => adv.month === currentMonth)
            .reduce((sum, adv) => sum + adv.amount, 0);

        if (currentMonthAdvances + amount > teacher.baseSalary) {
            return res.status(400).json({ 
                message: "Advance amount exceeds remaining payable for this month",
                baseSalary: teacher.baseSalary,
                totalAdvances: currentMonthAdvances,
                remainingPayable: teacher.baseSalary - currentMonthAdvances,
                requestedAmount: amount
            });
        }

        // Audit Trail: Push to advanceHistory array
        teacher.advanceHistory.push({
            date: new Date(),
            amount: amount,
            reason: reason || "Advance payment",
            issuedBy: adminId,
            month: currentMonth
        });

        await teacher.save();

        // Auto-calculated by virtual
        const remainingPayable = teacher.remainingPayable;

        res.status(201).json({ 
            message: "Advance granted successfully",
            teacher: {
                id: teacher._id,
                name: teacher.name,
                baseSalary: teacher.baseSalary,
                remainingPayable: remainingPayable,
                advanceGranted: amount,
                month: currentMonth
            }
        });
    } catch (err) {
        res.status(500).json({ message: "Error granting advance", error: err.message });
    }
};

// Get Teacher Payroll Summary
const getTeacherPayroll = async (req, res) => {
    try {
        const { teacherId } = req.params;
        const { month } = req.query; // Optional: "YYYY-MM" format

        const teacher = await Teacher.findById(teacherId)
            .select('name email baseSalary advanceHistory salaryHistory');

        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        const currentMonth = month || new Date().toISOString().slice(0, 7);

        // Filter advances for specific month
        const monthAdvances = teacher.advanceHistory.filter(adv => adv.month === currentMonth);
        const totalAdvances = monthAdvances.reduce((sum, adv) => sum + adv.amount, 0);

        // Auto-calculated by virtual for current month
        const remainingPayable = teacher.remainingPayable;

        // Get salary history for the month if exists
        const monthlySalary = teacher.salaryHistory.find(sal => sal.month === currentMonth);

        res.status(200).json({
            teacher: {
                id: teacher._id,
                name: teacher.name,
                email: teacher.email,
                baseSalary: teacher.baseSalary
            },
            month: currentMonth,
            advances: monthAdvances,
            totalAdvances: totalAdvances,
            remainingPayable: remainingPayable,  // Auto-calculated by virtual: baseSalary - currentMonthAdvances
            salaryFinalized: monthlySalary || null
        });
    } catch (err) {
        res.status(500).json({ message: "Error fetching payroll", error: err.message });
    }
};

// Finalize Monthly Salary
const finalizeSalary = async (req, res) => {
    try {
        const { teacherId, month } = req.body;
        const adminId = req.user.id;

        if (!teacherId || !month) {
            return res.status(400).json({ message: "teacherId and month (YYYY-MM) are required" });
        }

        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        // Check if already finalized
        const existingRecord = teacher.salaryHistory.find(sal => sal.month === month);
        if (existingRecord) {
            return res.status(400).json({ message: "Salary already finalized for this month" });
        }

        // Calculate total advances for the month
        const totalAdvances = teacher.getTotalAdvances(month);

        // Calculate final payment
        const finalPayment = Math.max(0, teacher.baseSalary - totalAdvances);

        // Add to salary history
        teacher.salaryHistory.push({
            month: month,
            baseSalary: teacher.baseSalary,
            totalAdvances: totalAdvances,
            finalPayment: finalPayment,
            paidAt: new Date(),
            paidBy: adminId
        });

        await teacher.save();

        res.status(201).json({
            message: "Salary finalized successfully",
            salary: {
                teacherId: teacher._id,
                teacherName: teacher.name,
                month: month,
                baseSalary: teacher.baseSalary,
                totalAdvances: totalAdvances,
                finalPayment: finalPayment
            }
        });
    } catch (err) {
        res.status(500).json({ message: "Error finalizing salary", error: err.message });
    }
};

module.exports = { grantAdvance, getTeacherPayroll, finalizeSalary };
