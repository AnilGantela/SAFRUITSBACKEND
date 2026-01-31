const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const Order = require("../models/Order");
const Shipment = require("../models/Shipment");
const Customer = require("../models/Customer");
const Product = require("../models/Product");

// Create a new order
const createOrder = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { customerNumber, products, city } = req.body;

    if (!customerNumber || !customerNumber.trim()) {
      throw new Error("Customer phone number is required");
    }
    if (!Array.isArray(products) || products.length === 0) {
      throw new Error("Products array is required and cannot be empty");
    }
    if (!city || !city.trim()) {
      throw new Error("City is required");
    }

    const customer = await Customer.findOne(
      {
        phoneNumber: customerNumber.trim(),
      },
      null,
      { session },
    );
    if (!customer) {
      throw new Error("Customer not found");
    }

    const orderProducts = [];
    let totalAmount = 0;

    for (let item of products) {
      if (!item.productName) {
        throw new Error("Each product must have a productName");
      }
      if (item.quantity <= 0) {
        throw new Error(
          `Product ${item.productName} quantity must be greater than zero`,
        );
      }
      if (!item.shipmentId) {
        throw new Error(`Product ${item.productName} must have a shipmentId`);
      }
      if (!item.quantity) {
        throw new Error(`Product ${item.productName} must have quantity`);
      }

      const shipment = await Shipment.findById(item.shipmentId, null, {
        session,
      });
      if (!shipment) {
        throw new Error(`Shipment with ID ${item.shipmentId} not found`);
      }

      const shipmentProduct = shipment.products.find((p) => {
        return (
          p.productName.toUpperCase() === item.productName.toUpperCase() &&
          ((item.categoryName &&
            p.categoryName?.toLowerCase() ===
              item.categoryName.toLowerCase()) ||
            (!item.categoryName && !p.categoryName))
        );
      });

      if (!shipmentProduct) {
        throw new Error(
          `Product '${item.productName}' with category '${item.categoryName}' not found in shipment ${item.shipmentId}`,
        );
      }

      if (shipmentProduct.remainingQuantity < item.quantity) {
        throw new Error(`Insufficient shipment stock for ${item.productName}`);
      }

      if (shipmentProduct.categoryId) {
        const product = await Product.findById(
          shipmentProduct.productId,
          null,
          {
            session,
          },
        );

        const category = product.categories.find(
          (c) => c._id.toString() === shipmentProduct.categoryId.toString(),
        );

        if (!category || category.categoryQuantity < item.quantity) {
          throw new Error(
            `Insufficient stock for ${item.productName} in category ${shipmentProduct.categoryName}`,
          );
        }
      }
      if (!shipmentProduct.categoryId) {
        const product = await Product.findById(
          shipmentProduct.productId,
          null,
          { session },
        );

        if (product.quantity < item.quantity) {
          throw new Error(`Insufficient stock for ${item.productName}`);
        }
      }

      totalAmount += shipmentProduct.priceAtShipment * item.quantity;
      orderProducts.push({
        productId: shipmentProduct.productId,
        productName: shipmentProduct.productName,
        categoryName: shipmentProduct.categoryName,
        categoryId: shipmentProduct.categoryId,
        shipmentId: item.shipmentId,
        quantity: item.quantity,
        priceAtShipment: shipmentProduct.priceAtShipment,
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
        $inc: { pendingAmount: createdOrder.totalAmount },
      },
      { session, new: true },
    );

    await Shipment.updateMany(
      { _id: { $in: orderProducts.map((p) => p.shipmentId) } },
      { $push: { orders: createdOrder._id } },
      { session },
    );

    await Promise.all(
      orderProducts.map(async (item) => {
        await Shipment.updateOne(
          { _id: item.shipmentId },
          {
            $inc: {
              "products.$[prod].remainingQuantity": -item.quantity,
            },
          },
          {
            session,
            arrayFilters: [
              {
                "prod.productId": item.productId,
                ...(item.categoryId
                  ? { "prod.categoryId": item.categoryId }
                  : { "prod.categoryId": null }),
              },
            ],
          },
        );

        if (item.categoryId) {
          // 🔹 Product WITH category

          // 1. Decrease category quantity + add order
          await Product.updateOne(
            { _id: item.productId, "categories._id": item.categoryId },
            {
              $inc: { "categories.$.categoryQuantity": -item.quantity },
              $push: { "categories.$.orders": createdOrder._id },
            },
            { session },
          );

          // 2. Recalculate category & product inStock
          const product = await Product.findById(item.productId, null, {
            session,
          });

          product.categories.forEach((cat) => {
            if (cat.categoryQuantity <= 0) {
              cat.categoryQuantity = 0;
              cat.inStock = false;
            } else {
              cat.inStock = true;
            }
          });

          // 3. Product inStock = ANY category inStock
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

          const product = await Product.findById(item.productId, null, {
            session,
          });
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
