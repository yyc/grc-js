var express = require("express");
var router = express.Router();
var data = require("../lib/grc.js");

/* GET home page. */
router.get("/", function(req, res, next) {
  res.render("index", { title: "Express" });
});

/*router.post('/projects/:filename', function(req, res, next){
    console.log(req.body);
    res.render(req.params.filename, req.body);
})*/

module.exports = router;
