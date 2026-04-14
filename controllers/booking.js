const Booking = require("../models/booking.js");
const Listing = require("../models/listing.js");
const Settings = require("../models/settings");

async function autoRejectUnpaid() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await Booking.updateMany(
    {
      status: "approved",
      startDate: { $lte: today },
      $or: [
        { payment: { $exists: false } },
        { "payment.paid": { $ne: true } }
      ]
    },
    {
      status: "rejected",
      completedAt: new Date(),
      cancelReason: "Auto rejected due to non-payment"
    }
  );
}

module.exports = { autoRejectUnpaid };


/* =====================================================
   ================= USER SIDE ==========================
   ===================================================== */
   // SHOW booking request form (GET)
module.exports.showRequestForm = async (req, res) => {
  const { listingId } = req.params;

  const listing = await Listing.findById(listingId);
  if (!listing) {
    req.flash("error", "Listing not found");
    return res.redirect("/listings");
  }

  res.render("bookings/request", { listing });
};


// Request booking
module.exports.requestBooking = async (req, res) => {
  try {
    const { listingId } = req.params;
    let { startDate, endDate } = req.body;

startDate = new Date(startDate);
endDate = new Date(endDate);

// normalize
startDate.setHours(0, 0, 0, 0);
endDate.setHours(0, 0, 0, 0);

// today
const today = new Date();
today.setHours(0, 0, 0, 0);

// validations
if (startDate < today) {
  req.flash("error", "Start date cannot be in the past");
  return res.redirect(`/listings/${listingId}`);
}

if (endDate <= today) {
  req.flash("error", "End date must be in the future");
  return res.redirect(`/listings/${listingId}`);
}

if (startDate >= endDate) {
  req.flash("error", "Minimum 1 night stay required.");
  return res.redirect(`/listings/${listingId}`);
}

const listing = await Listing.findById(listingId);
  if (!listing) {
    req.flash("error", "Listing not found");
    return res.redirect("/listings");
}
//limit 3 request/day
const todayStart = new Date();
todayStart.setHours(0, 0, 0, 0);

const todayEnd = new Date();
todayEnd.setHours(23, 59, 59, 999);

const userDailyCount = await Booking.countDocuments({
  user: req.session.userId,
  createdAt: { $gte: todayStart, $lte: todayEnd },
  status: { $in: ["pending", "approved", "confirmed"] }
});
if (userDailyCount >= 3) {
  req.flash(
    "error",
    "You can only send 3 booking requests in one day."
  );
  return res.redirect(`/listings/${listingId}`);
}
// Prevent overlapping bookings
const overlap = await Booking.findOne({
 listing: listingId,
 status: { $in: ["approved", "confirmed"] },
 startDate: { $lt: endDate },
 endDate: { $gt: startDate }
});
if (overlap) {
  req.flash("error", "Selected dates already booked");
  return res.redirect(`/listings/${listingId}`);
}
// Prevent duplicate booking ONLY if SAME USER overlaps SAME DATES
const userOverlap = await Booking.findOne({
  listing: listingId,
  user: req.session.userId,
  status: { $in: ["pending", "approved", "confirmed"] },
  startDate: { $lt: endDate },
  endDate: { $gt: startDate }
});

if (userOverlap) {
  req.flash(
    "error",
    "You already have a booking request for these dates"
  );
  return res.redirect(`/listings/${listingId}`);
}
const booking = new Booking({
      listing: listingId,
      owner: listing.owner,
      user: req.session.userId,
      startDate,
      endDate,
      status: "pending"
    });

await booking.save();
req.flash("success", "Booking request sent");
res.redirect("/bookings/my");
} catch (err) {
    console.error(err);
    req.flash("error", "Booking failed");
    res.redirect("/listings");
  }
};

// My bookings
module.exports.myBookings = async (req, res) => {

  await autoRejectUnpaid();

  const bookings = await Booking.find({
    user: req.session.userId,
    status: { $in: ["pending", "approved"] }
  }).populate("listing");

  res.render("bookings/my.ejs", { bookings });
};

//booking history
module.exports.bookingHistory = async (req, res) => {
  try {
      
    await autoRejectUnpaid();

    const userId = req.session.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const { from, to, status } = req.query;

    // Convert filter dates
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    if (toDate) toDate.setHours(23, 59, 59, 999);

    let orFilters = [];

    // Define statuses to filter
    const allStatuses = ["confirmed", "cancelled_by_owner", "cancelled_by_user",];
    const statusesToUse = status && status !== "all" ? [status] : allStatuses;

    statusesToUse.forEach(s => {
      if (s === "confirmed" || s === "cancelled_by_owner" || s === "cancelled_by_user") {
        // Use startDate/endDate for overlapping bookings
        orFilters.push({
          status: s,
          ...(fromDate || toDate
            ? {
                startDate: { ...(fromDate ? { $lt: toDate } : {}) },
                endDate: { ...(toDate ? { $gt: fromDate } : {}) }
              }
            : {})
        });
      } else {
        // cancelled_by_owner, cancelled_by_user, rejected → use completedAt
        orFilters.push({
          status: s,
          ...(fromDate || toDate
            ? { completedAt: { ...(fromDate ? { $gte: fromDate } : {}), ...(toDate ? { $lte: toDate } : {}) } }
            : {})
        });
      }
    });

    const filter = { user: userId, $or: orFilters };

    const totalBookings = await Booking.countDocuments(filter);

    const history = await Booking.find(filter)
      .populate("listing")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.render("bookings/history", {
      history,
      currentPage: page,
      totalPages: Math.ceil(totalBookings / limit),
      from: from || "",
      to: to || "",
      selectedStatus: status || "all"
    });

  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to load booking history");
    res.redirect("/bookings/my");
  }
};

/* =====================================================
   ================= PAYMENT ============================
   ===================================================== */

// Show details form
module.exports.showDetailsForm = async (req, res) => {
  const booking = await Booking.findById(req.params.id)
  .populate("listing")
  .populate("user");

  if (!booking || booking.status !== "approved") {
    req.flash("error", "Booking not approved yet");
    return res.redirect("/bookings/my");
  }

  const nights = Math.ceil(
  (new Date(booking.endDate) - new Date(booking.startDate)) /
  (1000 * 60 * 60 * 24)
) || 1;

  const basePrice = nights * booking.listing.price;
  const gstAmount = Math.round(basePrice * 0.12);
  const totalPrice = basePrice + gstAmount;

  res.render("bookings/details.ejs", {
    booking,
    nights,
    basePrice,
    gstAmount,
    totalPrice,
    user: booking.user
  });
};

module.exports.submitDetails = async (req, res) => {
  try {
    const allowedMethods = ["upi", "card", "netbanking"];
    const method = (req.body.paymentMethod || "").trim().toLowerCase();

    //  Validate payment method
    if (!allowedMethods.includes(method)) {
      req.flash("error", "Invalid payment method");
      return res.redirect("/bookings/my");
    }

    //  Fetch booking
    const booking = await Booking.findOne({
  _id: req.params.id,
  status: "approved"
}).populate("listing");   

    if (!booking) {
      req.flash("error", "Booking not approved");
      return res.redirect("/bookings/my");
    }

    // Prevent double payment
    if (booking.payment?.paid) {
      req.flash("error", "Payment already completed");
      return res.redirect("/bookings/history");
    }

    const guest = req.body.guest || {};

    //  Guest details
    booking.guestDetails = {
      fullName: guest.fullName || "",
      email: guest.email || "",
      phone: guest.phone || "",
      adults: parseInt(guest.adults) || 1,
      children: parseInt(guest.children) || 0,
      roomType: guest.roomType || "No preference",
      floor: guest.floor || "No preference",
      view: guest.view || "No preference",
      specialRequests: guest.specialRequests || ""
    };

    //  Payment info (normalized)
    booking.payment = {
      method,              // always "upi" | "card" | "netbanking"
      paid: true,
      paidAt: new Date(),
      referenceId: `PAY-${Date.now()}`
    };

    booking.status = "confirmed";
    booking.completedAt = new Date();


    // =====================================================
    // ✅ COMMISSION LOGIC (ONLY ADDED PART)
    // =====================================================
    const settings = await Settings.findOne();
    const commissionRate = settings ? settings.commissionRate : 10;

    const nights =
      Math.ceil(
        (booking.endDate - booking.startDate) /
        (1000 * 60 * 60 * 24)
      ) || 1;

    const amount = nights * booking.listing.price;

    booking.commissionRate = commissionRate;
    booking.adminCommission = (amount * commissionRate) / 100;
    booking.totalAmount = amount;
    booking.ownerEarning = amount - booking.adminCommission;
    // =====================================================

    await booking.save();

    // Reject overlapping bookings
    await Booking.updateMany(
      {
        _id: { $ne: booking._id },
        listing: booking.listing,
        status: { $in: ["pending", "approved"] },
        startDate: { $lt: booking.endDate },
        endDate: { $gt: booking.startDate }
      },
      {
        status: "rejected",
        completedAt: new Date()
      }
    );

    req.flash("success", "Booking confirmed & payment successful");
    res.redirect("/bookings/history");

  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong");
    res.redirect("/bookings/my");
  }
};



/* =====================================================
   ================= OWNER SIDE =========================
   ===================================================== */
/* =====================================================
   ================= OWNER SIDE =========================
   ===================================================== */

// OWNER DASHBOARD (ALL DATA)
module.exports.ownerDashboard = async (req, res) => {
  try {
    await autoRejectUnpaid();

    const ownerId = req.session.userId;
    const settings = await Settings.findOne();
const currentCommissionRate = settings ? settings.commissionRate : 10;

    const selectedYear = parseInt(req.query.year) || new Date().getFullYear();
    const selectedMonth = req.query.month || "all";

    const ownerListings = await Listing.find({ owner: ownerId });
    const listingIds = ownerListings.map(l => l._id);

    const allBookings = await Booking.find({
      listing: { $in: listingIds }
    }).populate("listing user");

    const confirmedBookings = allBookings.filter(b => b.status === "confirmed");
    const pendingBookings = allBookings.filter(b => b.status === "pending");

    let totalEarning = 0;
    let totalExpense = 0;
    let dailyRevenue = 0;
    let weeklyRevenue = 0;
    let monthlyRevenue = 0;

    const earningsByListing = {};
    const monthlyData = Array(12).fill(0);

    const expensePerNight = 200;

    const now = new Date();
    const todayStr = now.toDateString();

    const weekStart = new Date();
    weekStart.setDate(now.getDate() - 7);

       let totalCommission = 0;
   confirmedBookings.forEach(b => {
  if (!b.listing) return;

  const start = new Date(b.startDate);
  const end = new Date(b.endDate);
  const bookingDate = new Date(b.createdAt);

  if (bookingDate.getFullYear() !== selectedYear) return;

  if (
    selectedMonth !== "all" &&
    bookingDate.getMonth() !== parseInt(selectedMonth)
  ) return;

  const nights = Math.max(
    1,
    Math.ceil((end - start) / (1000 * 60 * 60 * 24))
  );

  // ✅ USE STORED VALUES ONLY
  const totalAmount = b.totalAmount || 0;
  const commission = b.adminCommission || 0;
  const earning = b.ownerEarning || 0;

  // ✅ FIX: add only once
  totalCommission += commission;

  const expense = nights * expensePerNight;

  totalEarning += earning;
  totalExpense += expense;

  if (bookingDate.toDateString() === todayStr) {
    dailyRevenue += earning;
  }

  if (bookingDate >= weekStart && bookingDate <= now) {
    weeklyRevenue += earning;
  }

  if (
    bookingDate.getMonth() === now.getMonth() &&
    bookingDate.getFullYear() === now.getFullYear()
  ) {
    monthlyRevenue += earning;
  }

  const m = bookingDate.getMonth();
  monthlyData[m] += earning;

  const id = b.listing._id.toString();
  if (!earningsByListing[id]) {
    earningsByListing[id] = {
      title: b.listing.title,
      total: 0
    };
  }
  earningsByListing[id].total += earning;
});

    const totalProfit = totalEarning - (totalExpense + totalCommission);

    const topListings = Object.values(earningsByListing)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const chartLabels = [
      "Jan","Feb","Mar","Apr","May","Jun",
      "Jul","Aug","Sep","Oct","Nov","Dec"
    ];

    const chartData = monthlyData;

    const maxRevenue = Math.max(...monthlyData);

    let bestMonth = {
      name: "N/A",
      revenue: 0
    };

    if (maxRevenue > 0) {
      const index = monthlyData.indexOf(maxRevenue);
      bestMonth = {
        name: chartLabels[index],
        revenue: maxRevenue
      };
    }

    res.render("bookings/ownerDashboard", {
      ownerListings,
      pendingBookings,
      confirmedBookings,
      totalEarning,
      totalExpense,
      totalCommission,
      totalProfit,
      dailyRevenue,
      weeklyRevenue,
      monthlyRevenue,
      topListings,
      chartLabels,
      chartData,
      selectedMonth,
      selectedYear,
      bestMonth,
      currentCommissionRate
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Dashboard error");
  }
};


// PENDING BOOKINGS PAGE (OPTIONAL SEPARATE)
module.exports.ownerPendingBookings = async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  //  Auto-reject pending bookings starting today or before
  await Booking.updateMany(
    { status: "pending", startDate: { $lte: today } },
    { status: "rejected", completedAt: new Date() }
  );

  // Now fetch remaining pending bookings
  const bookings = await Booking.find({
    owner: req.session.userId,
    status: { $in: ["pending", "approved"] } // still keep approved if you want
  })
    .populate("listing")
    .populate("user")
    .sort({ createdAt: -1 });

  res.render("owner/pendingBookings", { bookings });
};


// CONFIRMED BOOKINGS PAGE (OPTIONAL SEPARATE)
module.exports.ownerConfirmedBookings = async (req, res) => {
  const ownerId = req.session.userId; // keep consistent
  const { listingId, month } = req.query;

  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  let filter = {
    owner: ownerId,
    status: "confirmed"
  };

  // Filter by listing
  if (listingId) {
    filter.listing = listingId;
  }

  // Filter by month (YYYY-MM)
  if (month) {
    const start = new Date(`${month}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    filter.startDate = { $gte: start, $lt: end };
  }

  const totalBookings = await Booking.countDocuments(filter);

  const confirmedBookings = await Booking.find(filter)
    .populate("listing user")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const listings = await Listing.find({ owner: ownerId });

  res.render("owner/confirmedBookings", {
    confirmedBookings,
    listings,
    selectedListing: listingId || "",
    selectedMonth: month || "",
    currentPage: page,
    totalPages: Math.ceil(totalBookings / limit)
  });
};





// APPROVE
module.exports.approveBooking = async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    req.flash("error", "Booking not found");
    return res.redirect("/bookings/owner/dashboard");
  }

  //  Owner check
  if (booking.owner.toString() !== req.session.userId) {
    req.flash("error", "Unauthorized action");
    return res.redirect("/bookings/owner/dashboard");
  }

  //  Status validation
  if (booking.status !== "pending") {
    req.flash("error", "Only pending bookings can be approved");
    return res.redirect("/bookings/owner/dashboard");
  }

  booking.status = "approved";
  await booking.save();

  req.flash("success", " Your Booking approved");
  res.redirect("/bookings/owner/dashboard");
};


// REJECT
module.exports.rejectBooking = async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    req.flash("error", "Booking not found");
    return res.redirect("/bookings/owner/dashboard");
  }

  // Owner check
  if (booking.owner.toString() !== req.session.userId) {
    req.flash("error", "Unauthorized action");
    return res.redirect("/bookings/owner/dashboard");
  }

  // Status validation
  if (booking.status !== "pending") {
    req.flash("error", "Only pending bookings can be rejected");
    return res.redirect("/bookings/owner/dashboard");
  }

  booking.status = "rejected";
  booking.completedAt = new Date();
  await booking.save();

  req.flash("success", "Your Booking rejected");
  res.redirect("/bookings/owner/dashboard");
};



module.exports.viewUserBookingDetail = async (req, res) => {
  const booking = await Booking.findById(req.params.id)
  .populate({
    path: "listing",
    populate: {
      path: "owner",
      select: "username email"
    }
  })
  .populate("user");

  if (!booking) {
    req.flash("error", "Booking not found");
    return res.redirect("/bookings/history");
  }

  //  Calculate nights
  const nights =
    Math.ceil(
      (booking.endDate - booking.startDate) / (1000 * 60 * 60 * 24)
    ) || 1;

  //  Price calculation
  const basePrice = booking.listing.price * nights;
  const gstAmount = Math.round(basePrice * 0.12);
  const totalPrice = basePrice + gstAmount;

  res.render("bookings/viewDetail", {
    booking,
    nights,
    basePrice,
    gstAmount,
    totalPrice
  });
};


// cancel action by owner
module.exports.cancelBooking = async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking || booking.owner.toString() !== req.session.userId) {
    req.flash("error", "Unauthorized access");
    return res.redirect("/bookings/owner/dashboard");
  }

  const { cancelReason } = req.body;

  if (!cancelReason || cancelReason.trim().length < 5) {
    req.flash("error", "Please provide a valid cancellation reason");
    return res.redirect("back");
  }

  //  Prevent double cancel by owner
  if (booking.status === "cancelled_by_owner") {
    req.flash("info", "Booking already cancelled by owner");
    return res.redirect("/bookings/owner/dashboard");
  }

  //  Prevent cancel after start date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (booking.startDate <= today) {
    req.flash("error", "Cannot cancel booking after start date");
    return res.redirect("/bookings/owner/dashboard");
  }

  const previousStatus = booking.status;

  booking.status = "cancelled_by_owner";
  booking.cancelReason = cancelReason;
  booking.cancelledBy = "owner";
  booking.completedAt = new Date();

  await booking.save();

  req.flash("success", "Booking cancelled successfully");

  // Redirect smartly
  if (["confirmed", "approved", "cancelled_by_user"].includes(previousStatus)) {
    return res.redirect("/bookings/owner/confirmed");
  }

  res.redirect("/bookings/owner/pending");
};

// cancel action by user
module.exports.userCancelBooking = async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking || booking.user.toString() !== req.session.userId) {
    req.flash("error", "Unauthorized access");
    return res.redirect("/bookings/history");
  }

  if (booking.status !== "confirmed") {
    req.flash("error", "Only confirmed bookings can be cancelled");
    return res.redirect("/bookings/history");
  }

  const { cancelReason } = req.body;

  if (!cancelReason || cancelReason.trim().length < 5) {
    req.flash("error", "Please provide a valid cancellation reason");
    return res.redirect("back");
  }

  //  Disable cancel after start date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (booking.startDate <= today) {
    req.flash("error", "Cannot cancel booking after start date");
    return res.redirect("/bookings/owner/dashboard");
  }

  booking.status = "cancelled_by_user";
  booking.cancelReason = cancelReason;
  booking.cancelledBy = "user";
  booking.completedAt = new Date();

  await booking.save();

  req.flash("success", "Booking cancelled successfully");
  res.redirect("/bookings/history");
};

// OWNER → CANCELLED BOOKINGS (WITH PAGINATION)
module.exports.ownerCancelledBookings = async (req, res) => {
  const ownerId = req.session.userId;

  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const filter = {
    owner: ownerId,
    status: { $in: ["cancelled_by_owner", "cancelled_by_user"] }
  };

  const totalBookings = await Booking.countDocuments(filter);

  const bookings = await Booking.find(filter)
    .populate("listing")
    .populate("user")
    .sort({ completedAt: -1 })
    .skip(skip)
    .limit(limit);

  res.render("owner/cancelledBookings", {
    bookings,
    currentPage: page,
    totalPages: Math.ceil(totalBookings / limit)
  });
};



// ================================
// OWNER → VIEW OWN LISTINGS
// ================================
module.exports.myListings = async (req, res) => {
  try {
    const ownerId = req.session.userId;

    const listings = await Listing.find({ owner: ownerId });

    res.render("owner/myListings", { listings });

  } catch (err) {
    console.error("My Listings Error:", err);
    res.status(500).send("Error loading listings");
  }
};



