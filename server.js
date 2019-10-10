"use strict";


// Let's begin by setting out our Node dependencies:
const express = require("express");
// We'll use the body-parser module to make it easy to access submitted form content in req.body:
const bodyParser = require("body-parser");
// We'll use Helmet.js to help secure our express app by setting various HTTP headers:
const helmet = require("helmet");
// To keep things tidy, we're keeping our route-handling middleware in a separate file/module, so let's require it here so that our server can call the routes:
const apiRoutes = require("./routes/api.js");


// With our dependencies available to us, we'll instantiate our express server...
const app = express();
// ... and tell it to use body-parser...
app.use( bodyParser.json() );
app.use( bodyParser.urlencoded({ extended: true }) );
// ... as well as to use helmet. Helmet's contentSecurityPolicy module isn't loaded by default, so let's make sure to include it in our options:
    // USER STORY 1: Set the content security policies to only allow loading of scripts and css from your server.
    // In order to be able to embed the project (e.g. in my portfolio), we'll also need to disable the frameguard module, which loads by default:
app.use( helmet({
  csp: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "fonts.googleapis.com"]
    }
  },
  frameguard: false
}));



// (For freeCodeCamp's testing suite for this project, we need to have the following...
const cors = require("cors");
app.use(cors({origin: "*"}));
const fccTestingRoutes = require("./routes/fcctesting.js");
const runner = require("./test-runner");
// ... END of freeCodeCamp testing dependencies.)



// With our server all set up, we'll tell it where to store public files (e.g. CSS, images, client-side JS):
app.use("/public", express.static(process.cwd() + "/public"));

// Next, we'll define our homepage:
app.route("/")
  .get(function (req, res) {
    res.sendFile(process.cwd() + "/views/index.html");
  });


// For tidiness' sake, we're keeping all of our routes in a separate file/module (which we've required in our dependencies already). The freeCodeCamp test-suite routes
// are similarly saved in a separate file/module. Let's make them all accessible to our server:

// For FCC testing purposes...
fccTestingRoutes(app);
// ... END of freeCodeCamp testing routes.

// ... and our own routes:
apiRoutes(app);


// Finally, our last route will be our catch-all 404 route, which will get triggered if none of the routes above it have been triggered:
app.use(function(req, res, next) {
  res.status(404)
    .sendFile(process.cwd() + "/views/404.html");
});


// With all of our routes ready, we'll make sure that our app is "alive" and listening for incoming requests...
app.listen(process.env.PORT, function () {
  // ... and print a confirmation message to our console so that we can easily check that our app is working correctly:
  console.log("Listening on port " + process.env.PORT);
  
  // If we set the environmental variable NODE_ENV="test", the freeCodeCamp Mocha-Chai test suite will launch:
  if(process.env.NODE_ENV==="test") {
    console.log("Running Tests...");
    setTimeout(function () {
      try {
        runner.run();
      } catch(e) {
        let error = e;
          console.log("Tests are not valid:");
          console.log(error);
      }
    }, 5000);
  }  // END of freeCodeCamp test suite
  
});  // END of app.listen()




// (For freeCodeCamp testing...
module.exports = app;
// ... END of freeCodeCamp testing export.)