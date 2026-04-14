const Review= require("../models/review.js");
const Listing = require("../models/listing.js");
const mongoose = require("mongoose");



//Create review 
module.exports.createReview = async(req,res) =>{
  let listing = await Listing.findById(req.params.id);
  const { review } = req.body;
  review.rating = Number(review.rating) || 1;  
  let newReview = new Review(review);
  newReview.author =  req.session.userId;
  listing.reviews.push(newReview);    // <-- IMPORTANT
   //console.log(newReview)
  await newReview.save();
  if (!listing.category) {
  const defaultCategory = await Category.findOne({ key: "trending" });
  listing.category = defaultCategory._id;
}
 await listing.save();
  req.flash("success", "New Review Created!")
 res.redirect(`/listings/${listing._id}`);
};


//Delete review
module.exports.deleteReview = async(req,res) =>{
  let {id,reviewId} = req.params;
await Listing.findByIdAndUpdate(id, {
  $pull: { reviews: new mongoose.Types.ObjectId(reviewId) }/*this overline is due to warning by editor(vs code)*/
});
  await Review.findByIdAndDelete(reviewId);
   req.flash("success", "Review Deleted!")
  res.redirect(`/listings/${id}`);
};