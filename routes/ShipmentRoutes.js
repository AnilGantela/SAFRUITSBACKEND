const shipmentRouter = require("express").Router();
const {
  createShipment,
  getAllShipments,
  getShipmentById,
} = require("../controllers/ShipmentController");

shipmentRouter.post("/create", createShipment);
shipmentRouter.get("/", getAllShipments);
shipmentRouter.get("/:shipmentId", getShipmentById);

module.exports = shipmentRouter;
