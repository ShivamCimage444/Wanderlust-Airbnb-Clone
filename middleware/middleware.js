const Listing = require("../models/listing.js");
const User = require("../models/user.js");
const ExpressError = require("../utils/ExpressError.js");
const {listingSchema, reviewSchema} = require("../schema.js");
//const review= require("./routes/review.js");
const Review = require("../models/review.js");
const rateLimit = require("express-rate-limit");



module.exports.isLoggedIn = (req, res, next) => {
    if (!req.session.userId) {
        // Only save the URL if it's a GET request
        if (req.method === "GET") {
            req.session.returnTo = req.originalUrl;
        }
        req.flash("error", "You must be logged in first!");
        return res.redirect("/login");
    }
    next();
};


/*module.exports.isLoggedIn = (req, res, next) => {
    //console.log(req.path, "..", req.originalUrl)
    if (!req.session.userId) {
        req.session.returnTo = req.originalUrl; // SAVE URL
        req.flash("error", "You must be logged in first!");
        return res.redirect("/login");
    }
    next();
};*/



module.exports.validateListing = (req, res, next) =>{
  let {error} = listingSchema.validate(req.body);
if(error){
  let errMsg =error.details.map((el) => el.message).join(",");
  throw new ExpressError(400,errMsg);
}else{
  next();
}

};

module.exports.validateReview = (req, res, next) =>{
  let {error} = reviewSchema.validate(req.body);
if(error){
  let errMsg =error.details.map((el) => el.message).join(",");
  throw new ExpressError(400,error);
}else{
  next();
}
};

module.exports.isOwner = (req, res, next) => {
  if (res.locals.currentUser?.role !== "owner") {
    req.flash("error", "Owner access only");
    return res.redirect("/listings");
  }
  next();
};


module.exports.SelfBooking = async (req, res, next) => {
  const listing = await Listing.findById(req.params.listingId);
  if (!listing) {
    req.flash("error", "Listing not found");
    return res.redirect("/listings");
  }
  if (listing.owner.equals(req.session.userId)) {
    req.flash("error", "You cannot book your own listing");
    return res.redirect(`/listings/${listing._id}`);
  }
  next();
};


module.exports.isOwnerOrAdmin = async (req, res, next) => {
  const { id } = req.params;
  const listing = await Listing.findById(id).populate("owner");

  if (!listing) {
    req.flash("error", "Listing not found");
    return res.redirect("/listings");
  }

  // Admin can do anything
  if (req.session.userId && res.locals.currentUser.role === "admin") {
    return next();
  }

  // Owner check
  if (!listing.owner.equals(req.session.userId)) {
    req.flash("error", "You don't have permission");
    return res.redirect(`/listings/${id}`);
  }

  next();
};

module.exports.isAuthor = async (req, res, next) => {
    const { id, reviewId } = req.params;
    const foundReview = await Review.findById(reviewId);
     const user = await User.findById(req.session.userId);

    if (!foundReview) {
        req.flash("error", "Review not found!");
        return res.redirect(`/listings/${id}`);
    }

    if (!foundReview.author.equals(req.session.userId) && (user.role === "admin")) {
        req.flash("error", "You are not the author of this review!");
        return res.redirect(`/listings/${id}`);
    }

    next();

};
//Admin
module.exports.isAdmin = async (req, res, next) => {
  if (!req.session.userId) {
    req.flash("error", "Please login first");
    return res.redirect("/login");
  }

  const user = await User.findById(req.session.userId);

  if (!user || user.role !== "admin") {
    req.flash("error", "Admin access only");
    return res.redirect("/listings");
  }

  next();
};


module.exports.blockAdmin = (req, res, next) => {
  if (res.locals.currentUser?.role === "admin") {
    req.flash("error", "Admins cannot access this section");
    return res.redirect("/admin/dashboard");
  }
  next();
};


module.exports.checkBlocked = async (req, res, next) => {
  if (!req.session.userId) return next();

  const user = await User.findById(req.session.userId);

  if (!user) {
    req.session.destroy();
    return res.redirect("/login");
  }
 if (user.role === "admin") return next();


  if (user.isBlocked) {
    req.flash("error", "Your account is blocked. You cannot perform this action.");
return res.redirect("/listings");
  }

  next();
};


module.exports.canCreateListing = (req, res, next) => {
  const user = res.locals.currentUser;
  if (!user) return res.redirect("/login");

  if (user.role === "admin") return next();

  if (!user.canCreateListing) {
    req.flash("error", "Admin approval required to create listing. [Admin@gmail.com]");
    return res.redirect("/listings");
  }

  next();
};


module.exports.blockOwner = (req, res, next) => {
  if (!res.locals.currentUser) return next();

  const user = res.locals.currentUser;

  if (user.role === "owner" && user.isOwnerBlocked) {
    req.flash("error", "Your owner privileges are blocked.");
    return res.redirect("/listings");
  }

  next();
};


module.exports.validateCommission = (req, res, next) => {
  let { rate } = req.body;

  // Convert to number
  rate = Number(rate);

  // ❌ Invalid cases
  if (isNaN(rate)) {
    req.flash("error", "Commission must be a number");
    return res.redirect("/admin/dashboard");
  }

  if (rate < 0 || rate > 100) {
    req.flash("error", "Commission must be between 0% and 100%");
    return res.redirect("/admin/dashboard");
  }

  // ✅ Attach clean value
  req.body.rate = rate;

  next();
};





