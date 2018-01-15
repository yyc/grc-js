require("dotenv").config();
const should = require("should");
const grc = require("./../lib/grc");

var compData = {};
it("should initiate redis connection correctly", done => {
  should.exist(grc.redis);
  done();
});
it("should retrieve SSO for a given postal code", () => {
  return grc
    .fetchSSO(119077)
    .catch(err => {
      console.error(err);
      should.not.exist(err);
    })
    .then(ssoName => {
      should.exist(ssoName);
      ssoName.should.not.equal("");
      compData.sso = ssoName;
    });
});
it("should retrieve CDC/GRC for a given postal code", () => {
  return grc
    .fetchGRCCDC(119077)
    .catch(err => {
      console.error(err);
      should.not.exist(err);
    })
    .then(data => {
      should.exist(data);
      should.exist(data.cdc);
      data.cdc.should.not.equal("");
      should.exist(data.grc);
      data.grc.should.not.equal("");
      should.exist(data.div);
      data.div.should.not.equal("");
      Object.assign(compData, data);
    });
});
it("should quickly retrieve cached info", () => {
  return grc
    .allDataFor(119077)
    .catch(err => {
      console.error(err);
      should.not.exist(err);
    })
    .then(allData => {
      allData.should.deepEqual(compData);
    });
}).timeout(100);
