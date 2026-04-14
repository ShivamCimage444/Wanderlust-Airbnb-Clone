const User = require("../models/user");
const Booking = require("../models/booking");
const Listing = require("../models/listing");
const Review = require("../models/review");


/* ================================
   ADMIN DASHBOARD
================================ */

const Settings = require("../models/settings");

module.exports.adminDashboard = async (req, res) => {
  try {
    const selectedYear = parseInt(req.query.year) || new Date().getFullYear();
    const selectedMonth = req.query.month || "all";

    // GET COMMISSION FROM DB
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({ commissionRate: 10 });
    }

    const COMMISSION_RATE = settings.commissionRate / 100;

    const allBookings = await Booking.find({ status: "confirmed" })
      .populate("listing user");

    const allUsers = await User.find();

    let totalRevenue = 0;
    let adminRevenue = 0;
    let ownerRevenue = 0;

    let monthlyRevenue = Array(12).fill(0);
    let bookingGrowth = Array(12).fill(0);
    let userGrowth = Array(12).fill(0);

    // ===== USER GROWTH =====
    allUsers.forEach(u => {
      const date = new Date(u.createdAt);
      if (date.getFullYear() === selectedYear) {
        userGrowth[date.getMonth()]++;
      }
    });

    // ===== BOOKINGS =====
    allBookings.forEach(b => {
      if (!b.listing) return;

      const bookingDate = new Date(b.createdAt);

      if (bookingDate.getFullYear() !== selectedYear) return;

      if (
        selectedMonth !== "all" &&
        bookingDate.getMonth() !== parseInt(selectedMonth)
      ) return;
//  USE STORED VALUES (FIX)
const amount = b.totalAmount || 0;
const commission = b.adminCommission || 0;
const ownerAmount = b.ownerEarning || 0;

totalRevenue += amount;
adminRevenue += commission;
ownerRevenue += ownerAmount;
      const m = bookingDate.getMonth();
      monthlyRevenue[m] += amount;
      bookingGrowth[m]++;
    });

    const chartLabels = [
      "Jan","Feb","Mar","Apr","May","Jun",
      "Jul","Aug","Sep","Oct","Nov","Dec"
    ];

    res.render("admin/dashboard", {
      selectedYear,
      selectedMonth,

      totalRevenue,
      adminRevenue,
      ownerRevenue,

      chartLabels,
      monthlyRevenue,
      bookingGrowth,
      userGrowth,

      commissionRate: settings.commissionRate // send % value
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Admin dashboard error");
  }
};

module.exports.getAdvancedAnalytics = async (req, res) => {
  try {
    const bookings = await Booking.find({ status: "confirmed" })
      .populate("listing");

    let totalRevenue = 0;
    let totalBookings = bookings.length;

    let locationStats = {};
    let listingStats = {};
    let dailyData = {};

    bookings.forEach(b => {
      if (!b.listing) return;

      const nights =
        (new Date(b.endDate) - new Date(b.startDate)) /
        (1000 * 60 * 60 * 24);

      const amount = Math.max(1, nights) * b.listing.price;
      totalRevenue += amount;

      // 📍 LOCATION
      const loc = b.listing.location;
      locationStats[loc] = (locationStats[loc] || 0) + amount;

      // 🏠 LISTING
      const title = b.listing.title;
      listingStats[title] = (listingStats[title] || 0) + amount;

      // 📅 DAILY
      const date = new Date(b.startDate).toDateString();
      dailyData[date] = (dailyData[date] || 0) + amount;
    });

    // TOP LISTINGS
    const topListings = Object.entries(listingStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // TOP LOCATIONS
    const topLocations = Object.entries(locationStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // BEST DAY
    const bestDay = Object.entries(dailyData).sort((a,b)=>b[1]-a[1])[0];

    // WORST DAY
    const worstDay = Object.entries(dailyData).sort((a,b)=>a[1]-b[1])[0];

    const avgBookingValue = totalBookings > 0
      ? totalRevenue / totalBookings
      : 0;

    res.json({
      totalRevenue,
      totalBookings,
      avgBookingValue,
      topListings,
      topLocations,
      bestDay,
      worstDay
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Analytics error" });
  }
};

// Manage bookings with pagination
module.exports.manageBookings = async (req, res) => {
  try {
    const { status, owner, page } = req.query;

    const limit = 10; // bookings per page
    const currentPage = parseInt(page) || 1;

    let filter = {};
    if (status) filter.status = status;

    if (owner) {
      const ownedListings = await Listing.find({ owner }).select("_id");
      const listingIds = ownedListings.map(l => l._id);
      filter.listing = { $in: listingIds };
    }

    const totalBookings = await Booking.countDocuments(filter);

    const bookings = await Booking.find(filter)
      .populate("user")
      .populate({
        path: "listing",
        populate: { path: "owner" }
      })
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * limit)
      .limit(limit);

    // Get all owners from current bookings
    const ownersMap = {};
    bookings.forEach(b => {
      if (b.listing && b.listing.owner) {
        ownersMap[b.listing.owner._id] = b.listing.owner;
      }
    });
    const owners = Object.values(ownersMap);

    const totalPages = Math.ceil(totalBookings / limit);

    res.render("admin/bookings", {
      bookings,
      owners,
      selectedStatus: status || "",
      selectedOwner: owner || "",
      currentPage,
      totalPages
    });
  } catch (err) {
    console.error("Error managing bookings:", err);
    res.status(500).send("Server Error");
  }
};


//view-Booking
module.exports.viewBookingDetail = async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate("user")
    .populate({
      path: "listing",
      populate: { path: "owner" }
    });

  if (!booking) {
    req.flash("error", "Booking not found");
    return res.redirect("/admin/bookings");
  }

  res.render("admin/bookingDetail", { booking });
};


// List all users
/*module.exports.allUsers = async (req, res) => {
  const users = await User.find({ role: { $ne: "admin" } });

  const ownerIds = await Listing.distinct("owner");

  const owners = users.filter(u => ownerIds.includes(u._id.toString()));
  const normalUsers = users.filter(u => !ownerIds.includes(u._id.toString()));

  res.render("admin/users", {
    owners,
    normalUsers
  });
};*/


// =====================
// VIEW ALL USERS (SEPARATE USERS & OWNERS)
// =====================
// ONLY THIS

module.exports.manageUsers = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  // Count non-admin users
  const totalUsers = await User.countDocuments({ role: { $ne: "admin" } });

  // Paginated users
  const users = await User.find({ role: { $ne: "admin" } })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  // ROLE-BASED separation (correct)
  const owners = users.filter(user => user.role === "owner");
  const normalUsers = users.filter(user => user.role === "user");

  res.render("admin/users", {
    owners,
    normalUsers,
    currentPage: page,
    totalPages: Math.ceil(totalUsers / limit)
  });
};





// =====================
// DELETE USER OR OWNER
// =====================
module.exports.deleteUser = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    req.flash("error", "User not found");
    return res.redirect("/admin/users");
  }

  if (user.role === "admin") {
    req.flash("error", "Admin cannot be deleted");
    return res.redirect("/admin/users");
  }
  const listings = await Listing.find({ owner: user._id });
  
  // If user is owner, delete their listings too
  if (await Listing.exists({ owner: user._id })) {
    for (let listing of listings) {
  await Booking.deleteMany({ listing: listing._id });
  await Review.deleteMany({ listing: listing._id });
}
    await Listing.deleteMany({ owner: user._id });
  }

  await user.deleteOne();
  req.flash("success", "User deleted");
  res.redirect("/admin/users");
};

// =====================
// BLOCK / UNBLOCK USER
// =====================
module.exports.toggleBlockUser = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    req.flash("error", "User not found");
    return res.redirect("/admin/users");
  }

  if (user.role === "admin") {
    req.flash("error", "Admin cannot be blocked");
    return res.redirect("/admin/users");
  }

  user.isBlocked = !user.isBlocked;
  await user.save();

  req.flash(
    "success",
    `User ${user.isBlocked ? "blocked" : "unblocked"} successfully`
  );

  res.redirect("/admin/users");
};


// =====================
// Owner BLOCK / UNBLOCK USER
// =====================
module.exports.approveOwner = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user || user.role !== "user") {
    req.flash("error", "Invalid user");
    return res.redirect("/admin/users");
  }

  user.canCreateListing = true;
  await user.save();

  req.flash("success", "User approved to create first listing");
  res.redirect("/admin/users");
};


module.exports.toggleOwnerBlock = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    req.flash("error", "User not found");
    return res.redirect("/admin/users");
  }

  if (user.role !== "owner") {
    req.flash("error", "Only owners can be owner-blocked");
    return res.redirect("/admin/users");
  }

  user.isOwnerBlocked = !user.isOwnerBlocked;
  await user.save();

  req.flash(
    "success",
    user.isOwnerBlocked
      ? "Owner privileges blocked"
      : "Owner privileges restored"
  );

  res.redirect("/admin/users");
};



// users Details

module.exports.viewUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    req.flash("error", "User not found");
    return res.redirect("/admin/users");
  }

  let listings = []; // listings created by the user (if owner)
  let receivedBookings = []; // bookings on user's listings
  let userBookings = []; // bookings made by this user (owner or normal user)

  // If OWNER → fetch listings & bookings on those listings
  if (user.role === "owner") {
    listings = await Listing.find({ owner: user._id });

    // bookings received on owner's listings
    receivedBookings = await Booking.find({ owner: user._id })
      .populate("listing")
      .populate("user");
  }

  // 👤 ANY USER (including OWNER) → bookings made
  userBookings = await Booking.find({ user: user._id })
    .populate("listing")
    .populate("owner");

  res.render("admin/userView", {
    user,
    listings,
    receivedBookings,
    userBookings
  });
};

// =====================
// ADMIN LISTING MANAGEMENT
// =====================
module.exports.manageListings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 9; // 9 cards per page
    const skip = (page - 1) * limit;

    const totalListings = await Listing.countDocuments();

    const listings = await Listing.find()
      .populate("owner")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.render("admin/listings", {
      listings,
      currentPage: page,
      totalPages: Math.ceil(totalListings / limit)
    });

  } catch (err) {
    console.error("Error loading listings:", err);
    res.status(500).send("Server Error");
  }
};



module.exports.deleteListing = async (req, res) => {
  try {
    const { id } = req.params;

    const listing = await Listing.findById(id);
    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect("/admin/listings");
    }

    // delete related data
    await Booking.deleteMany({ listing: id });
    await Review.deleteMany({ _id: { $in: listing.reviews } });

    await Listing.findByIdAndDelete(id);

    req.flash("success", "Listing deleted successfully");
    res.redirect("/admin/listings");
  } catch (err) {
    console.error("Delete listing error:", err);
    res.redirect("/admin/listings");
  }
};





module.exports.updateCommission = async (req, res) => {
  try {
    const { rate } = req.body;

    // convert to number (important)
    const parsedRate = parseFloat(rate);

    if (isNaN(parsedRate) || parsedRate < 0 || parsedRate > 100) {
      req.flash("error", "Invalid commission rate");
      return res.redirect("/admin/dashboard");
    }

    let settings = await Settings.findOne();

    if (!settings) {
      await Settings.create({ commissionRate: parsedRate });
    } else {
      settings.commissionRate = parsedRate;
      await settings.save();
    }

    req.flash("success", "Commission updated successfully!");
    
    res.redirect("/admin/dashboard");

  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong");
    res.redirect("/admin/dashboard");
  }
};