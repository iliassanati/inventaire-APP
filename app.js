const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');

var produitstotal = [];

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

mongoose.connect("mongodb+srv://iliassanati:iliassanati@cluster0.ade7o.mongodb.net/InventaireDB", {useNewUrlParser: true, useUnifiedTopology: true});



const produitSchema = {
  codeBarre: Number,
  nomProduit: String,
  fournisseur: String,
  quantite: Number,
  description: String
};


const Produit = mongoose.model("Produit", produitSchema);


//////////////////////////////////////////////Request Targetting all products///////////////////////////////////////////////////////////////////////
app.route("/produits")

.get(function(req, res){
  Produit.find(function(err, foundProduits){
    if (!err) {
      res.send(foundProduits);
    } else {
      res.send(err);
    }
  });
})

.post(function(req, res){

  const newProduit = new Produit({

    codeBarre: req.body.codeBarre,
    nomProduit:req.body.nomProduit,
    fournisseur:req.body.fournisseur,
    quantite:req.body.quantite
  });

  newProduit.save(function(err){
    if (!err){
      res.send("Successfully added a new Product.");
    } else {
      res.send(err);
    }
  });
})

.delete(function(req, res){

  Produit.deleteMany(function(err){
    if (!err){
      res.send("Successfully deleted all products");
    } else {
      res.send(err);
    }
  });
});
///////////////////////////////////////////Requests Targetting A Specific product///////////////////////////////////////////////////////////////////

app.route("/produits/:produitCodeBarre")

.get(function(req, res){

  Produit.findOne({codeBarre: req.params.codeBarre}, function(err, foundProduit){
    if (foundProduit) {
      res.send(foundProduit);
    } else {
      res.send("No product matching that barre code was found.");
    }
  });
})

.put(function(req, res){

  Produit.update(
    {codeBarre: req.params.codeBarre},
    { codeBarre: req.body.codeBarre,
      nomProduit:req.body.nomProduit,
      fournisseur:req.body.fournisseur,
      quantite:req.body.quantite},
    {overwrite: true},
    function(err){
      if(!err){
        res.send("Successfully updated the selected customer.");
      }
    }
  );
})

.patch(function(req, res){

  Produit.update(
    {codeBarre: req.params.codeBarre},
    {$set: req.body},
    function(err){
      if(!err){
        res.send("Successfully updated produit.");
      } else {
        res.send(err);
      }
    }
  );
})

.delete(function(req, res){

  Produit.deleteOne(
    {id: req.params.codeBarre},
    function(err){
      if (!err){
        res.send("Successfully deleted the corresponding product.");
      } else {
        res.send(err);
      }
    }
  );
});



// home
app.get("/", function(req,res){
  res.render("login")
})

//dashboard
app.get("/dashboard", function(req,res){

  

  Produit.find({}, function(err, produits){
    if(err){
      console.log(err);
    }else{
      produitstotal = produits; 
      
    };
    res.render("dashboard", {produits:produitstotal})
  });

   
})

//login
app.post("/", function(req,res){
  var username = req.body.email
  var mdp = req.body.mdp
  
  if(username === "test" & mdp === "testtest"){
    res.redirect("/dashboard");
  }else{
    res.send("sdsdsdsd")
  }

});

//Add product
app.get("/addProduct", function(req,res){
  res.render("addProduct")
});


app.post("/addProduct", function(req,res){

  const prdt = new Produit({

    codeBarre: req.body.code,
    nomProduit: req.body.nom,
    fournisseur: req.body.four,
    quantite: req.body.qte,
    description: req.body.editor1
  });

  prdt.save();
  res.redirect("/dashboard");
 
});

//details
app.get("/details", function(req,res){
  res.render("details", {produits:produitstotal})
})



///////////////////////////////////////////////////////////////////////
app.listen(5000, function() {
  console.log("Server started on port 5000");
});
