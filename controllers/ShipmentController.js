const Shipment = require("../models/Shipment");
const Product = require("../models/Product");

const mongoose = require("mongoose");

const createShipment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { products, vehicleNumber, transportCompany, shipmentDate, city } =
      req.body;

    // Validate main shipment data
    if (!vehicleNumber)
      return res.status(400).json({ message: "Vehicle number is required" });
    if (!city) return res.status(400).json({ message: "City is required" });
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one product is required" });
    }

    // Get unique product names
    const productNames = products.map((p) => p.productName.toUpperCase());
    const dbProducts = await Product.find({
      productName: { $in: productNames },
    }).session(session);

    const shipmentProducts = [];

    for (let item of products) {
      const { productName, quantity, priceAtShipment, categoryName } = item;

      if (!productName) throw new Error("Product name is required");
      if (!priceAtShipment || priceAtShipment <= 0)
        throw new Error(`Price at shipment is required for ${productName}`);
      if (!quantity || quantity < 1)
        throw new Error(`Quantity must be at least 1 for ${productName}`);

      const product = dbProducts.find(
        (p) => p.productName === productName.toUpperCase(),
      );
      if (!product)
        return res
          .status(404)
          .json({ message: `Product not found: ${productName}` });

      let categoryId = null;
      let categoryNameFinal = null;

      if (categoryName) {
        const category = product.categories.find(
          (cat) =>
            cat.categoryName.toLowerCase() === categoryName.toLowerCase(),
        );
        if (!category)
          return res.status(404).json({
            message: `Category '${categoryName}' not found for product '${productName}'`,
          });
        categoryId = category._id;
        categoryNameFinal = category.categoryName.toLowerCase();
      }

      shipmentProducts.push({
        productName: product.productName.toUpperCase(),
        categoryName: categoryNameFinal,
        quantity,
        remainingQuantity: quantity,
        priceAtShipment,
        productId: product._id,
        categoryId,
      });
    }

    const shipmentValue = shipmentProducts.reduce(
      (total, item) => total + item.quantity * item.priceAtShipment,
      0,
    );

    // Create the shipment
    const newShipment = new Shipment({
      shipmentDate: shipmentDate ? new Date(shipmentDate) : Date.now(),
      vehicleNumber,
      transportCompany: transportCompany || null,
      products: shipmentProducts,
      city,
      shipmentValue,
    });

    const savedShipment = await newShipment.save({ session });

    // Prepare bulk operations for product updates
    const bulkOps = [];

    for (let item of shipmentProducts) {
      if (item.categoryId) {
        // Update category-level shipments and quantities
        bulkOps.push({
          updateOne: {
            filter: { _id: item.productId, "categories._id": item.categoryId },
            update: {
              $push: { "categories.$.shipments": savedShipment._id },
              $set: { "categories.$.inStock": true },
              $inc: { "categories.$.categoryQuantity": item.quantity },
            },
          },
        });
      } else {
        // Update product-level shipments and quantities
        bulkOps.push({
          updateOne: {
            filter: { _id: item.productId },
            update: {
              $push: { shipments: savedShipment._id },
              $set: { inStock: true },
              $inc: { productQuantity: item.quantity },
            },
          },
        });
      }
    }

    if (bulkOps.length > 0) {
      await Product.bulkWrite(bulkOps, { session });
    }

    // After bulk update, ensure product inStock reflects categories
    const productIds = [
      ...new Set(shipmentProducts.map((p) => p.productId.toString())),
    ];
    const updatedProducts = await Product.find({
      _id: { $in: productIds },
    }).session(session);

    for (let product of updatedProducts) {
      if (product.categories.length > 0) {
        product.inStock = product.categories.some((cat) => cat.inStock);
        await product.save({ session });
      }
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({ shipment: savedShipment });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const getAllShipments = async (req, res) => {
  try {
    const shipments = await Shipment.find(); // await the query
    res.status(200).json(shipments); // send the shipments as JSON
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const getShipmentById = async (req, res) => {
  try {
    const { shipmentId } = req.params;

    const shipment = await Shipment.findById(shipmentId);

    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    res.status(200).json(shipment);
  } catch (error) {
    console.error(error);

    // Handle invalid ObjectId
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid shipment ID" });
    }

    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

const getShipmentsByProductName = async (req, res) => {
  try {
    const { productName } = req.params; // or req.query.productName

    if (!productName || !productName.trim()) {
      return res.status(400).json({ message: "Product name is required" });
    }

    // Find shipments where products array has the product with remainingQuantity > 0
    const shipments = await Shipment.find({
      products: {
        $elemMatch: {
          productName: { $regex: `^${productName}$`, $options: "i" }, // case-insensitive exact match
          remainingQuantity: { $gt: 0 }, // greater than zero
        },
      },
    });

    if (!shipments.length) {
      return res
        .status(404)
        .json({ message: "No shipments found for this product" });
    }

    res.status(200).json(shipments);
  } catch (error) {
    console.error("Error fetching shipments by product:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createShipment,
  getAllShipments,
  getShipmentById,
  getShipmentsByProductName,
};
