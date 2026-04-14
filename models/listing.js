const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");


const listingSchema = new Schema({
    title: {
        type: String,
        required: true,
    },

    description:{
        type: String,
        required: true,
    },
 image: {
         url: {
    type: String,
    default: "/beach.jpg",
    set: v => v && v.trim() !== "" ? v : "/beach.jpg"
  },
  filename: {
    type: String,
    default: "listingimage",
    set: v => v && v.trim() !== "" ? v : "listingimage"
  }
 
},

    price: {
        type: Number,
        required: true,
    },

    location:{
        type: String,
        required: true,
    },
    country:{
        type: String,
        required: true,
    },

    
// ✅ ADD THIS
category: {
  type: Schema.Types.ObjectId,
  ref: "Category",
  required: true
},

    reviews: [
       {
        type: Schema.Types.ObjectId,
        ref: "Reviews",

       }, 
    ],
   owner:{
    type: Schema.Types.ObjectId,
    ref: "User",
    required:true,
   }
},{ timestamps: true }
);

listingSchema.post("findOneAndDelete", async (Listing) =>{
    if(Listing){
        await Review.deleteMany({_id : { $in:Listing.reviews}});
    }
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;
             
     

 