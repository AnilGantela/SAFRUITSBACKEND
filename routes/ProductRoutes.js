const productRouter = require("express").Router();
const {
  createProduct,
  createCategory,
  getAllProducts,
  getAllCategoriesOfProduct,
} = require("../controllers/ProductController");

productRouter.post("/create", createProduct);
productRouter.get("/", getAllProducts);
productRouter.get("/:productName/categories", getAllCategoriesOfProduct);
productRouter.post("/category/create", createCategory);
module.exports = productRouter;
