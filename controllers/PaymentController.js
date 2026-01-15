const mongoose = require("mongoose");
const Payment = require("../models/Payment");
const Customer = require("../models/Customer");

const createPayment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { amount, customerId, paymentMode } = req.body;

    // 1️⃣ Validate input
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid payment amount" });
    }

    if (!customerId) {
      return res.status(400).json({ message: "Customer ID is required" });
    }

    if (!paymentMode || typeof paymentMode !== "string") {
      return res.status(400).json({ message: "Payment mode is required" });
    }

    session.startTransaction();

    // 2️⃣ Load customer
    const customer = await Customer.findById(customerId).session(session);
    if (!customer) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Customer not found" });
    }

    // 3️⃣ Business rules
    if (customer.pendingAmount === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "Customer has no pending amount",
      });
    }

    if (amount > customer.pendingAmount) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "Payment exceeds customer's pending amount",
      });
    }

    // 4️⃣ Create payment
    const [payment] = await Payment.create(
      [
        {
          amount,
          paymentMode,
          customerId,
        },
      ],
      { session }
    );

    const updatedCustomer = await Customer.findOneAndUpdate(
      { _id: customerId, pendingAmount: { $gte: amount } },
      {
        $inc: { pendingAmount: -amount },
        $push: { payments: payment._id },
      },
      { new: true, session }
    );

    if (!updatedCustomer) {
      throw new Error("Insufficient pending amount");
    }

    await session.commitTransaction();

    res.status(201).json({
      payment,
      pendingAmount: updatedCustomer.pendingAmount,
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
