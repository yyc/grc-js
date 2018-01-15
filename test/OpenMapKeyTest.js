const should = require("should");
const OpenMapKey = require("./../lib/OpenMapKey");

it("should get the key properly", done => {
  OpenMapKey.initialize()
    .catch(err => {
      console.error(err);
      should.not.exist(err);
      done();
    })
    .then(res => {
      should.exist(OpenMapKey.getKey());
      done();
    });
});
