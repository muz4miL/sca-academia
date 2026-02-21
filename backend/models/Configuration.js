const mongoose = require("mongoose");

const configurationSchema = new mongoose.Schema(
  {
    // Academy Identity
    academyName: { type: String, default: "Sciences Coaching Academy" },
    academyLogo: { type: String, default: "" },
    academyAddress: { type: String, default: "Peshawar, Pakistan" },
    academyPhone: { type: String, default: "" },

    // Teacher Compensation (Global Default)
    salaryConfig: {
      teacherShare: { type: Number, default: 70, min: 0, max: 100 },
      academyShare: { type: Number, default: 30, min: 0, max: 100 },
    },

    // Student Fee Configuration - Global base fees
    defaultSubjectFees: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        fee: {
          type: Number,
          default: 0,
          min: [0, "Subject fee cannot be negative"],
        },
      },
    ],

    // Session-Based Pricing
    // Each session (e.g., "MDCAT 2026") has a fixed PKR rate
    sessionPrices: [
      {
        sessionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Session",
          required: true,
        },
        sessionName: {
          type: String,
          trim: true,
        },
        price: {
          type: Number,
          default: 0,
          min: [0, "Session price cannot be negative"],
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],

    // Financial Policies
    defaultLateFee: { type: Number, default: 500 },
    feeDueDay: { type: Number, enum: [1, 5, 10, 15], default: 10 },

    // Student Profile Picture Settings
    studentProfilePictureSettings: {
      maxChangesPerStudent: {
        type: Number,
        default: 3,
        min: 0,
        max: 999,
      },
      allowStudentPictureChanges: {
        type: Boolean,
        default: true,
      },
      pictureDisplayOnSlip: {
        type: Boolean,
        default: true,
      },
      fallbackEmoji: {
        type: String,
        default: "🎓",
      },
      maxFileSizeMB: {
        type: Number,
        default: 5,
        min: 1,
        max: 20,
      },
    },
  },
  { timestamps: true },
);

// Pre-save validation
configurationSchema.pre("save", async function () {
  const salaryTotal =
    this.salaryConfig.teacherShare + this.salaryConfig.academyShare;
  if (salaryTotal !== 100) {
    throw new Error(`Salary split must total 100%, got ${salaryTotal}%`);
  }

  // Initialize default subject fees if new document and empty
  if (
    this.isNew &&
    (!this.defaultSubjectFees || this.defaultSubjectFees.length === 0)
  ) {
    this.defaultSubjectFees = [
      { name: "Biology", fee: 3000 },
      { name: "Physics", fee: 3000 },
      { name: "Chemistry", fee: 2500 },
      { name: "Mathematics", fee: 2500 },
      { name: "English", fee: 2000 },
    ];
    console.log(
      "✅ Initialized configuration with standard subject rates",
    );
  }
});

module.exports = mongoose.model("Configuration", configurationSchema);
