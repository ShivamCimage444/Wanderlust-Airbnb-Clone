/*const express = require("express")
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const { required } = require("joi");
const { user } = require("../routes/user.js")
const { isLoggedIn, isOwner, validateReview, } = require("../middleware.js");
const controllersListing = require("../controllers/listing.js")



//new route
router.get("/new", isLoggedIn, controllersListing.RenderNewForm);

// CREATE NEW LISTING
  router.post("/", isLoggedIn, validateReview, wrapAsync(controllersListing.createListing));

// Index Route
router.get("/",  wrapAsync(controllersListing.index));

//Show Route
router.get("/:id", wrapAsync(controllersListing.showListing));

// Edit Route
router.get("/:id/edit", isLoggedIn,isOwner, wrapAsync(controllersListing.EditListing));

//Update Route
router.put("/:id", isLoggedIn, isOwner, validateReview,  wrapAsync(controllersListing.UpdateListing));

//Delete Route
router.delete("/:id", isLoggedIn, isOwner, wrapAsync(controllersListing.DeleteListing));*/
const express = require("express");
const router = express.Router({ mergeParams: true });// this mergeParams is used for "id" transfer from app.js(parent route) to reviews.js(child route).
const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/ExpressError.js");
const Review= require("../models/review.js");
const Listing = require("../models/listing.js");
const mongoose = require("mongoose");
const { validateReview, isLoggedIn, isAuthor, checkBlocked, blockAdmin,} = require("../middleware/middleware.js");
const reviewControllers = require("../controllers/review.js");




//Review
//Post Review Route
router.post("/",validateReview, isLoggedIn, checkBlocked, blockAdmin, wrapAsync(reviewControllers.createReview));

//Delete Review Route
router.delete("/:reviewId", isLoggedIn, isAuthor, checkBlocked,  wrapAsync(reviewControllers.deleteReview));


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



