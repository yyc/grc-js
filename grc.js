const Redis = require("ioredis");
const fetch = require("node-fetch");
const cheerio = require("cheerio");

//fetch("https://google.com").then(console.log);

var redis = new Redis();
fetch.Promise = Promise;

// This is called after a cache miss
async function fetchGRCCDC(postal_code) {
  if (!isValidPC(postal_code)) {
    return Promise.reject();
  }
  var result = await fetch(
    "http://sis.pa-apps.sg/NASApp/sim/SearchResults.jsp",
    {
      method: "POST",
      body: `intEdtPostalCode=${postal_code}&flag=a`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: "http://sis.pa-apps.sg/NASApp/sim/AdvancedSeachResults1.jsp",
        Origin: "http://sis.pa-apps.sg",
        Host: "sis.pa-apps.sg",
        Cookie: "dis-request-id=efe4bb17ac1be3ac5cc1e5391d9ed12f",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate",
        "Accept-Language": "en-US,en;q=0.8,zh-CN;q=0.6,zh;q=0.4",
        connection: "keep-alive"
      }
    }
  );
  $ = await result.text().then(txt => Promise.resolve(cheerio.load(txt)));
  var cdc = $("tr").eq(5).children("td").eq(1).text().trim();
  var grc = $("tr").eq(13).children("td").eq(1).text().trim();

  await redis
    .multi()
    .hset(postal_code, "cdc", cdc)
    .hset(postal_code, "grc", grc)
    .exec();
  return {
    cdc,
    grc
  };
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
    var json = await redis.hgetall(pc);
    if (json == null || Object.keys(json) == 0) {
      // We need to fetch this from the API
      return fetchGRCCDC(pc).then(obj => {
        obj[type];
      });
    } else {
      return Promise.resolve(json[type]);
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

dataFnFor("grc")("138593").then(console.log);
