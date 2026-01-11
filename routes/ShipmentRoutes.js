const shipmentRouter = require("express").Router();
const {
  createShipment,
  getAllShipments,
} = require("../controllers/ShipmentController");

shipmentRouter.post("/create", createShipment);
shipmentRouter.get("/", getAllShipments);

module.exports = shipmentRouter;
