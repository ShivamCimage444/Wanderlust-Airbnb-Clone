const express = require("express");
const router = express.Router();
const booking = require("../controllers/booking.js");
const { isLoggedIn, checkBlocked, blockAdmin, } = require("../middleware/middleware.js");

// ===== OWNER =====
router.get("/owner/dashboard", isLoggedIn, blockAdmin,checkBlocked, booking.ownerDashboard);


// ===== USER =====
router.get("/my", isLoggedIn, checkBlocked, blockAdmin, booking.myBookings);
router.get("/history", isLoggedIn,  checkBlocked, blockAdmin, booking.bookingHistory);



// Booking request
router.post("/listings/:listingId/request", isLoggedIn, checkBlocked, blockAdmin, booking.requestBooking);

// Details + payment
router.get("/:id/details", isLoggedIn, checkBlocked, blockAdmin, booking.showDetailsForm);
router.post("/:id/details", isLoggedIn, checkBlocked, blockAdmin, booking.submitDetails);

// Owner actions
router.post("/:id/approve", isLoggedIn, checkBlocked, blockAdmin, booking.approveBooking);
router.post("/:id/reject", isLoggedIn,  checkBlocked, blockAdmin, booking.rejectBooking);
//router.post("/:id/cancel", isLoggedIn, booking.cancelBooking);


module.exports = router;
