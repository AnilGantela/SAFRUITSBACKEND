const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: null,
  },
  phoneNumber: {
    type: String,
    trim: true,
    required: true,
    unique: true,
  },
  city: {
    type: String,
    trim: true,
    default: null,
  },
  pendingAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  orders: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
  ],
  payments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },
  ],
  registeredAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $ne: null } } }
);

module.exports = mongoose.model("Customer", userSchema);
