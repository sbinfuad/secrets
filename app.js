//jshint esversion:6
const dotenv = require('dotenv');
dotenv.config();
const express = require("express");
const app = express();
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

app.use("/node_modules", express.static('node_modules'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

const mongoose = require("mongoose");
mongoose.connect('mongodb://localhost:27017/userDB', {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set('useCreateIndex', true);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
});

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model('User', userSchema);


passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id, email: profile.emails[0].value}, function (err, user) {
        console.log(profile);
        return cb(err, user);
    });
  }
));

app.get("/", (req,res) => {
    res.render("home");
})

app.get("/secrets",  (req, res) => {
    if (req.isAuthenticated()){
        res.render("secrets");
    } else {
        res.redirect("login");
    }
        
})

app.post("/register", (req, res) => {

    User.register({username: req.body.username}, req.body.password, (err, user) => {
        if(err){
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate('local')(req, res, () => {
                res.redirect('/secrets');
            });
        }
    })
      
})

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });


app.get("/login", (req,res) => {
    res.render("login");
})

app.get("/register", (req,res) => {
    res.render("register");
})

app.get("/submit", (req, res) => {
    if(req.isAuthenticated()){
        res.render("submit");
    } else {
        res.render("login");
    }
})

app.post('/login',

  passport.authenticate('local', { failureRedirect: '/login' }),

  function(req, res) {

    res.redirect('/secrets');

  });

app.get("/logout", (req, res) => {
    req.logout();
    res.redirect('/');
})

app.listen(3000, function(){
    console.log("server on");
})

