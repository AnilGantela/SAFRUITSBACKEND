const Product = require("../models/Product");

const createProduct = async (req, res) => {
  try {
    const { productName } = req.body;

    if (!productName || !productName.trim()) {
      return res.status(400).json({ message: "Product name is required" });
    }

    // Check if product already exists
    const existingProduct = await Product.findOne({
      productName: productName.trim().toUpperCase(),
    });
    if (existingProduct) {
      return res.status(409).json({ message: "Product already exists" });
    }

    const newProduct = new Product({
      productName: productName.trim().toUpperCase(),
      categories: [], // initially empty
      inStock: false, // default false until shipments/categories added
      shipments: [],
      orders: [],
    });

    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const { productName, categoryName } = req.body;

    if (!productName || !productName.trim()) {
      return res.status(400).json({ message: "Product name is required" });
    }

    if (!categoryName || !categoryName.trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }

    // Find product
    const product = await Product.findOne({
      productName: productName.trim().toUpperCase(),
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if category with the same name already exists
    const existingCategory = product.categories.find(
      (cat) =>
        cat.categoryName.toLowerCase() === categoryName.trim().toLowerCase()
    );
    if (existingCategory) {
      return res
        .status(409)
        .json({ message: "Category already exists for this product" });
    }

    // Add category
    product.categories.push({
      categoryName: categoryName.trim(),
      inStock: false,
      shipments: [],
      orders: [],
    });

    product.hasCategories = true;

    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Get all products
const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

// Get all categories of a specific product
const getAllCategoriesOfProduct = async (req, res) => {
  try {
    const { productName } = req.params;

    const product = await Product.findOne({ productName });

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.status(200).json(product.categories);
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

const getAllNamesAndCategories = async (req, res) => {
  try {
    // Fetch all products
    const products = await Product.find(
      {},
      "productName categories.categoryName"
    );

    // Format response as: [{ productName, categories: [categoryName1, categoryName2] }, ...]
    const result = products.map((product) => ({
      productName: product.productName,
      categories: product.categories.map((cat) => cat.categoryName),
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching products and categories:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createProduct,
  createCategory,
  getAllProducts,
  getAllCategoriesOfProduct,
  getAllNamesAndCategories,
};
