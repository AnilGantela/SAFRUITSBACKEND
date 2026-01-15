const productRouter = require("express").Router();
const {
  createProduct,
  createCategory,
  getAllProducts,
  getAllCategoriesOfProduct,
  getAllNamesAndCategories,
} = require("../controllers/ProductController");

productRouter.post("/create", createProduct);
productRouter.get("/", getAllProducts);
productRouter.get("/:productName/categories", getAllCategoriesOfProduct);
productRouter.post("/category/create", createCategory);
productRouter.get("/allNamesAndCategories", getAllNamesAndCategories);
module.exports = productRouter;
