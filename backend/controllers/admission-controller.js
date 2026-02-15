const Signup = require('../models/signupSchema');
const Admission = require('../models/admissionSchema');
const Student = require('../models/studentSchema');
const Fee = require('../models/feeSchema');
const bcrypt = require('bcrypt');

// Get Pending Signups
const getPendingSignups = async (req, res) => {
    try {
        const schoolId = req.user.schoolId;

        const signups = await Signup.find({ 
            school: schoolId, 
            status: 'Pending' 
        }).sort({ submittedAt: -1 });

        res.status(200).json({ count: signups.length, signups });
    } catch (err) {
        res.status(500).json({ message: "Error fetching signups", error: err.message });
    }
};

// Approve Signup - Stage 1 → Stage 2 (Signup → Admission)
const approveSignup = async (req, res) => {
    try {
        const { signupId } = req.params;
        const { assignedClass, sessionId, rollNumber, admissionFee } = req.body;
        const adminId = req.user.id;
        const schoolId = req.user.schoolId;

        // Validation
        if (!assignedClass || !sessionId || !rollNumber || !admissionFee) {
            return res.status(400).json({ 
                message: "assignedClass, sessionId, rollNumber, and admissionFee are required" 
            });
        }

        // Find signup
        const signup = await Signup.findById(signupId);
        if (!signup) {
            return res.status(404).json({ message: "Signup not found" });
        }

        if (signup.status !== 'Pending') {
            return res.status(400).json({ message: "Signup already processed" });
        }

        // Check if roll number already exists
        const existingStudent = await Student.findOne({ rollNum: rollNumber, school: schoolId });
        if (existingStudent) {
            return res.status(400).json({ message: "Roll number already exists" });
        }

        // Create admission record
        const admission = await Admission.create({
            signup: signupId,
            rollNumber: rollNumber,
            assignedClass: assignedClass,
            session: sessionId,
            admissionFee: admissionFee,
            feeStatus: 'Pending',
            approvedBy: adminId,
            school: schoolId,
            admissionDate: new Date()
        });

        // Update signup status
        signup.status = 'Approved';
        await signup.save();

        res.status(201).json({ 
            message: "Signup approved successfully - Admission record created",
            admission: admission
        });
    } catch (err) {
        res.status(500).json({ message: "Error approving signup", error: err.message });
    }
};

// Promote to Student - Stage 2 → Student (Admission → Student with Auto-Invoice)
const promoteToStudent = async (req, res) => {
    try {
        const { admissionId } = req.params;
        const { customPassword, tuitionFee, tuitionDueDate } = req.body;
        const adminId = req.user.id;
        const schoolId = req.user.schoolId;

        // Find admission
        const admission = await Admission.findById(admissionId).populate('signup');
        if (!admission) {
            return res.status(404).json({ message: "Admission not found" });
        }

        if (admission.student) {
            return res.status(400).json({ message: "Student already created for this admission" });
        }

        const signup = admission.signup;
        if (!signup) {
            return res.status(404).json({ message: "Associated signup not found" });
        }

        // Validation
        if (!tuitionFee || tuitionFee <= 0) {
            return res.status(400).json({ message: "Valid tuitionFee is required" });
        }

        let student = null;
        let createdFees = [];

        try {
            // Transaction Safety: Create student with rollback on failure
            
            // Password: Default sca{rollNumber} or custom
            // NOTE: Default password is predictable - should be communicated securely to student
            // Consider requiring customPassword in production for better security
            const password = customPassword || `sca${admission.rollNumber}`;
            const salt = await bcrypt.genSalt(10);
            const hashedPass = await bcrypt.hash(password, salt);

            // Create student
            student = await Student.create({
                name: signup.fullName,
                rollNum: admission.rollNumber,
                password: hashedPass,
                gender: signup.gender,
                sclassName: admission.assignedClass,
                school: schoolId,
                currentSession: admission.session,
                role: "Student"
            });

            // Auto-Invoice: Generate 2 fee records
            
            // 1. Admission fee (status: Paid)
            const currentMonth = new Date().toISOString().slice(0, 7);
            const admissionFeeRecord = await Fee.create({
                student: student._id,
                sclass: admission.assignedClass,
                session: admission.session,
                school: schoolId,
                month: currentMonth,
                feeType: 'Admission',
                amount: admission.admissionFee,
                status: 'Paid',
                paidAmount: admission.admissionFee,
                paymentHistory: [{
                    amount: admission.admissionFee,
                    paidAt: new Date(),
                    paymentMethod: 'Cash',
                    receivedBy: adminId
                }],
                dueDate: new Date(),
                generatedAt: new Date()
            });

            createdFees.push(admissionFeeRecord);

            // 2. Tuition fee (status: Pending)
            const DEFAULT_TUITION_DUE_DAYS = 30;
            const dueDate = tuitionDueDate 
                ? new Date(tuitionDueDate) 
                : new Date(Date.now() + DEFAULT_TUITION_DUE_DAYS * 24 * 60 * 60 * 1000);
            const tuitionFeeRecord = await Fee.create({
                student: student._id,
                sclass: admission.assignedClass,
                session: admission.session,
                school: schoolId,
                month: currentMonth,
                feeType: 'Tuition',
                amount: tuitionFee,
                status: 'Pending',
                paidAmount: 0,
                dueDate: dueDate,
                generatedAt: new Date()
            });

            createdFees.push(tuitionFeeRecord);

            // Update admission record
            admission.student = student._id;
            admission.feeStatus = 'Paid';
            await admission.save();

            res.status(201).json({
                message: "Student promoted successfully with auto-generated fees",
                student: {
                    id: student._id,
                    name: student.name,
                    rollNum: student.rollNum,
                    gender: student.gender,
                    class: admission.assignedClass
                },
                fees: createdFees,
                defaultPassword: customPassword ? null : password
            });

        } catch (err) {
            // Rollback: Delete created records on failure
            if (student) {
                await Student.findByIdAndDelete(student._id);
            }
            if (createdFees.length > 0) {
                await Fee.deleteMany({ _id: { $in: createdFees.map(f => f._id) } });
            }
            throw err;
        }

    } catch (err) {
        res.status(500).json({ message: "Error promoting to student", error: err.message });
    }
};

module.exports = { getPendingSignups, approveSignup, promoteToStudent };
