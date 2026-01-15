const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentMode: {
    type: String,
    required: true,
  },
  paymentDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
});
module.exports = mongoose.model("Payment", paymentSchema);
