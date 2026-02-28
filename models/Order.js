const mongoose = require("mongoose");

const orderProductSchema = new mongoose.Schema(
  {
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
    shipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shipment",
      default: null, // which shipment this product came from
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    soldPrice: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
    index: true,
  },
  orderDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  customerName: {
    type: String,
    required: true,
    trim: true,
  },
  city: {
    type: String,
    trim: true,
    default: null,
  },
  orderProducts: {
    type: [orderProductSchema],
    default: [],
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
});

orderSchema.pre("save", async function (next) {
  if (!this.isNew) return next();

  try {
    const cityCode = this.city.substring(0, 3).toUpperCase();
    const session = this.$session();

    const counter = await Counter.findOneAndUpdate(
      { _id: cityCode },
      { $inc: { sequence_value: 1 } },
      {
        new: true,
        upsert: true,
        session,
      },
    );

    const sequenceNumber = counter.sequence_value.toString().padStart(6, "0");

    this.orderId = `${cityCode}-${sequenceNumber}`;

    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model("Order", orderSchema);
