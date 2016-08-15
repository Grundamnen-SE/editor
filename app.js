/*
 * Grundämnen.se redigerings modul
 * Created by Joar C & Gustav E
 *
 */

module.exports = {};

// Required libraries
// Express related
var express = require('express');
var session = require("express-session");
var logger = require('morgan');
var helmet = require("helmet");
var bodyParser = require('body-parser');
var favicon = require('serve-favicon');

// MongoDB
var MongoStore = require('connect-mongo')(session);
var mongopath = "mongodb://localhost:27017/pesys";
var Mongo = require('mongodb').Db;
var MongoServer = require('mongodb').Server;

// Own
var replaceAll = require('./modules/utils/functions.js').replaceAll;
var isInArray = require('./modules/utils/functions.js').isInArray;
var site_data = require("./data/data.json");
var pwman = require('./modules/utils/password.js');

// Misc
var fs = require('fs');
var util = require('util');
var path = require('path');

// Express data
var sessionconfig = require("./data/session.config.json");
sessionconfig.expires = new Date(Date.now()+60*60*1000*3);
sessionconfig.store = new MongoStore({ url: mongopath });

// Init Express
var app = express();
app.use(logger("dev"));
app.use(helmet());
app.use(helmet.contentSecurityPolicy(require('./data/helmet.csp.json')));
app.use(session(sessionconfig));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Some express variables that are important
app.enable('trust proxy');
app.disable('x-powered-by');

// Open DB Connection
// TODO: Move to API module
/*var db = new Mongo("pesys", new MongoServer("localhost", 27017, {auto_reconnect: true}), {w: 1});
db.open(function(e, d){
  if (e) {
    console.log(e);
  } else {
    console.log("MongoDB: Connected to database pesys");
    db.collection("elements").find({playbtn: true}, {element:1, number:1, playbtn:1, _id:0}).toArray(function(err, data){
      if (err) console.log(err);
      playbtn = data;
    });
    setInterval(function(){
      db.collection("elements").find({playbtn: true}, {element:1, number:1, playbtn:1, _id:0}).toArray(function(err, data){
        if (err) console.log(err);
        playbtn = data;
      });
    }, 1000*60);
  }
});*/

// Variables
var elements = ["H","He","Li","Be","B","C","N","O","F","Ne","Na","Mg","Al","Si",
                "P","S","Cl","Ar","K","Ca","Sc","Ti","V","Cr","Mn","Fe","Co","Ni",
                "Cu","Zn","Ga","Ge","As","Se","Br","Kr","Rb","Sr","Y","Zr","Nb",
                "Mo","Tc","Ru","Rh","Pd","Ag","Cd","In","Sn","Sb","Te","I","Xe",
                "Cs","Ba","Hf","Ta","W","Re","Os","Ir","Pt","Au","Hg","Tl","Pb",
                "Bi","Po","At","Rn","Fr","Ra","Rf","Db","Sg","Bh","Hs","Mt","Ds",
                "Rg","Cn","Uut","Fl","Uup","Lv","Uus","Uuo","La","Ce","Pr","Nd",
                "Pm","Sm","Eu","Gd","Tb","Dy","Ho","Er","Tm","Yb","Lu","Ac","Th",
                "Pa","U","Np","Pu","Am","Cm","Bk","Cf","Es","Fm","Md","No","Lr"];
var settingsPages = ["profile", "approve", "users", "superadmin"];

// Express render engine
app.engine('html', function (fp, options, callback) {
  fs.readFile(fp, function (err, content) {
    if (err) return callback(new Error(err));

    var rendered = content.toString();
    rendered = replaceAll(rendered, "%table%", table.getTable());

    for (var key in site_data) {
      if (!site_data.hasOwnProperty(key)) continue;
      rendered = replaceAll(rendered, "%"+key+"%", site_data[key]);
    }

    return callback(null, rendered);
  });
});

// Set Express variables
app.set('views', './views');
app.set('view engine', 'html');
if (process.env.NODE_ENV != "production") {
  app.use("/css", express.static(__dirname + "/static/css"));
  app.use("/img", express.static(__dirname + "/static/img"));
  app.use("/js",  express.static(__dirname + "/static/js"));
  app.use(favicon(__dirname + "/static/favicon.ico"));
}

app.get('/', function(req, res){
  if (req.session.user != null) {
    res.render('index', {user: req.session.user});
  } else {
    res.redirect("/login");
  }
});

app.get('/login', function(req, res){
  if (req.session.user != null && req.session.user.logged_in) {
    res.redirect("/logout");
  } else {
    res.render('login', {"login": true});
  }
});
app.get('/logout', function(req, res){
  // TODO: Byt till riktig logger
  req.session.destroy(function(err){if(err)console.log(err)});
  res.redirect('/');
});


app.get('/om', function(req, res){
  res.render('om');
});

// TODO: Ska vi ha någon annan kod för att hantera denna del av sidan?
// Kommenterar bort denna kod för tillfället.
/*
app.get('/info', function(req, res){
  res.render('info');
});
*/

// TODO: Planera om denna del och flytta DB-requests till API
app.get(['/settings','/settings/:page'], function(req, res){
  if (req.session.user != null) {
    if (req.params.page != null && isInArray(req.params.page, settingsPages)) {
      res.render("settings/"+req.params.page, {user: req.session.user});
    } else {
      res.redirect("/settings/profile");
    }
  } else {
    res.redirect("/");
  }
});

// TODO: Planera och skriv om denna del
app.get('/:elm', function(req, res, next){
  if (isInArray(req.params.elm, elements)) next();
  else res.render("element/show_element_not_found", {element: req.params.elm});
}, function(req, res){
  // Check if element is published
  /*
  db.collection("elements").find({element: req.params.elm}, {fields: {published: 1}}, function(err, data){
    if (err) console.log(err);
    if (data.published) res.render('element/show_element', {element: req.params.elm});
    else res.render('element/show_element_incomplete');
  });*/
  if (req.session.user != null) {
    res.render("index", {element: req.params.elm, user: req.session.user});
  } else {
    res.render("index", {element: req.params.elm});
  }
});

// TODO
// API aktiga funktioner: få elementdata i JSON (typ direkt från Mongo), vilka som har hjälpt till, och lite annat smått och gott.
// Vi bör lägga till system för att verifiera vem som frågar efter information och kanske lägga till rate-limiting.
// Denna kod ska flyttas till API modulen
// Kolla in https://github.com/Grundamnen-SE/pesys/issues/9
app.get('/api/element/:elm', function(req, res){
  if (isInArray(req.params.elm, elements)) {
    db.collection('elements').findOne({element: req.params.elm}, {}, function(err, data){
      if (err) console.log(err);
      if (data == null) {
        res.send({"error": "element data not found", "code": 56});
      } else {
        var options = {fields:{password:0, _id: 0}};
        var users = [db.collection('users').findOne({id: data.author}, options), db.collection('users').findOne({id: data.lasteditedby}, options), db.collection('users').findOne({id: data.approvedby}, options)];
        for (var i = 0; i < data.alleditors.length; i++) {
          users.push(db.collection('users').findOne({id: data.alleditors[i]}, options));
        }
        Promise.all(users).then(function(allData){
          var author = allData[0];
          var lasteditedby = allData[1];
          var approvedby = allData[2];
          var alleditors = [];
          for (var i = 3; i < allData.length; i++) {
            alleditors.push(allData[i]);
          }
          data.author = author;
          data.lasteditedby = lasteditedby;
          data.approvedby = approvedby;
          data.alleditors = alleditors;
          if (req.session.user != null && req.session.user.logged_in) {
            res.send({logged_in: true, data: data});
          } else {
            res.send({data: data});
          }
        });
      }
    });
  } else {
    res.send({"error": "the value specified as an element is not an element"});
  }
});

module.exports.app = app;
