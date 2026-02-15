const mongoose = require("mongoose");

const seatSchema = new mongoose.Schema(
  {
    sclass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "session",
      required: true,
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "admin",
      required: true,
    },
    seatNumber: {
      type: Number,
      required: true,
    },
    // Display label e.g. "R01-03" (Row 1, Column 3)
    seatLabel: {
      type: String,
      required: true,
      trim: true,
    },
    // Wing designation: Left = Girls, Right = Boys
    wing: {
      type: String,
      enum: ["Left", "Right"],
      required: true,
    },
    // Backward compatibility alias
    side: {
      type: String,
      enum: ["Left", "Right"],
      required: true,
    },
    position: {
      row: {
        type: Number,
        required: true,
        min: 1,
        max: 13,
      },
      column: {
        type: Number,
        required: true,
        min: 0,
        max: 13,
      },
    },
    isTaken: {
      type: Boolean,
      default: false,
    },
    isReserved: {
      type: Boolean,
      default: false,
    },
    reservedReason: {
      type: String,
      trim: true,
      default: null,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },
    bookedAt: {
      type: Date,
      default: null,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "admin",
      default: null,
    },
    // Audit trail
    history: [
      {
        action: {
          type: String,
          enum: ["booked", "released", "reserved", "unreserved", "vacated"],
          required: true,
        },
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: "history.performedByModel",
        },
        performedByModel: {
          type: String,
          enum: ["student", "Student", "admin"],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        notes: String,
      },
    ],
  },
  { timestamps: true }
);

// Compound indexes for performance
seatSchema.index({ sclass: 1, session: 1, seatNumber: 1 }, { unique: true });
seatSchema.index({ sclass: 1, session: 1, wing: 1, isTaken: 1 });
seatSchema.index({ student: 1 });

module.exports = mongoose.model("seat", seatSchema);
