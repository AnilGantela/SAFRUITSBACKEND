const mongoose = require("mongoose");

const shipmentProductSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    categoryName: {
      type: String,
      trim: true,
      default: null,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    remainingQunatity: {
      type: Number,
      required: true,
      min: 0,
    },
    priceAtShipment: {
      type: Number,
      required: true,
      min: 0,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product.categories",
      default: null, // null if product has no categories
    },
  },
  { _id: false }
);

const ShipmentSchema = new mongoose.Schema({
  shipmentDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  vehicleNumber: {
    type: String,
    required: true,
    trim: true,
    unique: false,
  },
  city: {
    type: String,
    required: true,
    trim: true,
  },
  transportCompany: {
    type: String,
    trim: true,
    default: null,
  },
  products: {
    type: [shipmentProductSchema],
    default: [],
  },
  orders: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
  ],
});

module.exports = mongoose.model("Shipment", ShipmentSchema);
