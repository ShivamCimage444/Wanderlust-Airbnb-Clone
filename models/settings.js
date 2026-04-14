const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema({
  commissionRate: {
    type: Number,
    default: 10 // %
  }
});

module.exports = mongoose.model("Settings", settingsSchema);