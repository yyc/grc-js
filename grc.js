var Redis = require("ioredis");
var fetch = require("node-fetch");

//fetch("https://google.com").then(console.log);

var redis = new Redis();

function fetchGRCCDC(postal_code) {}

// Just checking if it's a 6-digit number.
// We can do better, but the rules https://en.wikipedia.org/wiki/Postal_codes_in_Singapore
// are subject to change, and we don't want to have to update this every time.
function isValidPC(postal_code) {
  // Converts it to a string
  var str = (postal_code + "").trim();
  return /^[1-9][0-9]{5}$/.test(str);
}
