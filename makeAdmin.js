const mongoose = require("mongoose");
const User = require("./models/user"); // adjust path if needed

mongoose.connect("mongodb://127.0.0.1:27017/wanderlust");

async function makeAdmin() {
  const result = await User.updateOne(
    { email: "shivamji2310@gmail.com" },
    { $set: { role: "admin" } }
  );

  console.log("Admin update result:", result);
  mongoose.connection.close();
}


makeAdmin();
