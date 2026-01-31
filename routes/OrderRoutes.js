const orderRouter = require("express").Router();
const { createOrder, getAllOrders } = require("../controllers/OrderController");
orderRouter.post("/create", createOrder);
orderRouter.get("/", getAllOrders);

module.exports = orderRouter;
