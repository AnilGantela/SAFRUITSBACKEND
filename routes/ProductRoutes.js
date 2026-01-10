const productRouter = require("express").Router();
const {
  createProduct,
  createCategory,
  getAllProducts,
} = require("../controllers/ProductController");

productRouter.post("/create", createProduct);
productRouter.get("/", getAllProducts);
productRouter.post("/category/create", createCategory);
module.exports = productRouter;
