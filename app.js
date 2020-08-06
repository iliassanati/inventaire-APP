const express = require("express");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const flash = require("connect-flash");
const bcrypt = require("bcrypt");
const passport = require("passport");
const passportLocal = require("passport-local");

var produitstotal = [];

//Load env vars
dotenv.config({ path: "./config/config.env" });

const app = express();

// Express session
app.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect flash
app.use(flash());

// Global variables
app.use(function (req, res, next) {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");
  next();
});

app.set("view engine", "ejs");

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(express.static("public"));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false,
});

const produitSchema = new mongoose.Schema({
  codeBarre: {
    type: Number,
    required: true,
  },
  nomProduit: {
    type: String,
    required: true,
  },
  fournisseur: {
    type: String,
    required: true,
  },
  quantite: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    Default: Date.now,
  },
});

const Produit = mongoose.model("Produit", produitSchema);

const addAdminchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  confirmPassword: {
    type: String,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const Admin = mongoose.model("Admin", addAdminchema);

bcrypt.genSalt(10, function (err, salt) {
  const admin = new Admin({
    name: "benbrahim",
    email: "ben@brahim.com",
    password: "benbrahim",
    confirmPassword: "benbrahim",
  });

  bcrypt.hash("benbrahim", salt, function (err, hash) {
    if (err) throw err;
    admin.password = hash;
    // admin.save()
    // admin.catch((err) => console.log(err));
  });
});

// Passport Config

const LocalStrategy = require("passport-local").Strategy;

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
    },
    (email, password, done) => {
      // Match user
      Admin.findOne({
        email: email,
      }).then((admin) => {
        if (!admin) {
          return done(null, false, {
            message: "That email is not registered",
          });
        }

        // Match password
        bcrypt.compare(password, admin.password, (err, isMatch) => {
          if (err) throw err;
          if (isMatch) {
            return done(null, admin);
          } else {
            return done(null, false, {
              message: "Password incorrect",
            });
          }
        });
      });
    }
  )
);

passport.serializeUser(function (admin, done) {
  done(null, admin.id);
});

passport.deserializeUser(function (id, done) {
  Admin.findById(id, function (err, admin) {
    done(err, admin);
  });
});

process.on("unhandledRejection", (reason, promise) => {
  console.log("Unhandled Rejection at:", promise, "reason:", reason);
  // Application specific logging, throwing an error, or other logic here
});
////////////////////////////////////////////////////////////////////////Routes//////////////////////////////////////////////////////////////

//home
app.get("/", function (req, res) {
  res.render("index");
});

//dashboard
app.get("/dashboard", function (req, res) {
  if (req.isAuthenticated()) {
    Produit.find({}, function (err, produits) {
      if (err) {
        console.log(err);
      } else {
        produitstotal = produits;
        nombreproduits = produits.length;
      }
    });
    Admin.find({}, function (err, admins) {
      if (err) {
        console.log(err);
      } else {
        adminstotal = admins.length;
      }
      res.render("dashboard", {
        produits: produitstotal,
        produitstotal: nombreproduits,
        adminstotal: adminstotal,
      });
    });
  } else {
    req.flash("error_msg", "Please log in to view that resource");
    res.redirect("/login");
  }
});

//login
app.get("/login", function (req, res) {
  res.render("login");
});

app.post("/login", function (req, res, next) {
  passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
    failureFlash: true,
  })(req, res, next);
});

//logout
app.get("/logout", function (req, res) {
  req.logout();

  req.flash("success_msg", "You are logged out");
  res.redirect("/login");
});

//Add product
app.get("/addProduct", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("addProduct");
  } else {
    req.flash("error_msg", "Please log in to view that resource");
    res.redirect("/login");
  }
});

app.post("/addProduct", function (req, res) {
  const { code, nom, four, qte, date } = req.body;

  let errors = [];

  //check required fields
  if (!code || !nom || !four || !qte || !date) {
    errors.push({ msg: "Please enter all fields" });
  }
  if (isNaN(code)) {
    errors.push({ msg: "Code barre must be a number" });
  }
  if (isNaN(qte)) {
    errors.push({ msg: "quantite must be a number" });
  }
  if (errors.length > 0) {
    res.render("addProduct", { errors, code, nom, four, qte, date });
  } else {
    const prdt = new Produit({
      codeBarre: code,
      nomProduit: nom,
      fournisseur: four,
      quantite: qte,
      date: date,
    });

    prdt.save();
    res.redirect("/dashboard");
  }
});

//search product
app.get("/searchProduct", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("searchProduct");
  } else {
    req.flash("error_msg", "Please log in to view that resource");
    res.redirect("/login");
  }
});

app.post("/searchProduct", function (req, res) {
  const codeBarre = req.body.codeBarre;
  if (isNaN(codeBarre)) {
    req.flash("error_msg", "Code barre is a number");
    res.redirect("/searchProduct");
  } else {
    Produit.findOne({ codeBarre: codeBarre }, function (err, produit) {
      if (produit) {
        res.render("updateProduct", { produit: produit });
      } else {
        req.flash("error_msg", "No product is registered with this code barre");
        res.redirect("/searchProduct");
        console.log(err);
      }
    });
  }
});

//Update product
app.get("/updateProduct", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("updateProduct");
  } else {
    req.flash("error_msg", "Please log in to view that resource");
    res.redirect("/login");
  }
});

//
app.post("/updateProduct", function (req, res) {
  const { code, nom, four, qte, date } = req.body;
  if (isNaN(code)) {
    req.flash("error_msg", "Code barre is a number");
    res.redirect("/searchProduct");
  }
  if (isNaN(qte)) {
    req.flash("error_msg", "quantite must be a number");
    res.redirect("/searchProduct");
  } else {
    Produit.updateOne(
      { codeBarre: req.body.code },
      {
        codeBarre: req.body.code,
        nomProduit: req.body.nom,
        fournisseur: req.body.four,
        quantite: req.body.qte,
        date: req.body.date,
      },

      function (err) {
        if (err) {
          console.log(err);
        } else {
          req.flash("success_msg", "The product has been updated");
          res.redirect("/dashboard");
        }
      }
    );
  }
});

//delete product
app.get("/deleteProduct", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("deleteProduct");
  } else {
    req.flash("error_msg", "Please log in to view that resource");
    res.redirect("/login");
  }
});

app.post("/deleteProduct", function (req, res) {
  const codeBarre = req.body.code;
  if (isNaN(codeBarre)) {
    req.flash("error_msg", "Code barre must be a number");
    res.redirect("/deleteProduct");
  } else {
    Produit.deleteOne({ codeBarre: codeBarre }, function (err, result) {
      if (!err) {
        if (result.n === 0) {
          req.flash("error_msg", "The product was not found");
          res.redirect("/deleteProduct");
        } else {
          req.flash("error_msg", "The product has been deleted");
          res.redirect("/dashboard");
        }
      } else {
        res.send(err);
        console.log(err);
      }
    });
  }
});

//profile
app.get("/profile", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("profile");
  } else {
    req.flash("error_msg", "Please log in to view that resource");
    res.redirect("/login");
  }
});

app.get("/settings", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("settings");
  } else {
    req.flash("error_msg", "Please log in to view that resource");
    res.redirect("/login");
  }
});

//categories
app.get("/categories", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("categories");
  } else {
    req.flash("error_msg", "Please log in to view that resource");
    res.redirect("/login");
  }
});

//posts
app.get("/posts", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("posts");
  } else {
    req.flash("error_msg", "Please log in to view that resource");
    res.redirect("/login");
  }
});

//users
app.get("/users", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("users");
  } else {
    req.flash("error_msg", "Please log in to view that resource");
    res.redirect("/login");
  }
});

//addAdmin
app.get("/addAdmin", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("addAdmin");
  } else {
    req.flash("error_msg", "Please log in to view that resource");
    res.redirect("/login");
  }
});

app.post("/addAdmin", function (req, res) {
  const { name, email, password, confirmPassword } = req.body;
  let errors = [];

  //check required fields
  if (!name || !email || !password || !confirmPassword) {
    errors.push({ msg: "Please enter all fields" });
  }

  //check passwords matchs
  if (password != confirmPassword) {
    errors.push({ msg: "passwords do not match" });
  }

  //check password length
  if (password.length < 6) {
    errors.push({ msg: "password must be at least 6 catacters" });
  }

  if (errors.length > 0) {
    res.render("addAdmin", {
      errors,
      name,
      email,
      password,
      confirmPassword,
    });
  } else {
    Admin.findOne({
      email: email,
    }).then(function (admin) {
      if (admin) {
        errors.push({
          msg: "Email already exists",
        });
        res.render("register", {
          errors,
          name,
          email,
          password,
          confirmPassword,
        });
      } else {
        const newAdmin = new Admin({
          name,
          email,
          password,
        });

        bcrypt.genSalt(10, function (err, salt) {
          bcrypt.hash(newAdmin.password, salt, function (err, hash) {
            if (err) throw err;
            newAdmin.password = hash;
            newAdmin
              .save()
              .then(function (admin) {
                req.flash(
                  "success_msg",
                  "You are now registered and can log in"
                );
                res.redirect("/dashboard");
              })
              .catch((err) => console.log(err));
          });
        });
      }
    });
  }
});

///////////////////////////////////////////////////////////////////////
app.listen(process.env.PORT || 5000, function () {
  console.log("Server started on port 5000");
});

//////////////////////////////////////////////Request Targetting all products///////////////////////////////////////////////////////////////////////
// app.route("/produits")

// .get(function(req, res){
//   Produit.find(function(err, foundProduits){
//     if (!err) {
//       res.send(foundProduits);
//     } else {
//       res.send(err);
//     }
//   });
// })

// .post(function(req, res){

//   const newProduit = new Produit({

//     codeBarre: req.body.codeBarre,
//     nomProduit:req.body.nomProduit,
//     fournisseur:req.body.fournisseur,
//     quantite:req.body.quantite
//   });

//   newProduit.save(function(err){
//     if (!err){
//       res.send("Successfully added a new Product.");
//     } else {
//       res.send(err);
//     }
//   });
// })

// .delete(function(req, res){

//   Produit.deleteMany(function(err){
//     if (!err){
//       res.send("Successfully deleted all products");
//     } else {
//       res.send(err);
//     }
//   });
// });
// ///////////////////////////////////////////Requests Targetting A Specific product///////////////////////////////////////////////////////////////////

// app.route("/produits/:produitCodeBarre")

// .get(function(req, res){

//   Produit.findOne({codeBarre: req.params.codeBarre}, function(err, foundProduit){
//     if (foundProduit) {
//       res.send(foundProduit);
//     } else {
//       res.send("No product matching that barre code was found.");
//     }
//   });
// })

// .put(function(req, res){

//   Produit.update(
//     {codeBarre: req.params.codeBarre},
//     { codeBarre: req.body.codeBarre,
//       nomProduit:req.body.nomProduit,
//       fournisseur:req.body.fournisseur,
//       quantite:req.body.quantite},
//     {overwrite: true},
//     function(err){
//       if(!err){
//         res.send("Successfully updated the selected customer.");
//       }
//     }
//   );
// })

// .patch(function(req, res){

//   Produit.update(
//     {codeBarre: req.params.codeBarre},
//     {$set: req.body},
//     function(err){
//       if(!err){
//         res.send("Successfully updated produit.");
//       } else {
//         res.send(err);
//       }
//     }
//   );
// })

// .delete(function(req, res){

//   Produit.deleteOne(
//     {id: req.params.codeBarre},
//     function(err){
//       if (!err){
//         res.send("Successfully deleted the corresponding product.");
//       } else {
//         res.send(err);
//       }
//     }
//   );
// });
