const express = require("express");
const router = express.Router();

const { isLoggedIn, isAdmin } = require("../middleware/middleware.js");
const adminController = require("../controllers/Admin.js");
const wrapAsync = require("../utils/wrapAsync.js");
const { validateCommission } = require("../middleware/middleware.js");

// 🔒 Protect all admin routes
router.use(isLoggedIn, isAdmin);

// ===== DASHBOARD =====
router.get("/dashboard", wrapAsync(adminController.adminDashboard));
router.get("/analytics", wrapAsync(adminController.getAdvancedAnalytics));

// ===== USER MANAGEMENT =====
router.get("/users", wrapAsync(adminController.manageUsers));
router.get("/users/:id/view", wrapAsync(adminController.viewUser));

router.put("/users/:id/block", wrapAsync(adminController.toggleBlockUser));
router.put("/users/:id/approve-owner", wrapAsync(adminController.approveOwner));
router.put("/users/:id/owner-block", wrapAsync(adminController.toggleOwnerBlock));

router.delete("/users/:id", wrapAsync(adminController.deleteUser));

// ===== BOOKING MANAGEMENT =====
router.get("/bookings", wrapAsync(adminController.manageBookings));
router.get("/bookings/:id", wrapAsync(adminController.viewBookingDetail));

// ===== LISTING MANAGEMENT =====
router.get("/listings", wrapAsync(adminController.manageListings));
router.delete("/listings/:id", wrapAsync(adminController.deleteListing));

// ===== PLATFORM SETTINGS =====


router.post("/commission",validateCommission, wrapAsync(adminController.updateCommission));
module.exports = router;