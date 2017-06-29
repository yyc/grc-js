var GRC = require("./grc");
const Redis = require("ioredis");
// Used to process the hierarchy information after I mistakenly forgot
if (process.env.REDIS_URL) {
  var redis = new Redis(process.env.REDIS_URL);
} else {
  var redis = new Redis();
}

async function hierarchy() {
  var postal_codes = await redis.keys("[0-9][0-9][0-9][0-9][0-9][0-9]");
  for (var i = 0; i < postal_codes.length; i++) {
    let postal_code = postal_codes[i];
    try {
      let data = await redis.hgetall(postal_code);
      if (data.cdc && data.grc) {
        redis.sadd(data.cdc, data.grc);
        console.log(`${data.cdc} -> ${data.grc}`);
      }
    } catch (err) {
      console.error(err);
    }
  }
}

hierarchy();
