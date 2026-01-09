const orderRouter = require("express").Router();
const { createOrder } = require("../controllers/OrderController");
orderRouter.post("/create", createOrder);

module.exports = orderRouter;
