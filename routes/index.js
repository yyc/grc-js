var express = require("express");
var router = express.Router();
var GRC = require("../lib/grc.js");

/* GET home page. */
router.get("/", function(req, res, next) {
  res.render("index", { title: "Express" });
});

/* GET postcode */
router.get("/postcode/:postal_code", function(req, res, next) {
  var postal_code = req.params["postal_code"];
  // var data = req.query["data"] || "grc+cdc+sso";
  if (!GRC.isValidPC(postal_code)) {
    res.status(500).send({
      error: 500,
      message: "Invalid postal code!"
    });
    return;
  }

  GRC.allDataFor(postal_code)
    .then(allData => {
      res.send(allData);
    })
    .catch(err => {
      console.error(err);
      res.status(500).send({
        error: 500,
        message: err
      });
    });
});

router.post("/postcodes", function(req, res, next) {
  var postcodes = req.body;
  if (!Array.isArray(postcodes)) {
    res.status(500).send({
      error: 500,
      message: "Invalid array!"
    });
    return;
  }
  postcodes = postcodes.filter(GRC.isValidPC);
  var pcPromises = postcodes.map(postal_code => {
    return GRC.allDataFor(postal_code).then(allData =>
      Promise.resolve({
        postal_code,
        allData
      })
    );
  });
  Promise.all(pcPromises).then(responses => {
    var response = {};
    responses.forEach(result => {
      response[result.postal_code] = result.allData;
    });
    res.send(response);
  });
});
router.get("/cdcgrc", function(req, res, next) {
  GRC.getHierarchy().then(hierarchy => {
    res.send(hierarchy);
  });
});

/*router.post('/projects/:filename', function(req, res, next){
    console.log(req.body);
    res.render(req.params.filename, req.body);
})*/
module.exports = router;
