// To keep our app tidy, and because some of these functions will get reused depending on if we're looking at one stock or comparing two of them,
// we'll create our own module/middleware by saving all of our price-fetching and like-CRUDing functions in this separate file.



// We'll be comparing stocks and keeping track of their "likes", for which we'll need a database:
const MongoClient = require("mongodb").MongoClient;
// We'll also need to get stock price information from an external server with GET requests and we'll do this with the Request package, which is a simplified HTTP client:
const request = require("request");



// All of our functions will get exported, making them accessible outside of this file and easily retrievable with dot notation (e.g. tickerFunctions.getStockData() ):



// Let's start by writing the function for retrieving the data about a given stock based on its ticker symbol:
exports.getStockData = function(ticker, callback) {
  // We'll first put together the Alpha Vantage API URL string for the given ticker symbol:  
  let url = "https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&apikey=" + process.env.ALPHA_VANTAGE_API_KEY + "&interval=1min&symbol=" + ticker;
  
  // With our URL ready, we'll make a GET request using our request middleware: 
  request.get(url, (err, res, body) => {
    // We'll first handle any errors that might arise from the async activity:
    if (err) return console.log("Error while GETting stock information from Alpha Vantage:", err);
    
    // If there are no errors, we'll dig into the response by parsing the JSON string and isolating the most recent data for the given stock:
    let data = JSON.parse(body)["Time Series (1min)"];
    // Before going any further, we'll make sure that our request to the external API actually returned data (i.e. it isn't undefined). If not, then we'll we won't go any
    // further and simply return the callback with an error message. By making the message an object and giving it a property "Error", we'll be able to catch it in our 
    // callback function in routes/api.js:
    if (data == undefined) {
      return callback( {"Error": "There was a problem retrieving data for the ticker symbol '" + ticker + "'. It may be invalid, or the stock-price API at Alpha Vantage may be overwhelmed with requests (maximum of 5 requests per minute). Please check your ticker symbol and try again."} );
    };
    // If the data is good, we'll extract the most recent closing stock price, parsing it from a string to a float along the way:    
    let tickerPrice = parseFloat( data[Object.keys(data)[0]]["4. close"] );
    
    // Finally, we'll return the results through our callback function, limiting the price to two decimal points (and making it a string), as per the user stories:
    callback({
      "ticker": ticker,
      "price": tickerPrice.toFixed(2)
    });
  
  });  // END of request()  
  
};  // END of getStockData()




// Let's now write a function for checking the number of likes of the stock(s) submitted in the form:
exports.getLikeData = function(ticker, reqIpAddress, likes, callback) {  
  // We're going to get sneaky and rather than keep track of likes with a counter, we're going to keep track of IP addresses that have liked the ticker/stock. Whenever the
  // "like" checkbox for the given stock was ticked (i.e. the "likes" parameter passed to this function =true), we'll pass the reqIpAddress to our Mongo database. However,
  // whenever likes=false, we'll pass a dummy IP address to our Mongo database. Later on, to find out how many likes a given stock has, we'll count the number of IP
  // addresses it has (if the dummy IP address is present, we'll subtract 1 from the count). Doing this might sound a bit convoluted, but it actually saves us from trying
  // to have conditional updates in our Mongo query (not possible) or having to run two Mongo queries (one to find the stock and see if the IP address is already present,
  // and another query to update the stock if the IP address is new).
  
  // Let's make all of this happen:
  // We'll start by determining if we should add the actual IP address or a dummy value, depending on if the stock was actually "liked" in the form:
  let ipAddressToAdd;
  (likes == true) ? (ipAddressToAdd = reqIpAddress) : (ipAddressToAdd = "dummy IP address" )

  // With our sneakiness ready, let's fire up our MongoDB connection:
  MongoClient.connect(
    process.env.MONGO_DB,
    { useNewUrlParser: true },
    function (err, database) {
      // We'll first handle any errors that might arise from the remote/async activity...
      if (err) return console.log("Error connecting to the Mongo database", err);
      // ... and provide ourselves with a confirmation message about our connection to the DB:      
      console.log("Successfully connected to the MongoDB!");
      
      // Let's now search the database for a document/entry matching our ticker symbol. By using findOneAndUpdate() we'll update any existing stock in our collection,
      // and if there isn't a matching ticker/stock in our collection, by setting the option upsert=true, we'll automatically create a new document/entry in the
      // collection. By using Mongo's $addToSet update method, we'll be able to add IP addresses, but only if the IP address isn't already present in the given array of 
      // the document. Later, we'll count the number of IP addresses (minus 1 if there's a dummy IP address present in the array) to find out how many likes the stock has.
          // N.B. the MongoDB documentation for version 4.0 states that the option returnNewDocument=true should be used in order to return the updated document from 
          // the collection rather than the original. In Node MongoDB (version 3.2.3 is the most recent as of April 24, 2019), the correct option is returnOriginal=false
      database.db("test").collection("stock-price-checker").findOneAndUpdate(
        {ticker: ticker},
        {
          $addToSet: {ipAddresses: ipAddressToAdd}
        },
        {
          upsert: true,
          returnOriginal: false
        },
        (err, stock) => {
          // Let's handle any errors that might arise from the remote/async nature of working with a database:
          if (err) return console.log("Error with findOneAndUpdate():", err);
          
          // With that done, all that's left to do is pass the count of IP addresses to our callback function, making sure to substract 1 if the dummy IP address is present:
          // If no dummy IP address is present in the array (i.e. .indexOf(thingWe'reLookingFor) = -1)...
          if ( stock.value.ipAddresses.indexOf("dummy IP address") == -1 ) {
            // ... then we can return the length of the array to our callback as the like count...
            callback({
              ticker: ticker,
              likes: stock.value.ipAddresses.length
            });
          }
          // ... and if the dummy IP address IS present in the array...
          else {
            // ... then we can return the length of the array, minus 1, to our callback as the like count...
            callback({
              ticker: ticker,
              likes: stock.value.ipAddresses.length - 1
            });
          };
          
        }
      );  // END of findOneAndModify()
      
    
    });  // END of .connect()
  
};  // END of .getLikeData()