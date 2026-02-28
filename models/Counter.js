const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  _id: {
    type: String, // city code (KOL, DEL)
    required: true,
  },
  sequence_value: {
    type: Number,
    default: 99999, // so first becomes 100000
  },
});

module.exports = mongoose.model("Counter", counterSchema);
