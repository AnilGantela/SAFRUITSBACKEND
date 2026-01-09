const paymentController = require("../controllers/PaymentController");
const paymentRouter = require("express").Router();

paymentRouter.post("/create", paymentController.createPayment);
module.exports = paymentRouter;
