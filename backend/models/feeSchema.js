const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'student',
        required: true
    },
    sclass: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'sclass',
        required: true
    },
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'session',
        required: true
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true
    },
    month: {
        type: String, // "2026-01" format
        required: true
    },
    feeType: {
        type: String,
        enum: ['Tuition', 'Admission', 'Exam', 'Transport', 'Other'],
        default: 'Tuition'
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Paid', 'Overdue'],
        default: 'Pending'
    },
    paidAmount: {
        type: Number,
        default: 0
    },
    paymentHistory: [{
        amount: {
            type: Number,
            required: true
        },
        paidAt: {
            type: Date,
            default: Date.now
        },
        paymentMethod: {
            type: String,
            enum: ['Cash', 'Bank Transfer', 'Online'],
            default: 'Cash'
        },
        receivedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'admin'
        },
        receiptNumber: {
            type: String
        }
    }],
    dueDate: {
        type: Date,
        required: true
    },
    generatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Virtual for remaining amount
feeSchema.virtual('remainingAmount').get(function() {
    return Math.max(0, this.amount - this.paidAmount);
});

feeSchema.set('toJSON', { virtuals: true });
feeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("fee", feeSchema);
