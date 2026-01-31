const customerController = require("../controllers/CustomerController");
const customerRouter = require("express").Router();

customerRouter.post("/create", customerController.createCustomer);
customerRouter.get("/", customerController.getAllCustomers);
customerRouter.get("/:id", customerController.getCustomerById);

module.exports = customerRouter;
