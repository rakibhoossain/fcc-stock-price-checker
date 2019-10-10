/*
*
*
*       Complete the API routing below
*
*
*/

"use strict";

// We'll need to be able to call our stock-ticker functions from our routes, so let's require the functions here:
const stockFunctions = require("../handlers/stockHandler.js");



// To make our routes "importable" to our server.js file, we'll be exporting our routes (in this case there is only one) as a module:
module.exports = function (app) {
  
  // Whenever a form is submitted, it's a GET request to the /api/stock-prices endpoint, so let's write that route:
  app.route("/api/stock-prices").get(function (req, res){

    // We'll start by making sure that the required form fields were filled in by running some server-side form validation before supplying the user with hints...
    // ... for the single-stock form...
    if (req.query.ticker.length == 0) {
      return res.json("Please include a stock ticker before submitting the form.");
    }
    // ... as well as for the stock-comparison form:
    else if (Array.isArray(req.query.ticker) && req.query.ticker[0].length == 0 && req.query.ticker[1].length == 0) {
      return res.json("Please include two ticker symbols before submitting the form.");
    }
    else if (Array.isArray(req.query.ticker) && req.query.ticker[0].length == 0) {
      return res.json("Please include a first stock ticker symbol before submitting the form.");
    }
    else if (Array.isArray(req.query.ticker) && req.query.ticker[1].length == 0) {
      return res.json("Please include a second stock ticker symbol before submitting the form.");
    };


    // With our form validation done, let's organize our submitted ticker symbol(s). Because one form submits only one field with name=ticker, we receive it as a string,
    // whereas our stock-comparing form submits two name=ticker entries, which we receive as an array. Let's plan ahead and save our tickers as an array no matter what.
    // We'll also capitalize our tickers to keep our database tidy later on (i.e. avoid having, for example, msft, MSFT, msFT, Msft, etc. as separate entries in our
    // database collection when they're in fact all the same stock/ticker):
    let tickers = [];
    // We'll start with our stock-comparison tickers...
    if ( Array.isArray(req.query.ticker) ) {
      req.query.ticker.forEach( (ele) => {
        tickers.push(ele.toUpperCase());
      });
    }
    // ... and similarly prepare for our single-stock ticker:
    else {
      tickers.push(req.query.ticker.toUpperCase());
    };


    // We'll do one last piece of data validation: when the user clicks the "like" checkbox, our req.query will include like="true". However, if the checkbox in the form
    // is NOT clicked, our req.query will not have a "like" property. When the user has clicked the checkbox, we'll save the value as a boolean, and otherwise we'll default 
    // our like variable to false:
    let likeBoolean = Boolean(req.query.like) || false;

    // Finally, the user stories say that we can only have one like per IP address, so let's save the IP address of the user to a variable for later use:
    let ipAddress = req.headers["x-forwarded-for"].substring(0, req.headers["x-forwarded-for"].indexOf(","));
    
    
    
    // With all of our validation done, we're now ready to turn our attention to retrieving the stock prices and number of likes for each of our stocks.

    // Before we go ahead and call our price and like functions, we'll get ready to receive their data by writing a callback function that we'll use for returning the
    // results of the async stock-handling functions that we have written as a separate module in stockHandler.js. This callback function will need to prepare the JSON
    // response to the user, however, because both our function for GETting the stock price and our function for checking our database for likes are async activities 
    // that might have significant lag, we need to find a way to make sure that we have received the results from all of our functions before sending the res.JSON to the 
    // user. To achieve this, each time our callBack is called, we'll have it populate some empty variables. When the if statements in our callback function detect that
    // we've collected enough data in our variables, it'll finally prepare the response and send it to the user.
    
    // Here are our empty variables...
    let stockData = {};
    let priceData = {};
    let likeData = {};
    let rel_likesData = {};
    
    // ... and here's our callback function:
    const responseGenerator = function(data) {
      // We'll first check to see if the data is an error message (i.e. check to see if one of the keys is "Error"), and if it is, we'll won't go any further and simply
      // return the error message to the user as a JSON object:
      if ( "Error" in data ) return res.json(data.Error);
      
      // When we receive data in our callback function, it could be price data or it could be like data. We'll identify what the data is about by looking at its
      // properties (i.e. whether the data object has a "price" or "likes" property) and then we'll iterate through the data's key-value pairs and add them to the
      // appropriate object variable that we had defined earlier. The incoming data for price will be similar to: {ticker: "GOOG", price: "123.45"} and that for
      // likes will be similar to: {ticker: "GOOG", likes: 1}.
      if ( "price" in data ) {
        for (let key in data) {
          priceData[data.ticker] = data.price    // e.g. {GOOG: 123.45}
        };
      }
      else if ( "likes" in data ) {
        for (let ele in data) {
          likeData[data.ticker] = data.likes    // e.g. {GOOG: 2}
        };
      };
      
      
      
      // In cases where we have two stocks, the user story asks us to return the relative likes for each stock. So, each time our callback function is called and it
      // gets to this point, when we have two tickers (i.e. our tickers array has a length of 2), let's check if the likeData object is also two entries long, and if so,
      // we'll calculate the relative likes of the two stocks and save the values to our pre-defined rel_likes variable:
      if (tickers.length == 2 && Object.keys(likeData).length == 2) {
        // We'll iterate through the stocks we have in our likeData array...
        for (let stock in likeData) {
          // ... and we'll use the filter method and our tickers array to identify the name of the "other stock" at each iteration...
          let otherStock = tickers.filter( (ele) => ele != stock );
          // With both stock names in hand, its now easy for us to update the current stock's relative likes by subtracting the otherstock's number of likes from its own likes:
          rel_likesData[stock] = likeData[stock] - likeData[otherStock];
        };
      };  // END of relative likes generator
      
      
      
      // With our data properly sorted, it's time to check that our responseGenerator has received everything that we need. To do this, each time our responseGenerator callback
      // is called and it gets to this point, we'll use if/else statement to check if we have all the data that we need, and if we have everything, then we'll go ahead and
      // populate our response object:
      // ... when we have only one ticker/stock and there is price and like data present in our variables, then we know that we're ready to respond...
      if (tickers.length == 1 && Object.keys(priceData).length != 0 && Object.keys(likeData).length != 0) {
        // We'll go ahead and populate our stockData object...
        stockData.stock = data.ticker;
        stockData.price = priceData[data.ticker];
        stockData.likes = likeData[data.ticker];
        // ... and return it to the user:
        return res.json( {stockData} );
      }
      // ... when we have two tickers/stocks and there are two data entries in both priceData and likeData, then we know that we're ready to respond:
      else if (tickers.length == 2 && Object.keys(priceData).length == 2 && Object.keys(rel_likesData).length == 2) {        
        // We'll "resave" our stockData variable as an array rather than an object as the user stories ask us to return an array with two objects when comparing two
        // stock symbols:
        stockData = [];
        
        // As a small nice touch, we'll use the tickers array for our loop in order to make sure that the results we return to the user are in the same order as the
        // ticker symbols were submitted in the form (because objects are non-orderable, if we iterated using a for(x in Obj) loop, we'd risk flipping the order of the
        // tickers/stocks in our response):
        for (let i = 0; i < tickers.length; i++) {
          // For each stock, we'll create an object and push it to the stockData array...
          stockData.push({
            stock: tickers[i],
            price: priceData[tickers[i]],
            rel_likes: rel_likesData[tickers[i]]
          });
        };
        // ... before returning it to the user:
        return res.json( {stockData} );
        
      }  // END of if/else loop for populating our stockData object
      
    };


    
    
    

    // OUr validation is done, our input sorted and ready to go, and our callback is prepared, so let's go ahead and fetch the price and like data for our stock(s).
    // We'll make sure to pass our responseGenerator function as the callback in order to convert the data coming from our price and like functions into a JSON response:
    // ... if only one stock was submitted in the form...
    if (tickers.length == 1) {
      // ... we'll request the price and like data for that one stock:
      stockFunctions.getStockData(tickers[0], responseGenerator);
      stockFunctions.getLikeData(tickers[0], ipAddress, likeBoolean, responseGenerator);
    }
    // ... if two stocks where submitted in the form...
    else {
      // ... we'll request the like and price data for the first stock/ticker...
      stockFunctions.getStockData(tickers[0], responseGenerator);
      stockFunctions.getLikeData(tickers[0], ipAddress, likeBoolean, responseGenerator);
      // ... and for the second stock/ticker:
      stockFunctions.getStockData(tickers[1], responseGenerator);
      stockFunctions.getLikeData(tickers[1], ipAddress, likeBoolean, responseGenerator);
    };
  
  });  // END of GET request
    
}; // END of route handler module.export