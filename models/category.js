const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },      // "Trending stays"
  key: { type: String, required: true, unique: true } // "trending"
});

module.exports = mongoose.model("Category", categorySchema);