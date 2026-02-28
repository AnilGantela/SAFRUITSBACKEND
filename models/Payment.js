const mongoose = require("mongoose");
const Counter = require("./counter");

const paymentSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      unique: true,
      index: true,
    },

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
      trim: true,
    },

    paymentDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

paymentSchema.pre("save", async function (next) {
  if (!this.isNew) return next();

  try {
    if (!this.paymentMode) return next(new Error("Payment mode is required"));

    const modeCode = this.paymentMode.substring(0, 3).toUpperCase();

    const session = this.$session();

    const counter = await Counter.findOneAndUpdate(
      { _id: modeCode },
      { $inc: { sequence_value: 1 } },
      {
        new: true,
        upsert: true,
        session,
      },
    );

    const sequenceNumber = counter.sequence_value.toString().padStart(6, "0");

    this.paymentId = `${modeCode}-${sequenceNumber}`;

    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model("Payment", paymentSchema);
