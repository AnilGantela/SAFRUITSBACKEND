const customerController = require("../controllers/CustomerController");
const customerRouter = require("express").Router();

customerRouter.post("/create", customerController.createCustomer);

module.exports = customerRouter;
