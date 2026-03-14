const express = require("express");
const router = express.Router();
const Inventory = require("../models/Inventory");
const { protect } = require("../middleware/authMiddleware");

/**
 * Inventory / Asset Registry Routes
 * All routes are protected (admin/staff access)
 */

// GET /api/inventory — List all inventory items
router.get("/", protect, async (req, res) => {
  try {
    const items = await Inventory.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, data: items });
  } catch (error) {
    console.error("❌ Error fetching inventory:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch inventory", error: error.message });
  }
});

// POST /api/inventory — Create a new inventory item
router.post("/", protect, async (req, res) => {
  try {
    const {
      itemName, category, quantity, unit, unitPrice,
      supplier, purchaseDate, condition, description,
      // legacy fields
      investorName, originalCost, depreciationRate,
    } = req.body;

    if (!itemName || unitPrice == null) {
      return res.status(400).json({ success: false, message: "itemName and unitPrice are required" });
    }

    const item = await Inventory.create({
      itemName,
      category: category || "Other",
      quantity: quantity != null ? Number(quantity) : 1,
      unit: unit || "Piece",
      unitPrice: Number(unitPrice),
      supplier: supplier || "",
      purchaseDate: purchaseDate || null,
      condition: condition || "New",
      description: description || "",
      // legacy
      investorName: investorName || "Academy",
      originalCost: originalCost != null ? Number(originalCost) : Number(unitPrice),
      depreciationRate: depreciationRate != null ? Number(depreciationRate) : 10,
    });

    console.log(`📦 Inventory item created: ${item.itemName} — Qty: ${item.quantity} @ PKR ${item.unitPrice}`);
    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error("❌ Error creating inventory item:", error);
    return res.status(500).json({ success: false, message: "Failed to create inventory item", error: error.message });
  }
});

// PUT /api/inventory/:id — Update an inventory item
router.put("/:id", protect, async (req, res) => {
  try {
    const {
      itemName, category, quantity, unit, unitPrice,
      supplier, purchaseDate, condition, description,
    } = req.body;

    const item = await Inventory.findByIdAndUpdate(
      req.params.id,
      {
        ...(itemName && { itemName }),
        ...(category && { category }),
        ...(quantity != null && { quantity: Number(quantity) }),
        ...(unit && { unit }),
        ...(unitPrice != null && { unitPrice: Number(unitPrice) }),
        ...(supplier !== undefined && { supplier }),
        ...(purchaseDate !== undefined && { purchaseDate }),
        ...(condition && { condition }),
        ...(description !== undefined && { description }),
      },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    console.log(`✏️ Inventory item updated: ${item.itemName}`);
    return res.status(200).json({ success: true, data: item });
  } catch (error) {
    console.error("❌ Error updating inventory item:", error);
    return res.status(500).json({ success: false, message: "Failed to update inventory item", error: error.message });
  }
});

// DELETE /api/inventory/:id — Delete an inventory item
router.delete("/:id", protect, async (req, res) => {
  try {
    const item = await Inventory.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }
    console.log(`🗑️ Inventory item deleted: ${item.itemName}`);
    return res.status(200).json({ success: true, message: "Item deleted" });
  } catch (error) {
    console.error("❌ Error deleting inventory item:", error);
    return res.status(500).json({ success: false, message: "Failed to delete inventory item", error: error.message });
  }
});

module.exports = router;
