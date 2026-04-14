const express = require("express")
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const { required } = require("joi");
const { user } = require("../routes/user.js")
const { isLoggedIn, isOwnerOrAdmin,validateListing, checkBlocked, blockAdmin, canCreateListing, blockOwner} = require("../middleware/middleware.js");
const controllersListing = require("../controllers/listing.js")
const upload = require("../middleware/upload.js");

//common middleware
router.use(checkBlocked);

//new route
router.get("/new", isLoggedIn,blockAdmin, blockOwner,  canCreateListing, controllersListing.RenderNewForm);

// CREATE NEW LISTING
  router.post("/", isLoggedIn,blockAdmin,canCreateListing, blockOwner, upload.single("image"),validateListing,wrapAsync(controllersListing.createListing));

// Edit Route
router.get("/:id/edit", isLoggedIn, blockOwner, isOwnerOrAdmin, wrapAsync(controllersListing.EditListing));

//Update Route
router.put("/:id", isLoggedIn,blockOwner, upload.single("image"),validateListing,isOwnerOrAdmin, wrapAsync(controllersListing.UpdateListing));

//Delete Route
router.delete("/:id", isLoggedIn,blockOwner, isOwnerOrAdmin, wrapAsync(controllersListing.DeleteListing));

// Index Route
router.get("/", wrapAsync(controllersListing.index));

//Show Route
router.get("/:id",  wrapAsync(controllersListing.showListing));

module.exports = router;




/*
//Create Route
router.post("/", isLoggedIn, validateListing, wrapAsync(async(req, res , next) =>{
 // let {title, description,image,price,} = res.body // ->this is the one option but simple option in new.ejs 
 let listings = req.body.Listing;
 const newListings = new Listing(listings);
 // for easier way of Implement here the if condition we use "joi" which validate our schema for server side.
// console.log(newListings);
 await newListings.save();
 req.flash("success", "New Listing Created!")
 res.redirect("/listings")
} )
);*/




/*
const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/ExpressError.js");
const { listingSchema } = require("../schema.js");
const Listing = require("../models/listing.js");

// ====================
// Middleware
// ====================

// Validate listing with Joi schema
const validateListing = (req, res, next) => {
  const { error } = listingSchema.validate(req.body);
  if (error) {
    const errMsg = error.details.map(el => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

// Check if user is logged in
const isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.flash("error", "You must be signed in first!");
    return res.redirect("/login");
  }
  next();
};

// ====================
// Routes
// ====================

// Index Route - Show all listings
router.get("/", wrapAsync(async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index.ejs", { allListings });
}));

// New Route - Form to create new listing
router.get("/new", isLoggedIn, (req, res) => {
  res.render("listings/new.ejs");
});

// Create Route - Add new listing to DB
router.post("/", isLoggedIn, validateListing, wrapAsync(async (req, res) => {
  const newListing = new Listing(req.body.Listing);
  await newListing.save();
  req.flash("success", "New Listing Created!");
  res.redirect("/listings");
}));

// Show Route - Show single listing
router.get("/:id", wrapAsync(async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id).populate("reviews");
  if (!listing) {
    req.flash("error", "Listing you requested does not exist!");
    return res.redirect("/listings");
  }
  res.render("listings/show.ejs", { listing });
}));

// Edit Route - Form to edit listing
router.get("/:id/edit", isLoggedIn, wrapAsync(async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing you requested does not exist!");
    return res.redirect("/listings");
  }
  res.render("listings/Edit.ejs", { listing });
}));

// Update Route - Update listing in DB
router.put("/:id", isLoggedIn, validateListing, wrapAsync(async (req, res) => {
  const { id } = req.params;
  const updateData = {
    ...req.body.Listing,
    image: {
      ...req.body.Listing.image
    }
  };
  await Listing.findByIdAndUpdate(id, updateData);
  req.flash("success", "Listing Updated!");
  res.redirect(`/listings/${id}`);
}));

// Delete Route - Delete listing from DB
router.delete("/:id", isLoggedIn, wrapAsync(async (req, res) => {
  const { id } = req.params;
  await Listing.findByIdAndDelete(id);
  req.flash("success", "Listing Deleted!");
  res.redirect("/listings");
}));

module.exports = router;*/



