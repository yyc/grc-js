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

module.exports = router;
