require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");//npm i express-session.
const flash = require("connect-flash");//npm i connect-flash for Notification
const User = require("./models/user.js");
const { blockAdmin } = require("./middleware/middleware.js");
const multer = require("multer");
app.use(express.urlencoded({ extended: true })); // parse form data
app.use(express.json()); // parse JSON payloads

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const userBookingsRouter = require("./routes/userBooking.js");
const bookingRoutes = require("./routes/booking.js");
const adminRoutes = require("./routes/Admin.js");


const MONGO_URL = process.env.MONGO_URL;



main().then(() =>{
    console.log("connected to DB");
}).catch((err) =>{
    console.log(err);
})

async function main() {
        await mongoose.connect(MONGO_URL);    
};
 
if (!MONGO_URL) {
  console.log("MONGO_URL missing in .env");
}


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));



const sessionOption = {
 secret: process.env.SESSION_SECRET || "fallbacksecret",
 resave: false,
 saveUninitialized: false,
 cookie: {
  httpOnly: true,
 maxAge: 1 * 24 * 60 * 60 * 1000 // 1 days in milliseconds
}

};

app.use(session(sessionOption));
app.use(flash());



app.use(async (req, res, next) => {
    if (req.session.userId) {
        try {
            const user = await User.findById(req.session.userId);
            res.locals.currentUser = user;
        } catch (e) {
            res.locals.currentUser = null;
        }
    } else {
        res.locals.currentUser = null;
    }
    next();
});


app.use((req, res, next) =>{
    res.locals.success = req.flash("success")
    res.locals.error = req.flash("error")
  next();
})

app.use("/admin",adminRoutes);
app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", blockAdmin, reviewRouter);
app.use("/listings",blockAdmin, userBookingsRouter);
app.use("/bookings",  bookingRoutes);
app.use("/", userRouter)

//multer
app.use(async(err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    req.flash("error", err.message);
    return res.redirect("/listings");
  }

  if (err.message === "Only JPG, JPEG, PNG images are allowed") {
    req.flash("error", err.message);
    return res.redirect("/listings");
  }

  next(err);
});





// for Another Routes other than above Routes
app.use((req, res, next) =>{
    next(new ExpressError(404, "Page Not found!"));
})


app.use((err, req, res, next) =>{
  let {statusCode = 500, message = "Something went Wrong!"} = err;
 res.status(statusCode).render("listings/Error.ejs", { message });
//  res.status(statusCode).send(message);
})



const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
