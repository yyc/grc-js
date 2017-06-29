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
  redis.multi().sadd("grcs", grc).sadd("cdcs", cdc).sadd(cdc, grc).exec();

  return {
    cdc,
    grc
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
  return /^[1-9][0-9]{5}$/.test(str);
}

function dataFnFor(type) {
  return async pc => {
    if (!isValidPC) {
      return Promise.reject();
    }
    var response = await redis.hget(pc, type);
    if (response == null || response.trim() == "") {
      // We need to fetch this from the API
      if (type == "grc" || type == "cdc") {
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

function allDataFor(postal_code) {
  var promises = [
    dataFnFor("sso")(postal_code),
    dataFnFor("grc")(postal_code).then(async grc => {
      var cdc = await dataFnFor("cdc")(postal_code);
      return Promise.resolve([grc, cdc]);
    })
  ];
  //[sso,[grc,cdc]]
  return Promise.all(promises).then(result => ({
    sso: result[0],
    grc: result[1][0],
    cdc: result[1][1]
  }));
}

module.exports = {
  grcFor,
  cdcFor,
  ssoFor,
  allDataFor,
  isValidPC
};

fetchGRCCDC(390283);
