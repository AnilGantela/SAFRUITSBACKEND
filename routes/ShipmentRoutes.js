const shipmentRouter = require("express").Router();
const { createShipment } = require("../controllers/ShipmentController");

shipmentRouter.post("/create", createShipment);

module.exports = shipmentRouter;
