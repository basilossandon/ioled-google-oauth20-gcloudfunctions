const express = require("express");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const cookieSession = require("cookie-session");
const mongoose = require("mongoose");
const User = require("./models/User");

const app = express();

const uri =
  "mongodb+srv://miauadmin:NQwYAKXB9AvwKMXf@cluster0-ys9iq.mongodb.net/test?retryWrites=true&w=majority";
mongoose.connect(uri, {
  useUnifiedTopology: true,
  useNewUrlParser: true
});
mongoose.set("useCreateIndex", true);

exports.currentUser = (req, res) => {
  // If user is not authenticated, return null.
  if (!req.user) res.send();
  else {
    const user = _.pick(req.user, ["name", "email", "photo"]);
    res.status(200).send(user);
  }
};

// cookieSession config
app.use(
  cookieSession({
    name: "session",
    maxAge: 24 * 60 * 60 * 1000, // One day in milliseconds
    keys: ["ioledencryptkey"]
  })
);

app.use(passport.initialize()); // Used to initialize passport
app.use(passport.session()); // Used to persist login sessions

// Used to stuff a piece of information into a cookie
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id).then(user => {
    done(null, user);
  });
});

// Strategy config
passport.use(
  new GoogleStrategy(
    {
      clientID:
        "593794738056-7iodssada09puqud2od1caepqpsh357d.apps.googleusercontent.com",
      clientSecret: "zB41Rp2-U-_apapgot4cDpKY",
      callbackURL:
        "https://us-central1-gleaming-design-261722.cloudfunctions.net/auth/google/callback"
    },
    async (accessToken, refreshToken, profile, done) => {
      // Destructure profile values.
      const {
        id: googleID,
        name: { familyName: lastName, givenName: name },
        emails: [{ value: email }],
        photos: [{ value: photo }]
      } = profile;

      // Search in the DB for the user.
      const existingUser = await User.findOne({ googleID });
      // If the user exists, call passport done with the user.
      if (existingUser) {
        return done(null, existingUser);
      }

      // If th user doesnt, create a new user and call done with it.
      const user = await new User({
        googleID,
        name,
        lastName,
        email,
        photo
      }).save();
      done(null, user);
    }
  )
);

// Middleware to check if the user is authenticated
function isUserAuthenticated(req, res, next) {
  if (req.user) {
    next();
  } else {
    res.send("Please log-in!");
  }
}

app.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"]
  })
);

app.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/auth");
  }
);

app.get("/", isUserAuthenticated, (req, res) => {
  res.send(req.user);
});

// Logout route
app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/auth");
});

app.listen(8000, () => {
  console.log(" iOLED Server Started!");
});

module.exports = {
  app
};
