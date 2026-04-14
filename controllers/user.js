const User = require("../models/user.js");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const transporter = require("../utils/mailer"); 



module.exports.RenderSignUpForm = (req, res) => {
    res.render("users/signup");
};

module.exports.signup = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            req.flash("error", "All fields are required!");
            return res.redirect("/signup");
        }

        const existingUser = await User.findOne({
            $or: [{ username }, { email }]
        });

        if (existingUser) {
            req.flash("error", "Username or email already exists!");
            return res.redirect("/signup");
        }

        // 🔐 Hash password
        const salt = await bcrypt.genSalt(12);
        const hash = await bcrypt.hash(password, salt);

        // 🔑 Generate token
        const token = crypto.randomBytes(32).toString("hex");

        // 💾 Save user (WITH TOKEN)
        const user = new User({
            username,
            email,
            salt,
            hash,
            verifyToken: token   // ✅ IMPORTANT
        });

        await user.save();

        // 📧 Send email
        
        const verifyURL = `${process.env.BASE_URL}/verify/${token}`;

        try {
    await transporter.sendMail({
        from: '"Wanderlust App" <shivamji2310@gmail.com>',
        to: user.email,
        subject: "Verify your account",
        html: `
            <h2>Welcome to Wanderlust 🌍</h2>
            <p>Please click below to verify your email:</p>
            <a href="${verifyURL}">Verify Account</a>
        `
    });
} catch (mailErr) {
    console.error("Email error:", mailErr);

    // optional: delete user if email fails
    await User.deleteOne({ _id: user._id });

    req.flash("error", "Failed to send verification email. Try again!");
    return res.redirect("/signup");
}

        //  DO NOT LOGIN USER HERE
        req.flash("success", "Verification email sent! Check your inbox ");
        res.redirect("/login");

    } catch (err) {
        console.error(err.message);
        req.flash("error", "Something went wrong. Please try again!");
        res.redirect("/signup");
    }
};



//Login
module.exports.RenderLoginform = (req, res) => {
    res.render("users/login");
}

module.exports.Login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            req.flash("error", "Please enter both username and password.");
            return res.redirect("/login");
        }

        const user = await User.findOne({ username });

        if (!user) {
            req.flash("error", "Invalid username or password!");
            return res.redirect("/login");
        }
        

        const isValid = await bcrypt.compare(password, user.hash);
        if (!isValid) {
            req.flash("error", "Invalid username or password!");
            return res.redirect("/login");
        }

        if (user.isBlocked) {
    req.flash("error", "Your account is blocked by admin.");
    return res.redirect("/login");
}

        //  BLOCK IF NOT VERIFIED
        if (!user.isVerified && user.role !== "admin") {
            req.flash("error", "Please verify your email first 📩");
            return res.redirect("/login");
        }

        //  LOGIN SUCCESS
        req.session.userId = user._id;
        req.session.role = user.role;

        req.flash("success", `Welcome back, ${user.username}!`);

        if (user.role === "admin") {
            return res.redirect("/admin/dashboard");
        }

        const redirectUrl = req.session.returnTo || "/listings";
        delete req.session.returnTo;

        res.redirect(redirectUrl);



    } catch (err) {
        console.error(err);
        req.flash("error", "Something went wrong. Please try again!");
        res.redirect("/login");
    }

    
};

module.exports.Logout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error(err);
            return res.redirect("/listings"); // fallback if destroy fails
        }

        res.clearCookie("connect.sid"); // remove session cookie
        res.render("users/logout.ejs");      // redirect to listings
    });
};

