// Dependencies
var express = require("express");
var mongoose = require("mongoose");
var logger = require("morgan");
var path = require("path");

// Scraping tools
var axios = require("axios");
var cheerio = require("cheerio");

// Requiring all models
var db = require("./models");

// Initializing the port
var PORT = 3000;

// Initializing Express
var app = express();

// Middleware
    // Use morgan logger for logging requests
    app.use(logger("dev"));
    // Parse request body as JSON
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    // Make public a static folder
    app.use(express.static("public"));

// Using Handlebars
var exphbs = require("express-handlebars");
app.engine("handlebars", exphbs({
    defaultLayout: "main",
    partialsDir: path.join(__dirname, "/views/layouts/partials")
}));
app.set("view engine", "handlebars");

// Connecting to the Mongo DB
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/dogdb";

mongoose.connect(MONGODB_URI);

/*==========================
           Routes
===========================*/

// Shows all unsaved articles on homepage
app.get("/", function(req, res){
    db.Article.find({"saved": false}).then(function(result){
        // This variable allows us to use handlebars by passing the results 
        // from the database as the value in an object
        var hbsObject = { articles: result };
        res.render("index",hbsObject);
    }).catch(function(err){ res.json(err) });
});

//Scrapes the dogtime website for the article data
app.get("/scrape", function(req, res) {
    axios.get("https://www.dogtime.com/").then(function(response) {
      var $ = cheerio.load(response.data);

      $(".post-listed-title").each(function(i, element) {
        var result = {};

        result.title = $(element).text();
    
        result.link = $(element).children("a").attr("href");

        result.summary = $(element).siblings(".post-listed-excerpt").text().trim();
    
        db.Article.create(result)
        .then(function(dbArticle) {
          console.log(dbArticle);
        })
        .catch(function(err) {
          console.log(err);
        });
      });
});
res.send("Scrape Complete");
});

// Route for grabbing a specific Article by id, update status to "saved"
app.post("/save/:id", function(req, res) {
    db.Article
      .update({ _id: req.params.id }, { $set: {saved: true}})
      .then(function(dbArticle) {
        res.json(dbArticle);
      })
      .catch(function(err) {
        res.json(err);
      });
  });
  
  // Route for grabbing a specific Article by id, update status to "unsaved"
  app.post("/unsave/:id", function(req, res) {
    db.Article
      .update({ _id: req.params.id }, { $set: {saved: false}})
      .then(function(dbArticle) {
        res.json(dbArticle);
      })
      .catch(function(err) {
        res.json(err);
      });
  });
  
  //Route to render Articles to handlebars and populate with saved articles
  app.get("/saved", function(req, res) {
    db.Article
    .find({ saved: true })
    .then(function(dbArticles) {
      var hbsObject = {
        articles: dbArticles
      };
      res.render("saved", hbsObject);
    })
    .catch(function(err){
      res.json(err);
    });
  });
  
  
  //get route to retrieve all notes for a particlular article
  app.get('/getNotes/:id', function (req,res){
    db.Article
      .findOne({ _id: req.params.id })
      .populate('note')
      .then(function(dbArticle){
        res.json(dbArticle);
      })
      .catch(function(err){
        res.json(err);
      });
  });
  
  //post route to create a new note in the database
  app.post('/createNote/:id', function (req,res){
    db.Note
      .create(req.body)
      .then(function(dbNote){
        return db.Article.findOneAndUpdate( {_id: req.params.id }, { note: dbNote._id }, { new:true });//saving reference to note in corresponding article
      })
      .then(function(dbArticle) {
        res.json(dbArticle);
      })
      .catch(function(err) {
        res.json(err);
      });
  });

// Starting the server
app.listen(PORT, function() {
    console.log("App running on port " + PORT + "!");
  });
