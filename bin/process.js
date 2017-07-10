// Used to do a pass through all the postal codes to build up a cache in redis

var GRC = require("../lib/grc");
var postal_codes = require("./postal_codes");

async function process(postal_codes) {
  for (var i = 0; i < postal_codes.length; i++) {
    let postal_code = postal_codes[i];
    try {
      let data = await GRC.allDataFor(postal_code);
      console.log(
        `${postal_code},${data.grc},${data.cdc},${data.div},${data.sso}`
      );
    } catch (err) {
      console.error(err);
    }
  }
}

// Process in 4 queues
var length = postal_codes.length;
var piece = Math.floor(length / 4);

for (var i = 0; i < 4; i++) {
  let slice = postal_codes.slice(i * piece, (i + 1) * piece);
  console.log(`starting slice ${i} at ${slice[0]}`);
  process(slice);
}
