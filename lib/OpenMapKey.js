const fetch = require("node-fetch");

var key = undefined;
var timeout = 0;
class OpenMapKey {
  static async initialize() {
    var response = await fetch(
      `https://developers.onemap.sg/msfservices/auth/get/getToken?email=${process
        .env.ONEMAP_EMAIL}&password=${process.env.ONEMAP_PASSWORD}`
    );
    var json = await response.json();
    key = json["access_token"];
    timeout = Date.parse(response.headers.get("Expires"));
  }

  static async getKey() {
    if (key == undefined || timeout > Date.now()) {
      await OpenMapKey.initialize();
    }
    return key;
  }
}

module.exports = OpenMapKey;
