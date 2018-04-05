
var express = require('express');
var router = express.Router();
var multer = require('multer'),
  bodyParser = require('body-parser'),
  path = require('path');
var fs = require('fs');
var moment = require("moment");
var numeral = require("numeral");


console.log('picture controller is loaded...');

//this is the picture_controller.js file
//really /picture
router.get('/', function (req, res) {
  var group_name = req.params.group_name;
  //res.render('../app/views/camera', { groupName: group_name });
  console.log("at the /picture");
  req.session.maxPictures = 3;
  var isMaxReached;
  if ( req.session.numPic >= req.session.maxPictures ) {
    isMaxReached= true;
  } else {
    isMaxReached = false;
  };
  console.log("num pic = " + req.session.numPic );
  console.log("max pic = " + req.session.maxPictures );
  console.log( "stop=" + isMaxReached );
  res.render('../app/views/users/camera', {
    timerInterval : 30,
    maxPics : req.session.maxPictures,
    numPic : req.session.numPic,
    commStopAuto: isMaxReached,
    commTakeAPict : false
  } );
});


router.post('/create', multer({ dest: './app/public/uploads/' }).single('upl'), function (req, res) {
  console.log('did a post inside of api routes');
  console.log(req.file);
  if (!req.file) {
    console.log("No file received");
    return res.send({
      success: false
    });

  } else {
    console.log('file received');
    return res.send({
      success: true
    })
  }
});


router.post('/create-img', function (req, res) {
  console.log("\n\n from upload");

  //console.log( Object.keys(req.body)[0]);
  var img = "" + Object.keys(req.body)[0];
  //take out the spaces and replace them with +'s
  img = img.split(' ').join('+');

  var ext = img.split(';')[0].match(/jpeg|png|gif/)[0];
  // strip off the data: url prefix to get just the base64-encoded bytes
  var data = img.replace(/^data:image\/\w+;base64,/, "");
  var buf = new Buffer(data, 'base64');

  var uploadFile = __dirname;
  var appWordLoc = uploadFile.indexOf("app");
  //console.log("app word loc=" + appWordLoc);
  var subDir = uploadFile.substr(0, appWordLoc);
  //console.log("upload dir=" + subDir );

  var timeStamp = moment().unix();
  //uploadFile = uploadFile.substr(0, newLen) + '/public/uploads/' + "Audit" + timeStamp + ".png";
  var uploadFile = subDir + 'app/public/uploads/' + "Audit" + timeStamp + ".png";

  console.log("upload file = " + uploadFile );

  fs.writeFile(uploadFile, buf, function (err) {
    if (err) { 
      console.log("error writing image = " + err);
    } else {
      console.log("file written");
    };
  });

  req.session.numPic = req.session.numPic + 1;

  //return success ... add other stuff later on
  res.send({
    success: true
  });

});


module.exports = router;
