const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors"); // 👈 add this
const rateLimit = require("express-rate-limit");

const productRouter = require("./routes/ProductRoutes");
const shipmentRouter = require("./routes/ShipmentRoutes");
const customerRouter = require("./routes/CustomerRoutes");
const paymentRouter = require("./routes/PaymentRoutes");
const orderRouter = require("./routes/OrderRoutes");
const adminRouter = require("./routes/adminRoutes");
const adminAuth = require("./middlewares/adminAuth");

dotenv.config();

const app = express();

/* -------------------- CORS -------------------- */
app.use(
  cors({
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* -------------------- Rate Limit -------------------- */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(apiLimiter);

/* -------------------- Middleware -------------------- */
app.use(express.json());

/* -------------------- MongoDB -------------------- */
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected!");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

connectDB();

/* -------------------- Health Check -------------------- */
app.get("/", (req, res) => {
  res.send("Hello from the backend!");
});
/* -------------------- Admin Routes -------------------- */
app.use("/admin", adminRouter);

/* -------------------- Protected Routes -------------------- */
app.use(adminAuth);
app.use("/products", productRouter);
app.use("/shipments", shipmentRouter);
app.use("/customers", customerRouter);
app.use("/payments", paymentRouter);
app.use("/orders", orderRouter);

/* -------------------- Server -------------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
