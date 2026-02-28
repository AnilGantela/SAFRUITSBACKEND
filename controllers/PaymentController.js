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
      { session },
    );

    const updatedCustomer = await Customer.findOneAndUpdate(
      { _id: customerId, pendingAmount: { $gte: amount } },
      {
        $inc: { pendingAmount: -amount },
        $push: { payments: payment._id },
      },
      { new: true, session },
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

const getAllPaymentsInfo = async (req, res) => {
  try {
    // Fetch all payments with customer details
    const payments = await Payment.find()
      .populate("customerId", " customerName phoneNumber pendingAmount")
      .sort({ paymentDate: -1 });

    // Calculate total collected amount
    const totalCollection = payments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );

    res.status(200).json({
      totalPayments: payments.length,
      totalCollection,
      payments,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch payments",
      error: error.message,
    });
  }
};

module.exports = {
  createPayment,
  getAllPaymentsInfo,
};
