

var express = require('express');
var router  = express.Router();



//this is the ApplicationController.js file
router.get('/', function(req,res) {
  console.log("hit the main route");
  res.render('../app/views/index');
});

console.log('application controller loaded');
module.exports = router;
