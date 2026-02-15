const mongoose = require('mongoose');

const admissionSchema = new mongoose.Schema({
    signup: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'signup',
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'student'
    },
    rollNumber: {
        type: Number,
        required: true,
        unique: true
    },
    assignedClass: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'sclass',
        required: true
    },
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'session',
        required: true
    },
    admissionDate: {
        type: Date,
        default: Date.now
    },
    admissionFee: {
        type: Number,
        required: true
    },
    feeStatus: {
        type: String,
        enum: ['Pending', 'Paid'],
        default: 'Pending'
    },
    documents: [{
        name: {
            type: String,
            required: true
        },
        url: {
            type: String,
            required: true
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin'
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model("admission", admissionSchema);
