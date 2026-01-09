const productRouter = require("express").Router();
const {
  createProduct,
  createCategory,
} = require("../controllers/ProductController");

productRouter.post("/create", createProduct);
productRouter.post("/category/create", createCategory);
module.exports = productRouter;
