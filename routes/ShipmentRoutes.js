const shipmentRouter = require("express").Router();
const {
  createShipment,
  getAllShipments,
  getShipmentById,
  getShipmentsByProductName,
} = require("../controllers/ShipmentController");

shipmentRouter.post("/create", createShipment);
shipmentRouter.get("/", getAllShipments);
shipmentRouter.get("/:shipmentId", getShipmentById);
shipmentRouter.get("/product/:productName", getShipmentsByProductName);

module.exports = shipmentRouter;
