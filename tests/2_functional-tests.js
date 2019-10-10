/*
*
*
*       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
*       -----[Keep the tests in the same order!]-----
*       (if additional are added, keep them at the very end!)
*/

// We'll be using Chai.js as our assertion framework...
const chai = require("chai");
// ... and using its TDD assertion libraries ...
const assert = chai.assert;
// ... to which we'll tack on the chai-http module so that we can carry out our integration/functional tests...
const chaiHttp = require("chai-http");
// ... which we'll tell chai to use:
chai.use(chaiHttp);
// We'll also define what our server is (in our case server.js) to avoid repetition in each of our tests:
const server = require("../server");




suite("Functional Tests", function() {
    
    suite("GET /api/stock-prices => stockData object", function() {
      
      // The test suite fires the tests in too rapid a succession, causing the different tests to bombard the stock-price API we're using (Alpha Vantage), which
      // is limited to 5 requests per minute for free accounts. To resolve this issue, we'll use afterEach to get Mocha to pause for 20 seconds between each
      // of the Chai tests in the test-suite so as to ensure that we're making less than 5 requests per minute to Alpha Vantage's API:
      afterEach(function(done) {
        this.timeout(30000)  // We'll set the timeout for this "test" to 10 seconds longer than our pause length so that our afterEach doesn't risk timing out and failing
        
        // Each time our function is called, we'll have it wait 20 seconds before reporting to the console and finishing, thereby allowing the next test to run:
        setTimeout( function() {
          console.log("Paused for 20 seconds to not exceed Alpha Vantage's API's limit of 5 requests per minute.");
          
          done();
        }, 20000);
      });  // END of afterEach() "pauser"
      
      
      
      // N.B. The chai tests don't pass headers unless told to do so. Without the headers, our app won't be able to identify the user's IP address and will
      // hang up with an error when trying to pull the IP substring out of the header "x-forwarded-for". To resolve this testing issue, we have to use Chai's ".set()"
      // method to pass a header. Here, we've passed a dummy IP address in the same format as a regular x-forwarded-for header to every one of our tests:
      
      // Also, for the most accurate test results, the Mongo database collection should be cleared before running a round of tests.
      
      
      // Our first test:
      test("1 stock", function(done) {
        
       chai.request(server)
        .get("/api/stock-prices")
        .set("x-forwarded-for", "123.45.678.90,::ffff:10.10.11.107,::ffff:10.10.10.132")
        .query( {ticker: "ndaq"} )
        .end(
         function(err, res){
           console.log("res.text is:", res.text);
           
           assert.equal(res.status, 200);
           assert.isObject(res.body);
           assert.property(res.body, "stockData");
           assert.equal(res.body.stockData.stock, "NDAQ");
           assert.property(res.body.stockData, "price");
           assert.property(res.body.stockData, "likes");
           
           done();
           
        });
      });  // END of "1 stock" test
      
      
      
      
      test("1 stock with like", function(done) {
        
        chai.request(server)
          .get("/api/stock-prices")
          .set("x-forwarded-for", "123.45.678.90,::ffff:10.10.11.107,::ffff:10.10.10.132")
          .query( {ticker: "ndaq", like: "true"} )
          .end (
          function(err, res) {
            assert.equal(res.status, 200);
            assert.isObject(res.body);
            assert.property(res.body, "stockData");
            assert.equal(res.body.stockData.stock, "NDAQ");
            assert.property(res.body.stockData, "price");
            assert.property(res.body.stockData, "likes");
            assert.equal(res.body.stockData.likes, 1, "Remember to reset the database collection between assertion test rounds");
            
            done();
          });
      });  // END of "1 stock with like"
      
      
      
      
      
      test("1 stock with like again (ensure likes arent double counted)", function(done) {
        
        chai.request(server)
          .get("/api/stock-prices")
          .set("x-forwarded-for", "123.45.678.90,::ffff:10.10.11.107,::ffff:10.10.10.132")
          .query( {ticker: "goog", like: "true"} )
          .end (
          function(err, res) {
            assert.equal(res.status, 200);
            assert.isObject(res.body);
            assert.property(res.body, "stockData");
            assert.equal(res.body.stockData.stock, "GOOG");
            assert.property(res.body.stockData, "price");
            assert.property(res.body.stockData, "likes");
            assert.equal(res.body.stockData.likes, 1, "Remember to reset the database collection between assertion test rounds");
                        
            done();
          });        
      });  // END of "1 stock with like again (ensure likes arent double counted)"
      
      
      
      
      
      test("2 stocks", function(done) {
        
        chai.request(server)
          .get("/api/stock-prices")
          .set("x-forwarded-for", "123.45.678.90,::ffff:10.10.11.107,::ffff:10.10.10.132")
          .query( {ticker: ["goog", "msft"]} )
          .end (
          function(err, res) {
            assert.equal(res.status, 200);
            assert.isObject(res.body);
            assert.property(res.body, "stockData");
            assert.isArray(res.body.stockData);
            assert.equal(res.body.stockData[0].stock, "GOOG");
            assert.equal(res.body.stockData[1].stock, "MSFT");
            assert.property(res.body.stockData[0], "price");
            assert.property(res.body.stockData[0], "rel_likes");
            assert.property(res.body.stockData[1], "price");
            assert.property(res.body.stockData[1], "rel_likes");
            // And a little extra test to make sure that the relative likes values make sense (they should add up to zero):
            assert.equal(res.body.stockData[0].rel_likes + res.body.stockData[1].rel_likes, 0, "Remember to reset the database collection between assertion test rounds");
            
            done();
          });
      });  // END of "2 stocks"
      
      
      
      
      
      test("2 stocks with like", function(done) {
        
        chai.request(server)
          .get("/api/stock-prices")
          .set("x-forwarded-for", "123.45.678.90,::ffff:10.10.11.107,::ffff:10.10.10.132")
          .query( {ticker: ["goog", "msft"], like: "true"} )
          .end (
          function(err, res) {
            assert.equal(res.status, 200);
            assert.isObject(res.body);
            assert.property(res.body, "stockData");
            assert.isArray(res.body.stockData);
            assert.equal(res.body.stockData[0].stock, "GOOG");
            assert.equal(res.body.stockData[1].stock, "MSFT");
            assert.property(res.body.stockData[0], "price");
            assert.property(res.body.stockData[0], "rel_likes");
            assert.property(res.body.stockData[1], "price");
            assert.property(res.body.stockData[1], "rel_likes");
            // And a little extra test to make sure that the relative likes values make sense (they should still add up to zero):
            assert.equal(res.body.stockData[0].rel_likes + res.body.stockData[1].rel_likes, 0, "Remember to reset the database collection between assertion test rounds");
                        
            done();
          });
      });  // END of "2 stocks with like"
      
      
    });  // END of "GET /api/stock-prices => stockData object" test suite

});  // END of "functional tests" suite