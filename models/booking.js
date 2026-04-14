const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Listing",
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },

  // ✅ ADD THIS BLOCK (VERY IMPORTANT)
  commissionRate: Number,   // % at booking time
  totalAmount: Number,      // total booking price
  adminCommission: Number,  // admin earning
  ownerEarning: Number,     // owner earning

  status: {
    type: String,
    enum: [
      "pending",
      "approved",
      "confirmed",
      "rejected",
      "cancelled_by_owner",
      "cancelled_by_user",
    ],
    default: "pending"
  },

  guestDetails: {
    fullName: { type: String },
    email: { type: String },
    phone: { type: String },
    adults: { type: Number },
    children: { type: Number },
    roomType: { type: String },
    floor: { type: String },
    view: { type: String },
    specialRequests: { type: String }
  },

  payment: {
    method: String,
    paid: { type: Boolean, default: false }
  },

  cancelReason: { type: String, trim: true },
  cancelledBy: { type: String, enum: ["owner", "user"] },
  completedAt: { type: Date }

}, {
  timestamps: true
});

module.exports = mongoose.model("Booking", bookingSchema);