const express = require("express");
const router = express.Router();
const bookingsController = require("../controllers/booking.js");
const { blockAdmin, isLoggedIn, checkBlocked,isOwner, SelfBooking} = require("../middleware/middleware.js");


// ===== USER =====
// Request booking form
// 1️⃣ Show booking request form (GET)
/*router.get("/listings/:listingId/request", isLoggedIn, async (req, res) => {
  const Listing = require("../models/listing.js");
  const listing = await Listing.findById(req.params.listingId);
  if (!listing) {
    req.flash("error", "Listing not found!");
    return res.redirect("/listings");
  }
  res.render("bookings/request", { listing });
});*/
router.get("/listings/:listingId/request", isLoggedIn, blockAdmin, checkBlocked, SelfBooking, bookingsController.showRequestForm);

router.post("/listings/:listingId/request", isLoggedIn, blockAdmin, checkBlocked, SelfBooking, bookingsController.requestBooking);

// My active bookings
router.get("/my", isLoggedIn, blockAdmin, checkBlocked, bookingsController.myBookings);

// Booking history
router.get("/history", isLoggedIn, checkBlocked,blockAdmin, bookingsController.bookingHistory);
router.get("/history/:id", bookingsController.viewUserBookingDetail);


// Booking details + payment form
router.get("/:id/details", isLoggedIn, checkBlocked, bookingsController.showDetailsForm);
router.post("/:id/details", isLoggedIn,  checkBlocked, blockAdmin,bookingsController.submitDetails);

// ===== OWNER =====
// Owner dashboard
router.get("/owner/dashboard", isLoggedIn, isOwner, checkBlocked,blockAdmin, bookingsController.ownerDashboard);

router.get("/owner/pending", isLoggedIn,  checkBlocked, blockAdmin,bookingsController.ownerPendingBookings);

router.get("/owner/confirmed",isLoggedIn, checkBlocked, blockAdmin, bookingsController.ownerConfirmedBookings);
router.get("/owner/cancelled", isLoggedIn, checkBlocked, blockAdmin, bookingsController.ownerCancelledBookings);
router.get("/owner/mylistings", bookingsController.myListings);

// Approve/Reject/Cancel bookings
router.post("/:id/approve", isLoggedIn, checkBlocked,blockAdmin,bookingsController.approveBooking);
router.post("/:id/reject", isLoggedIn, checkBlocked, blockAdmin, bookingsController.rejectBooking);
//router.post("/:id/cancel", isLoggedIn, bookingsController.cancelBooking);

//  View booking details (guest data)

router.get( "/owner/:id/details",isLoggedIn, checkBlocked,bookingsController.viewUserBookingDetail);
  

//  Cancel booking (by owner)
router.post("/owner/:id/cancel",isLoggedIn, checkBlocked, blockAdmin, bookingsController.cancelBooking);

//  Cancel booking (by user)
router.post(
  "/user/:id/cancel",isLoggedIn,  checkBlocked, blockAdmin, bookingsController.userCancelBooking);

  // KEEP THIS LAST
router.get("/:id", isLoggedIn, checkBlocked, bookingsController.viewUserBookingDetail);




module.exports = router;
