const mongoose = require("mongoose");
const Counter = require("./counter");

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
    remainingQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    priceAtShipment: {
      type: Number,
      required: true,
      min: 0,
    },
    totalSoldValue: {
      type: Number,
      default: 0,
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
      default: null,
    },
  },
  { _id: false },
);

const ShipmentSchema = new mongoose.Schema(
  {
    shipmentId: {
      type: String,
      unique: true,
      index: true,
    },

    shipmentDate: {
      type: Date,
      default: Date.now,
    },

    vehicleNumber: {
      type: String,
      required: true,
      trim: true,
    },

    shipmentValue: {
      type: Number,
      required: true,
      min: 0,
    },

    totalReceivedValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    transportCompany: {
      type: String,
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
  },
  { timestamps: true },
);

ShipmentSchema.pre("save", async function (next) {
  if (!this.isNew) return next();

  try {
    if (!this.city) return next(new Error("City is required for shipment ID"));

    const cityCode = this.city.substring(0, 3).toUpperCase();
    const session = this.$session();

    const counter = await Counter.findOneAndUpdate(
      { _id: `SHIPMENT_${cityCode}` }, // separate counter per city
      { $inc: { sequence_value: 1 } },
      {
        new: true,
        upsert: true,
        session,
      },
    );

    const sequenceNumber = counter.sequence_value.toString().padStart(6, "0");

    this.shipmentId = `${cityCode}-${sequenceNumber}`;

    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model("Shipment", ShipmentSchema);
