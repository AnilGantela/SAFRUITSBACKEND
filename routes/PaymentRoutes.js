const paymentController = require("../controllers/PaymentController");
const paymentRouter = require("express").Router();

paymentRouter.post("/create", paymentController.createPayment);
paymentRouter.get("/", paymentController.getAllPaymentsInfo);
module.exports = paymentRouter;
