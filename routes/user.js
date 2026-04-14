const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const UserControllers = require("../controllers/user.js");

// SIGNUP
router.get("/signup", UserControllers.RenderSignUpForm);
router.post("/signup", UserControllers.signup);

// LOGIN
router.get("/login", UserControllers.RenderLoginform);
router.post("/login", UserControllers.Login);

// LOGOUT
router.get("/logout", UserControllers.Logout);

// ✅ VERIFY EMAIL
router.get("/verify/:token", async (req, res) => {
    const user = await User.findOne({ verifyToken: req.params.token });

    if (!user) {
        req.flash("error", "Invalid or expired verification link");
        return res.redirect("/login");
    }

    user.isVerified = true;
    user.verifyToken = undefined;

    await user.save();

    req.flash("success", "Email verified successfully! Now login ✅");
    res.redirect("/login");
});

module.exports = router;