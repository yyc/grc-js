const Redis = require("ioredis");
const fetch = require("node-fetch");
const cheerio = require("cheerio");
const OpenMapKey = require("./OpenMapKey");

//fetch("https://google.com").then(console.log);

if (process.env.REDIS_URL) {
  var redis = new Redis(process.env.REDIS_URL);
} else {
  var redis = new Redis();
}
fetch.Promise = Promise;

var openMapKey = undefined;

function notEmpty(a) {
  return a != "" && a;
}

// This is called after a cache miss
async function fetchGRCCDC(postal_code) {
  if (!isValidPC(postal_code)) {
    return Promise.reject();
  }
  var result = await fetch(
    "https://sis.pa-apps.sg/NASApp/sim/AdvancedSearch.aspx",
    {
      method: "POST",
      body: `intEdtPostalCode=${postal_code}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: "https://www.pa.gov.sg",
        Origin: "https://www.pa.gov.sg",
        Cookie: "gsScrollPos-3060=",
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
  var txt = await result.text();
  // console.log(txt);
  var $ = cheerio.load(txt);
  var cdc = $("tr").eq(5).children("td").eq(1).text().trim();
  var grc = $("tr").eq(13).children("td").eq(1).text().trim();
  var div = $("tr").eq(14).children("td").eq(1).text().trim();
  console.log(cdc, grc, div, "RESULTS");
  await redis
    .multi()
    .hset(postal_code, "cdc", cdc)
    .hset(postal_code, "grc", grc)
    .hset(postal_code, "div", div)
    .exec();
  redis
    .multi()
    .sadd("grcs", grc)
    .sadd("cdcs", cdc)
    .sadd("divs", div)
    .sadd(cdc, grc)
    .sadd(grc, div)
    .exec();

  return {
    cdc,
    grc,
    div
  };
}

async function fetchSSO(postal_code) {
  if (!isValidPC(postal_code)) {
    return Promise.reject();
  }
  var token = await OpenMapKey.getKey();
  var result = await fetch(
    `https://developers.onemap.sg/msfservices/getSocialService?postal=${postal_code}&dist=10&token=${token}`
  );
  var results = await result
    .json()
    .then(json => Promise.resolve(json.SrchResults));
  // results aren't sorted!
  if (results == undefined || results.length < 2) {
    var sso = undefined;
  } else {
    // Filter out the first result (it's a header thing)
    // Then find the closest SSO in the list
    var closestSSO = results
      .slice(1)
      .reduceRight(
        (shortest, current) =>
          shortest["Vertical_Distance"] > current["Vertical_Distance"]
            ? current
            : shortest
      );

    // Filter out the SSO@
    var sso = closestSSO["NAME"].replace("Social Service Office@", "");
  }

  await redis.hset(postal_code, "sso", sso);
  redis.sadd("ssos", sso);
  return sso;
}

// Just checking if it's a 6-digit number.
// We can do better, but the rules https://en.wikipedia.org/wiki/Postal_codes_in_Singapore
// are subject to change, and we don't want to have to update this every time.
function isValidPC(postal_code) {
  // Converts it to a string
  var str = (postal_code + "").trim();
  return /^[0-9]{6}$/.test(str);
}

function dataFnFor(type) {
  return async pc => {
    if (!isValidPC) {
      return Promise.reject();
    }
    var response = await redis.hget(pc, type);
    if (response == null || response.trim() == "") {
      // We need to fetch this from the API
      if (type == "grc" || type == "cdc" || type == "div") {
        return fetchGRCCDC(pc).then(obj => Promise.resolve(obj[type]));
      } else if (type == "sso") {
        return fetchSSO(pc);
      }
    } else {
      return Promise.resolve(response);
    }
  };
}
var grcFor = dataFnFor("grc");
var cdcFor = dataFnFor("cdc");
var ssoFor = dataFnFor("sso");
var divFor = dataFnFor("div");

function allDataFor(postal_code) {
  var promises = [
    dataFnFor("sso")(postal_code),
    dataFnFor("grc")(postal_code).then(async grc => {
      var cdc = await dataFnFor("cdc")(postal_code);
      var div = await dataFnFor("div")(postal_code);
      return Promise.resolve([grc, cdc, div]);
    })
  ];
  //[sso,[grc,cdc]]
  return Promise.all(promises).then(result => ({
    sso: result[0],
    grc: result[1][0],
    cdc: result[1][1],
    div: result[1][2]
  }));
}

async function getHierarchy() {
  var cdcs = await redis.smembers("cdcs");
  var promises = cdcs.filter(notEmpty).map(cdc => {
    return redis.smembers(cdc).then(grcs => Promise.resolve({ cdc, grcs }));
  });
  var results = await Promise.all(promises);

  var response = {};
  results.forEach(result => {
    response[result.cdc] = result.grcs;
  });
  return response;
}

module.exports = {
  grcFor,
  cdcFor,
  ssoFor,
  divFor,
  allDataFor,
  isValidPC,
  getHierarchy,
  //include for testing
  redis,
  fetchGRCCDC,
  fetchSSO
};
