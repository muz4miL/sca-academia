const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
    },
    category: {
      type: String,
      enum: ["Stationery", "Furniture", "Electronics", "Cleaning Supplies", "Books & Materials", "Sports Equipment", "Kitchen Supplies", "Other"],
      default: "Other",
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: 0,
      default: 1,
    },
    unit: {
      type: String,
      default: "Piece",
      trim: true,
    },
    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
      min: 0,
    },
    supplier: {
      type: String,
      trim: true,
      default: "",
    },
    purchaseDate: {
      type: Date,
    },
    condition: {
      type: String,
      enum: ["New", "Good", "Fair", "Poor"],
      default: "New",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    // Legacy fields (kept for backward compatibility)
    investorName: {
      type: String,
      default: "Academy",
      trim: true,
    },
    originalCost: {
      type: Number,
      min: 0,
    },
    depreciationRate: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
);

// Virtual: total value
inventorySchema.virtual("totalValue").get(function () {
  return (this.quantity || 0) * (this.unitPrice || 0);
});

module.exports = mongoose.model("Inventory", inventorySchema);
