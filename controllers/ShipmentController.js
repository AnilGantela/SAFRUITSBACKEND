const Shipment = require("../models/Shipment");
const Product = require("../models/Product");

const createShipment = async (req, res) => {
  try {
    const { products, vehicleNumber, transportCompany, shipmentDate, city } =
      req.body;

    // Validate main shipment data
    if (!vehicleNumber) {
      return res.status(400).json({ message: "Vehicle number is required" });
    }
    if (!city) {
      return res.status(400).json({ message: "City is required" });
    }
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one product is required" });
    }

    const shipmentProducts = [];

    // Process each product in the request
    for (let item of products) {
      const { productName, quantity, priceAtShipment, categoryName } = item;

      if (!productName) {
        return res.status(400).json({ message: "Product name is required" });
      }
      if (!priceAtShipment || priceAtShipment <= 0) {
        return res.status(400).json({
          message: "Price at shipment is required for " + productName,
        });
      }
      if (!quantity || quantity < 1) {
        return res
          .status(400)
          .json({ message: "Quantity must be at least 1 for " + productName });
      }

      // Find the product
      const product = await Product.findOne({
        productName: productName.toUpperCase(),
      });
      if (!product) {
        return res
          .status(404)
          .json({ message: "Product not found: " + productName });
      }

      let categoryId = null;
      let categoryNameFinal = null;

      if (categoryName) {
        const category = product.categories.find(
          (cat) => cat.categoryName.toLowerCase() === categoryName.toLowerCase()
        );
        if (!category) {
          return res.status(404).json({
            message: `Category '${categoryName}' not found for product '${productName}'`,
          });
        }
        categoryId = category._id;
        categoryNameFinal = category.categoryName.toLowerCase();
      }

      // Add product to shipment array
      shipmentProducts.push({
        productName: product.productName.toUpperCase(),
        categoryName: categoryNameFinal,
        quantity,
        priceAtShipment,
        productId: product._id,
        categoryId,
      });
    }

    // Create the shipment with all products
    const newShipment = new Shipment({
      shipmentDate: shipmentDate ? new Date(shipmentDate) : Date.now(),
      vehicleNumber,
      transportCompany: transportCompany || null,
      products: shipmentProducts,
      city,
    });

    const savedShipment = await newShipment.save();

    // Update product/category shipments
    for (let item of shipmentProducts) {
      if (item.categoryId) {
        // Product has a category
        await Product.updateOne(
          { _id: item.productId, "categories._id": item.categoryId },
          {
            $push: { "categories.$.shipments": savedShipment._id },
            $set: { "categories.$.inStock": true }, // mark category inStock
            $inc: { "categories.$.categoryQuantity": item.quantity },
          }
        );

        // After updating the category, make sure product inStock reflects categories
        const product = await Product.findById(item.productId);
        const anyCategoryInStock = product.categories.some(
          (cat) => cat.inStock
        );
        if (anyCategoryInStock) {
          product.inStock = true;
          await product.save();
        }
      } else {
        // No category, update product
        await Product.updateOne(
          { _id: item.productId },
          {
            $push: { shipments: savedShipment._id },
            $set: { inStock: true }, // mark product inStock
            $inc: { productQuantity: item.quantity },
          }
        );
      }
    }

    return res.status(201).json({ shipment: savedShipment });
  } catch (error) {
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

module.exports = { createShipment, getAllShipments };
