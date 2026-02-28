const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const Order = require("../models/Order");
const Shipment = require("../models/Shipment");
const Customer = require("../models/Customer");
const Product = require("../models/Product");

const createOrder = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { customerNumber, products, city } = req.body;

    if (!customerNumber || !customerNumber.trim())
      throw new Error("Customer phone number is required");
    if (!Array.isArray(products) || products.length === 0)
      throw new Error("Products array is required and cannot be empty");
    if (!city || !city.trim()) throw new Error("City is required");

    const customer = await Customer.findOne(
      { phoneNumber: customerNumber.trim() },
      null,
      { session },
    );
    if (!customer) throw new Error("Customer not found");

    let totalAmount = 0;
    const orderProducts = [];

    for (let item of products) {
      const { productName, quantity, shipmentId, soldPrice, categoryName } =
        item;

      if (!productName) throw new Error("Each product must have a productName");
      if (!quantity || quantity <= 0)
        throw new Error(
          `Product ${productName} quantity must be greater than zero`,
        );
      if (!shipmentId)
        throw new Error(`Product ${productName} must have a shipmentId`);
      if (!soldPrice || soldPrice <= 0)
        throw new Error(`Product ${productName} must have a valid soldPrice`);

      const shipment = await Shipment.findById(shipmentId, null, { session });
      if (!shipment)
        throw new Error(`Shipment with ID ${shipmentId} not found`);

      const shipmentProduct = shipment.products.find(
        (p) =>
          p.productName.toUpperCase() === productName.toUpperCase() &&
          ((categoryName &&
            p.categoryName?.toLowerCase() === categoryName.toLowerCase()) ||
            (!categoryName && !p.categoryName)),
      );

      if (!shipmentProduct)
        throw new Error(
          `Product '${productName}' with category '${categoryName}' not found in shipment`,
        );
      if (shipmentProduct.remainingQuantity < quantity)
        throw new Error(`Insufficient shipment stock for ${productName}`);

      const product = await Product.findById(shipmentProduct.productId, null, {
        session,
      });
      if (shipmentProduct.categoryId) {
        const category = product.categories.find(
          (c) => c._id.toString() === shipmentProduct.categoryId.toString(),
        );
        if (!category || category.categoryQuantity < quantity)
          throw new Error(
            `Insufficient stock for ${productName} in category ${shipmentProduct.categoryName}`,
          );
      } else {
        if (product.productQuantity < quantity)
          throw new Error(`Insufficient stock for ${productName}`);
      }

      totalAmount += soldPrice * quantity;

      orderProducts.push({
        productId: shipmentProduct.productId,
        productName: shipmentProduct.productName,
        categoryName: shipmentProduct.categoryName,
        categoryId: shipmentProduct.categoryId,
        shipmentId,
        quantity,
        soldPrice,
      });
    }

    const order = new Order({
      customerId: customer._id,
      customerName: customer.customerName,
      orderProducts,
      totalAmount,
      city,
    });

    const createdOrder = await order.save({ session });

    await Customer.findByIdAndUpdate(
      customer._id,
      {
        $addToSet: { orders: createdOrder._id },
        $inc: { pendingAmount: totalAmount },
      },
      { session },
    );

    // Update shipments totalReceivedValue and totalSoldValue per product
    await Promise.all(
      orderProducts.map(async (item) => {
        await Shipment.updateOne(
          { _id: item.shipmentId },
          {
            $push: { orders: createdOrder._id },
            $inc: { totalReceivedValue: item.soldPrice * item.quantity },
          },
          { session },
        );

        // Update shipment product remainingQuantity and totalSoldValue
        await Shipment.updateOne(
          { _id: item.shipmentId },
          {
            $inc: {
              "products.$[prod].remainingQuantity": -item.quantity,
              "products.$[prod].totalSoldValue": item.soldPrice * item.quantity,
            },
          },
          {
            session,
            arrayFilters: [
              {
                "prod.productId": item.productId,
                "prod.categoryId": item.categoryId || null,
              },
            ],
          },
        );
      }),
    );

    // Update Product stock
    await Promise.all(
      orderProducts.map(async (item) => {
        const product = await Product.findById(item.productId, null, {
          session,
        });

        if (item.categoryId) {
          await Product.updateOne(
            { _id: item.productId, "categories._id": item.categoryId },
            {
              $inc: { "categories.$.categoryQuantity": -item.quantity },
              $push: { "categories.$.orders": createdOrder._id },
            },
            { session },
          );

          product.categories.forEach((cat) => {
            cat.inStock = cat.categoryQuantity > 0;
            if (cat.categoryQuantity < 0) cat.categoryQuantity = 0;
          });
          product.inStock = product.categories.some((cat) => cat.inStock);
          await product.save({ session });
        } else {
          await Product.updateOne(
            { _id: item.productId },
            [
              {
                $set: {
                  productQuantity: {
                    $subtract: ["$productQuantity", item.quantity],
                  },
                },
              },
              { $set: { inStock: { $gt: ["$productQuantity", 0] } } },
              {
                $set: {
                  orders: { $concatArrays: ["$orders", [createdOrder._id]] },
                },
              },
            ],
            { session, updatePipeline: true },
          );

          product.inStock = product.productQuantity > 0;
          await product.save({ session });
        }
      }),
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json(createdOrder);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ orderDate: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getAllOrders,
  createOrder,
};
