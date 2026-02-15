const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ========================================
// UTILITY: Generate JWT Token
// ========================================
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};

// ========================================
// UTILITY: Send Cookie Response
// ========================================
const sendTokenResponse = (user, statusCode, res, message) => {
    const token = generateToken(user._id);

    // Cookie options
    const cookieOptions = {
        httpOnly: true, // Prevents XSS attacks
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'strict', // CSRF protection
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    };

    // Update last login
    user.lastLogin = new Date();
    user.save({ validateBeforeSave: false });

    res.status(statusCode)
        .cookie('authToken', token, cookieOptions)
        .json({
            success: true,
            message,
            user: user.getPublicProfile(),
        });
};

// ========================================
// @route   POST /api/auth/login
// @desc    Authenticate user and set cookie
// @access  Public
// ========================================
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // SECURITY: Reject tokens in body
        if (req.body.token || req.body.authToken) {
            return res.status(403).json({
                success: false,
                message: '⛔ Security Violation: Do not send tokens in the request body.',
            });
        }

        // Validate input
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide username and password.',
            });
        }

        // Find user (explicitly select password for comparison)
        const user = await User.findOne({ username }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: '❌ Invalid credentials.',
            });
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: '🚫 Account is deactivated. Contact admin.',
            });
        }

        // Compare password
        const isPasswordCorrect = await user.comparePassword(password);

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: '❌ Invalid credentials.',
            });
        }

        // Send token via cookie
        sendTokenResponse(user, 200, res, `✅ Welcome back, ${user.fullName}!`);
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

// ========================================
// @route   POST /api/auth/logout
// @desc    Clear auth cookie
// @access  Private
// ========================================
exports.logout = async (req, res) => {
    try {
        res.status(200)
            .cookie('authToken', 'none', {
                httpOnly: true,
                expires: new Date(Date.now() + 1000), // Expire immediately
                sameSite: 'strict',
            })
            .json({
                success: true,
                message: '✅ Logged out successfully.',
            });
    } catch (error) {
        console.error('Logout Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during logout.',
        });
    }
};

// ========================================
// @route   GET /api/auth/me
// @desc    Get current logged-in user
// @access  Private
// ========================================
exports.getMe = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            user: req.user.getPublicProfile(),
        });
    } catch (error) {
        console.error('Get Me Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user data.',
        });
    }
};

// ========================================
// @route   POST /api/auth/create-staff
// @desc    Create a new STAFF account (OWNER only)
// @access  Private (OWNER)
// ========================================
exports.createStaff = async (req, res) => {
    try {
        const { username, password, fullName, phone, email, permissions } = req.body;

        // Validate input
        if (!username || !password || !fullName) {
            return res.status(400).json({
                success: false,
                message: 'Please provide username, password, and full name.',
            });
        }

        // Check if username already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: '❌ Username already exists.',
            });
        }

        // Generate unique userId
        const staffCount = await User.countDocuments({ role: 'STAFF' });
        const userId = `STAFF-${String(staffCount + 1).padStart(3, '0')}`;

        // Create new staff member
        const newStaff = await User.create({
            userId,
            username,
            password, // Will be hashed by pre-save hook
            fullName,
            role: 'STAFF',
            phone,
            email,
            permissions: permissions || ['dashboard'], // Default to dashboard if not provided
            canBeDeleted: true,
            isActive: true,
            createdBy: req.user._id,
        });

        res.status(201).json({
            success: true,
            message: `✅ Staff account created successfully for ${fullName}.`,
            user: newStaff.getPublicProfile(),
        });
    } catch (error) {
        console.error('Create Staff Error:', error);

        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', '),
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }

        // Handle duplicate key errors
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: '❌ Username already exists.',
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error creating staff account.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

// ========================================
// @route   GET /api/auth/staff
// @desc    Get all staff members (OWNER only)
// @access  Private (OWNER)
// ========================================
exports.getAllStaff = async (req, res) => {
    try {
        const staff = await User.find({ role: 'STAFF' })
            .select('-password')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: staff.length,
            staff: staff.map((s) => s.getPublicProfile()),
        });
    } catch (error) {
        console.error('Get Staff Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching staff list.',
        });
    }
};

// ========================================
// @route   PATCH /api/auth/staff/:id/toggle
// @desc    Activate/Deactivate staff (OWNER only)
// @access  Private (OWNER)
// ========================================
exports.toggleStaffStatus = async (req, res) => {
    try {
        const staff = await User.findById(req.params.id);

        if (!staff || staff.role !== 'STAFF') {
            return res.status(404).json({
                success: false,
                message: '❌ Staff member not found.',
            });
        }

        staff.isActive = !staff.isActive;
        await staff.save();

        res.status(200).json({
            success: true,
            message: `✅ Staff ${staff.isActive ? 'activated' : 'deactivated'} successfully.`,
            user: staff.getPublicProfile(),
        });
    } catch (error) {
        console.error('Toggle Staff Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error toggling staff status.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

// ========================================
// @route   PATCH /api/auth/staff/:id
// @desc    Update staff account (OWNER only)
// @access  Private (OWNER)
// ========================================
exports.updateStaff = async (req, res) => {
    try {
        const { fullName, password, permissions } = req.body;

        const staff = await User.findById(req.params.id);

        if (!staff || staff.role !== 'STAFF') {
            return res.status(404).json({
                success: false,
                message: '❌ Staff member not found.',
            });
        }

        // Update fields
        if (fullName) staff.fullName = fullName;
        if (permissions) staff.permissions = permissions;

        // Only update password if provided
        if (password && password.trim()) {
            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 6 characters.',
                });
            }
            staff.password = password; // Will be hashed by pre-save hook
        }

        await staff.save();

        res.status(200).json({
            success: true,
            message: `✅ Staff account updated successfully.`,
            user: staff.getPublicProfile(),
        });
    } catch (error) {
        console.error('Update Staff Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating staff account.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};


// ========================================
// @route   POST /api/auth/reset-password
// @desc    Reset a user's or student's password (OWNER/Admin only)
// @access  Private (OWNER)
// ========================================
exports.resetPassword = async (req, res) => {
    try {
        const { userId, newPassword } = req.body;
        
        console.log('🔐 PASSWORD RESET REQUEST:', { userId, passwordLength: newPassword?.length });

        if (!userId || !newPassword) {
            console.log('❌ Missing userId or newPassword');
            return res.status(400).json({
                success: false,
                message: 'Please provide userId and newPassword.',
            });
        }

        if (newPassword.length < 6) {
            console.log('❌ Password too short');
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters.',
            });
        }

        // First, try to find in User collection (staff/admin)
        console.log('🔍 Searching in User collection...');
        let user = await User.findOne({
            $or: [
                { userId: userId },
                { username: userId },
                { _id: userId.match(/^[0-9a-fA-F]{24}$/) ? userId : undefined },
            ].filter(q => q !== undefined && Object.values(q)[0] !== undefined),
        });

        if (user) {
            // Set new password (will be hashed by pre-save hook)
            user.password = newPassword;
            await user.save();

            console.log(`✅ Admin password reset for: ${user.fullName}`);
            return res.status(200).json({
                success: true,
                message: `✅ Password reset successfully for ${user.fullName}.`,
                user: {
                    userId: user.userId,
                    username: user.username,
                    fullName: user.fullName,
                    role: user.role,
                },
            });
        }

        // If not found in User, try Student collection
        const Student = require('../models/Student');
        console.log(`🔍 Searching for student with identifier: "${userId}"`);
        
        // First check what students exist
        const allStudents = await Student.find({}, 'studentId barcodeId studentName').limit(5);
        console.log('📋 Sample students in DB:', allStudents.map(s => ({ 
            studentId: s.studentId, 
            barcodeId: s.barcodeId, 
            name: s.studentName 
        })));
        
        const student = await Student.findOne({
            $or: [
                { studentId: String(userId) },
                { barcodeId: String(userId) },
                { email: typeof userId === 'string' ? userId.toLowerCase() : userId },
                { _id: userId.match && userId.match(/^[0-9a-fA-F]{24}$/) ? userId : null },
            ].filter(q => q && Object.values(q)[0]),
        });
        
        console.log(`🔍 Student search result: ${student ? `Found ${student.studentName} (${student.barcodeId})` : 'Not found'}`);

        if (student) {
            // Set new password (will be hashed by pre-save hook in Student model)
            student.password = newPassword;
            student.plainPassword = newPassword; // Store plain password for credentials display
            await student.save();

            console.log(`✅ Student password reset for: ${student.studentName} (${student.studentId})`);
            return res.status(200).json({
                success: true,
                message: `✅ Password reset successfully for ${student.studentName}.`,
                user: {
                    studentId: student.studentId,
                    barcodeId: student.barcodeId,
                    studentName: student.studentName,
                    role: 'student',
                },
            });
        }

        // Neither User nor Student found
        return res.status(404).json({
            success: false,
            message: '❌ User not found.',
        });

    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error resetting password.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

// ========================================
// @route   DELETE /api/auth/staff/:id
// @desc    Delete staff account (OWNER only)
// @access  Private (OWNER)
// ========================================
exports.deleteStaff = async (req, res) => {
    try {
        const staff = await User.findById(req.params.id);

        if (!staff || staff.role !== 'STAFF') {
            return res.status(404).json({
                success: false,
                message: '❌ Staff member not found.',
            });
        }

        // Prevent deleting yourself
        if (staff._id.toString() === req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: '⛔ Cannot delete your own account.',
            });
        }

        await staff.deleteOne();

        res.status(200).json({
            success: true,
            message: `✅ ${staff.fullName}'s account deleted successfully.`,
        });
    } catch (error) {
        console.error('Delete Staff Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting staff account.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};
