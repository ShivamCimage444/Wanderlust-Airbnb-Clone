const Listing = require("../models/listing");
const Booking = require("../models/booking");
const Category = require("../models/category");
const fs = require("fs");
const path = require("path");


module.exports.index = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 32;
  const skip = (page - 1) * limit;

  const categoryKey = req.query.category;
  const searchQuery = req.query.search; // ✅ ADD THIS

  let filter = {};

  // ✅ CATEGORY FILTER (FIXED)
  if (categoryKey) {
    const category = await Category.findOne({ key: categoryKey });
    if (category) {
      filter.category = category._id; // ✅ FIXED
    } else {
      console.log("Category not found:", categoryKey);
    }
  }

  // ✅ SEARCH FILTER (NEW)
  if (searchQuery && searchQuery.trim() !== "") {
  filter.$or = [
    { location: { $regex: searchQuery, $options: "i" } },
    { title: { $regex: searchQuery, $options: "i" } }
  ];
}
  const totalListings = await Listing.countDocuments(filter);

  const allListings = await Listing.find(filter)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  res.render("listings/index", {
    allListings,
    currentPage: page,
    totalPages: Math.ceil(totalListings / limit),
    selectedCategory: categoryKey,
    searchQuery // ✅ NOW WORKS
  });
};

 //New form 
  module.exports.RenderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};
/*module.exports.index = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 32;
  const skip = (page - 1) * limit;

  
const totalListings = await Listing.countDocuments(filter);

const allListings = await Listing.find(filter)
  .skip(skip)
  .limit(limit)
  .sort({ createdAt: -1 });

  res.render("listings/index", {
    allListings,
    currentPage: page,   // ✅ REQUIRED
    totalPages: Math.ceil(totalListings / limit) //  REQUIRED
  });
};*/


// Show route
module.exports.showListing = (async(req,res) =>{
  let {id} = req.params
  const listing = await Listing.findById(id).populate({path:"reviews",populate:{path:"author",},}).populate("owner");
  if(!listing){
     req.flash("error", "Listing you requested for does not exist!");
     return res.redirect("/listings");  // <-- return stops execution
  }
 // console.log(listing);
  res.render("listings/show.ejs", {listing});
})

// CREATE NEW LISTING
const User = require("../models/user");
module.exports.createListing = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/login");
    }

    // Convert today's date to start and end of day
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Check if this user already created a listing today
    const existingListing = await Listing.findOne({
      owner: user._id,
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });

    if (existingListing) {
      req.flash("error", "You can only create 1 listing per day.");
      return res.redirect("/listings"); // or wherever
    }

     

    // Create new listing
    const listing = new Listing(req.body.Listing);
    listing.owner = user._id;

/// ✅ CORRECT CODE
if (req.body.categoryKey) {
  const category = await Category.findOne({ key: req.body.categoryKey });

  if (category) {
    listing.category = category._id;
  } else {
    console.log("Category not found:", req.body.categoryKey);
  }
}
await listing.save();

    // Auto promote user to owner
    if (user.role === "user") {
      user.role = "owner";
      await user.save();
    }

    req.flash("success", "Listing created successfully");
    res.redirect(`/listings/${listing._id}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong while creating listing.");
    res.redirect("/listings");
  }
};



//Edit Route
module.exports.EditListing = async(req,res) =>{
  let {id} = req.params;
  const listing = await Listing.findById(id);
   if(!listing){
     req.flash("error", "Listing you requested for does not exist!");
     return res.redirect("/listings");  // <-- return stops execution
  }
  res.render("listings/Edit.ejs", {listing});
};

module.exports.UpdateListing = async (req, res) => {
  const { id } = req.params;

  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing not found");
    return res.redirect("/listings");
  }

  //  If new image uploaded
  if (req.file) {
    // Delete old image (except default)
    if (
      listing.image?.filename &&
      listing.image.filename !== "listingimage"
    ) {
      const oldPath = path.join(
        __dirname,
        "..",
        "public",
        "uploads",
        listing.image.filename
      );

      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Save new image
    listing.image = {
      url: `/uploads/${req.file.filename}`,
      filename: req.file.filename
    };
  }

  // Update text fields
  listing.title = req.body.Listing.title;
  listing.description = req.body.Listing.description;
  listing.price = req.body.Listing.price;
  listing.location = req.body.Listing.location;
  listing.country = req.body.Listing.country;

  if (req.body.categoryKey) {
  const category = await Category.findOne({ key: req.body.categoryKey });

   if (category) {
    listing.category = category._id;
  } else {
    console.log("Category not found:", req.body.categoryKey);
  }
}

  await listing.save();

  req.flash("success", "Listing updated successfully");
  res.redirect(`/listings/${id}`);
};



//Delete Route
/*module.exports.DeleteListing = async (req, res) => {
  let { id } = req.params;
  let deleteListing = await Listing.findByIdAndDelete(id);
  console.log(deleteListing)
  req.flash("success", "Listing Deleted!")
  res.redirect("/listings");
};*/


module.exports.DeleteListing = async (req, res) => {
  const { id } = req.params;

  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing not found");
    return res.redirect("/listings");
  }

  //  PROTECT DEFAULT IMAGE
  if (
    listing.image &&
    listing.image.filename &&
    listing.image.filename !== "listingimage"
  ) {
    const imagePath = path.join(
      __dirname,
      "..",
      "public",
      "uploads",
      listing.image.filename
    );

    // extra safety
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }
    await Booking.deleteMany({ listing: id });


  // delete listing from DB
  await Listing.findByIdAndDelete(id);

  req.flash("success", "Listing deleted successfully");
  res.redirect("/listings");
};
