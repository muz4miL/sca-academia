const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    sessionName: {
        type: String,
        required: true,
        unique: true
        // Example: "2025-2026"
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: false
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true
    }
}, { timestamps: true });

// Only one active session per school
sessionSchema.index({ school: 1, isActive: 1 });

module.exports = mongoose.model("session", sessionSchema);
