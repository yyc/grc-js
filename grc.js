const Redis = require("ioredis");
const fetch = require("node-fetch");
const cheerio = require("cheerio");

//fetch("https://google.com").then(console.log);

var redis = new Redis();
fetch.Promise = Promise;

// This is called after
async function fetchGRCCDC(postal_code) {
  if (!isValidPC(postal_code)) {
    return Promise.reject();
  }
  var result = await fetch(
    "http://sis.pa-apps.sg/NASApp/sim/SearchResults.jsp",
    {
      method: "POST",
      body: `intEdtPostalCode=${postal_code}`
    }
  );
  $ = await result.text().then(txt => Promise.resolve(cheerio.load(txt)));
  console.log($("tr").html());
}

// Just checking if it's a 6-digit number.
// We can do better, but the rules https://en.wikipedia.org/wiki/Postal_codes_in_Singapore
// are subject to change, and we don't want to have to update this every time.
function isValidPC(postal_code) {
  // Converts it to a string
  var str = (postal_code + "").trim();
  return /^[1-9][0-9]{5}$/.test(str);
}

function dataFnFor(type) {
  return async pc => {
    if (!isValidPC) {
      return Promise.reject();
    }
    var json = await redis.get(pc);
    if (json == null) {
      // We need to fetch this from the API
      await fetchGRCCDC(pc);
    }
  };
}

function allDataFor() {}
module.exports = {
  grcFor: dataFnFor("grc"),
  cdcFor: dataFnFor("cdc"),
  ssoFor: dataFnFor("sso"),
  allDataFor,
  isValidPC
};

dataFnFor("sso")("659248");
