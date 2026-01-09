const Customer = require("../models/Customer");

const createCustomer = async (req, res) => {
  try {
    const { customerName, phoneNumber, email, city } = req.body;
    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ message: "Customer name is required" });
    }
    if (!phoneNumber || !phoneNumber.trim()) {
      return res.status(400).json({ message: "Phone number is required" });
    }
    if (
      (phoneNumber && phoneNumber.trim().length < 10) ||
      !/^\d+$/.test(phoneNumber.trim()) ||
      phoneNumber.trim().length > 10
    ) {
      return res
        .status(400)
        .json({ message: "Phone number must be  10 digits " });
    }
    if (!city || !city.trim()) {
      return res.status(400).json({ message: "City is required" });
    }

    const customer = await Customer.findOne({
      phoneNumber: phoneNumber.trim(),
    });
    if (customer) {
      return res
        .status(400)
        .json({ message: "Customer with this phone number already exists" });
    }

    const customerByEmail = await Customer.findOne({
      email: email ? email.trim().toLowerCase() : null,
    });
    if (email && customerByEmail) {
      return res
        .status(400)
        .json({ message: "Customer with this email already exists" });
    }

    const newCustomer = new Customer({
      customerName: customerName.trim().toUpperCase(),
      phoneNumber: phoneNumber ? phoneNumber.trim() : null,
      email: email ? email.trim().toLowerCase() : null,
      city,
    });
    const savedCustomer = await newCustomer.save();
    res.status(201).json(savedCustomer);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = {
  createCustomer,
};
