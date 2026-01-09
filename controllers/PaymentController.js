const mongoose = require("mongoose");
const Payment = require("../models/Payment");
const Order = require("../models/Order");
const Customer = require("../models/Customer");

const createPayment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { amount, orderId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid payment amount" });
    }

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    session.startTransaction();

    const order = await Order.findById(orderId).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Order not found" });
    }

    if (amount > order.remainingAmount) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ message: "Payment exceeds remaining amount" });
    }

    // ✅ Destructuring here
    const [payment] = await Payment.create(
      [
        {
          orderId,
          amount,
          customerId: order.customerId,
        },
      ],
      { session }
    );

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        $inc: { remainingAmount: -amount },
        $push: { payments: payment._id },
      },
      { new: true, session }
    );

    await Customer.findByIdAndUpdate(
      order.customerId,
      {
        $push: { payments: payment._id },
      },
      { session }
    );

    await session.commitTransaction();
    res.status(201).json({
      payment,
      remainingAmount: updatedOrder.remainingAmount,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

module.exports = {
  createPayment,
};
