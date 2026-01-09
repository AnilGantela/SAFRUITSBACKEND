const mongoose = require("mongoose");

// Subdocument for category variants
const categorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    inStock: {
      type: Boolean,
      default: false,
    },
    categoryQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    shipments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shipment",
      },
    ],
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
  },
  { _id: true } // keep _id to identify each category
);

// Main Product schema
const productSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      uppercase: true,
      required: true,
      trim: true,
    },

    categories: {
      type: [categorySchema],
      default: [], // empty if no variants
    },

    // Shipments/orders if no categories exist
    shipments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shipment",
      },
    ],
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
    productQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    hasCategories: {
      type: Boolean,
      default: false,
    },
    inStock: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
