const jwt = require("jsonwebtoken");
const Student = require("../models/Student");
const User = require("../models/User");

/**
 * Protect student routes with JWT validation.
 * Reads studentToken from cookie or Authorization: Bearer header.
 * Sets req.student with the authenticated student document.
 */
const protectStudent = async (req, res, next) => {
    try {
        let token;

        // Check for token in cookie or Authorization header
        if (req.cookies && req.cookies.studentToken) {
            token = req.cookies.studentToken;
        } else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Not authorized - No token",
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== "student") {
            return res.status(403).json({
                success: false,
                message: "Not authorized - Invalid role",
            });
        }

        // Get student from DB
        const student = await Student.findById(decoded.id);
        if (!student) {
            return res.status(401).json({
                success: false,
                message: "Student not found",
            });
        }

        req.student = student;
        next();
    } catch (error) {
        console.error("Student auth error:", error.message);
        return res.status(401).json({
            success: false,
            message: "Not authorized - Invalid token",
        });
    }
};

/**
 * Protect admin routes with JWT validation.
 * Uses the same protect middleware from authMiddleware.js pattern.
 */
const verifyAdmin = async (req, res, next) => {
    try {
        const cookies = req.cookies || {};
        let token = cookies.token || cookies.authToken;

        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith("Bearer ")) {
                token = authHeader.split(" ")[1];
            }
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid token: user not found",
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("Admin auth error:", error.message);
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
};

module.exports = { protectStudent, verifyAdmin };
