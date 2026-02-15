const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        unique: true,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        default: "Teacher"
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true,
    },
    teachSubject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'subject',
    },
    teachSclass: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'sclass',
        required: true,
    },
    baseSalary: {
        type: Number,
        required: true,
        default: 0
    },
    advanceHistory: [{
        date: {
            type: Date,
            required: true,
            default: Date.now
        },
        amount: {
            type: Number,
            required: true
        },
        reason: {
            type: String,
            default: ""
        },
        issuedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'admin'
        },
        month: {
            type: String, // "2026-01" format
            required: true
        }
    }],
    salaryHistory: [{
        month: {
            type: String, // "2026-01" format
            required: true
        },
        baseSalary: {
            type: Number,
            required: true
        },
        totalAdvances: {
            type: Number,
            default: 0
        },
        finalPayment: {
            type: Number,
            required: true
        },
        paidAt: {
            type: Date,
            default: Date.now
        },
        paidBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'admin'
        }
    }]
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// 🔥 VIRTUAL: Auto-calculate remaining payable for current month
teacherSchema.virtual('remainingPayable').get(function() {
    const currentMonth = new Date().toISOString().slice(0, 7); // "2026-01"
    const currentMonthAdvances = this.advanceHistory
        .filter(adv => adv.month === currentMonth)
        .reduce((sum, adv) => sum + adv.amount, 0);
    
    return Math.max(0, this.baseSalary - currentMonthAdvances);
});

// 🔥 METHOD: Get total advances for a specific month
teacherSchema.methods.getTotalAdvances = function(month) {
    return this.advanceHistory
        .filter(adv => adv.month === month)
        .reduce((sum, adv) => sum + adv.amount, 0);
};

module.exports = mongoose.model("teacher", teacherSchema);
