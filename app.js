require("dotenv").config();
const express = require('express');
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require ("express-session");
const passport = require ("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require('mongoose-findorcreate');

const GoogleStrategy = require('passport-google-oauth20').Strategy;
const res = require('express/lib/response');

const app = express();

console.log(process.env.API_KEY);
  
app.use(express.static("public"));
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret: "our Secret investments.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session()); 

mongoose.connect('mongodb+srv://Admin:<admin>@cluster0.7pnptmt.mongodb.net/?retryWrites=true&w=majority', ()=>{
    console.log("connected to MongoDB")
}); 

const userSchema = new mongoose.Schema ({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
 
const User = new mongoose.model("User", userSchema); 
 
passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username, name: user.displayName });
    });
});
  
passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/finbooke",
    userProfileURL: "https://googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
    res.render("home");
});

app.get("/auth/google", function(req, res){
    passport.authenticate("google", {scope: ["profile"]})
});

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/finbooke');
  });

app.get("/login", function(req,res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
});

app.get("/finbooke", function(req, res){
    User.find({"secret": {$ne: null}}, function(err, foundUsers){
        if (err){
            console.log(err);
        } else {
            if (foundUsers){
                res.render("finbooke", {usersWithSecrets: foundUsers})
            }
        }
    })
});   

app.get("/submit", function(req, res){
    if(req.isAuthenticated()){
        res.render("finbooke");
    } else {
        res.redirect("/submit");
    }
});

app.post("/submit", function(req, res){
    const submittedSecret = req.body.secret;
    console.log(req.user.id);

    User.findById(req.use.id, function(err, foundUser){
        if (err){
            console.log(err);
        } else {
            if (foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save(function(){
                    res.redirect("/finbooke");
                })
            }
        }
    })
})

app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
});


app.post("/register", function (req, res) {

    User,register({username: req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else {
            passport.authenticate("local")(req,res, function(){
                res.redirect("/finbooke");
            });
        }
    });

});

app.post("/login", function(req, res){
    const user = new User ({
    username: req.body.username,
    password: req.body.password
    });

   req.login(user, function(err){
       if (err) {
           console.log(err);
       } else {
           passport.authenticate("local")(req, res, function(){
               res.redirect('/finbooke');
           });
       }
   });
});


app.listen(3000, function(){
    console.log('Server started on port 3000');
});