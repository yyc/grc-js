const should = require("should");
const grc = require("./../lib/grc");

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
      done();
    })
    .then(ssoName => {
      should.exist(ssoName);
      done();
    });
});
it("should retrieve CDC/GRC for a given postal code", () => {
  return grc
    .fetchGRCCDC(119077)
    .catch(err => {
      console.error(err);
      should.not.exist(err);
      done();
    })
    .then(data => {
      should.exist(data);
      should.exist(data.cdc);
      should.exist(data.grc);
      should.exist(data.div);
      done();
    });
});
