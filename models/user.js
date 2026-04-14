const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  salt: { type: String, required: true },
  hash: { type: String, required: true },

  role: {
    type: String,
    enum: ["user", "owner", "admin"],
    default: "user"
  },
  

  // ACCOUNT STATUS
  isBlocked: { type: Boolean, default: false },

  // OWNER PERMISSION (ADMIN CONTROLLED)
  canCreateListing: { type: Boolean, default: false },

  // Owner block
  isOwnerBlocked: { type: Boolean, default: false },

  // 🔐 SUPER ADMIN FLAG
  isSuperAdmin: { type: Boolean, default: false },

  // ===========================
  // 📧 EMAIL VERIFICATION (NEW)
  // ===========================
  isVerified: { type: Boolean, default: false },
  verifyToken: String

}, { timestamps: true });

/* ===========================
   🔒 SUPER ADMIN PROTECTION
=========================== */

userSchema.pre("deleteOne", { document: true }, function (next) {
  if (this.isSuperAdmin) {
    return next(new Error("Super Admin cannot be deleted"));
  }
  next();
});

userSchema.pre("save", function (next) {
  if (this.isSuperAdmin) {
    this.role = "admin";
    this.isBlocked = false;
  }
  next();
});

module.exports = mongoose.model("User", userSchema);