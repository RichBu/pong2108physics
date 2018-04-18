//
//
//
var bcrypt = require('bcryptjs');
var express = require('express');
var router = express.Router();
var mmysql = require('mysql');
var connection = require('../config/connection.js');
var moment = require("moment");
var momentDurationFormatSetup = require("moment-duration-format");
var numeral = require("numeral");
var nodemailer = require('nodemailer');
var crypto = require('crypto');
var glob = require("glob");
var fs = require('fs');
var loginMod = require('../modules/login-mod.js');
var auditMod = require('../modules/auditLog-mod.js');


momentDurationFormatSetup(moment);  //setup formatting for durations


//setup with password
var transporterObj = {
  service: 'gmail',
  auth: {
    user: '2180pong@gmail.com',
    pass: 'ping2180'
  }
};


//session object is for both types, past history and scheduled

router.get('/1', function (req, res) {
  res.render('../app/views/admin/login');
});


router.post('/check', function (req, res) {
  var user_email_hash;
  var user_password_hash;
  var user_email;
  var user_password;

  if (req.body.user_email === undefined || req.body.user_email === null || req.body.user_email === "") {
    //this is a blank email
    return res.render('../app/views/admin/login');
  } else {
    //email has something in it
    user_email = req.body.user_email;
    user_email = user_email.trim();
    user_email_hash = loginMod.encrypt(user_email);
    if (req.body.user_password === undefined || req.body.user_password === null || req.body.user_password === "") {
      console.log("no match #2");
      return res.render('../app/views/admin/login');
    } else {
      //somthing typed in .. check it out
      user_password = req.body.user_password;
      user_password = user_password.trim();
      //**** make it read from the admin table */
      //first password is "mobipass01"
      password_compare = "$2a$10$LYnC1k8jC9A5CNbXmh72beAyx0PDvIrek4u4DArpatFNWz0fL.fQ2";
      bcrypt.compare(user_password, password_compare, function (err, result) {
        //the password matches
        if (user_email_hash === "0260d8a4f51548dcb386abf34fc0c4d2796675") {
          console.log("password match");
          return dispAuditPage(res);
        } else {
          //nothing right now, keep on checking
          //console.log("no match #3");
          //return res.render('../app/views/admin/login');
        };

      });
      password_compare = "$2a$10$.XWUoWrZR7UJTgFkcKT6zeu5bjNMU/ohUQFKyVy.O0GuuYhIzvxJ.";
      bcrypt.compare(user_password, password_compare, function (err, result) {
        //the password matches
        if (user_email_hash === "047bd4b5d70d1985eee8aff143" ||
          user_email_hash === "1468cda5f320158debaae2fd41c4" ||
          user_email_hash === "0270daa2d70d1985eee8aff143") {
          console.log("password match for hard coded list");
          return dispAuditPage(res);
        } else {
          console.log("no match from list");
          return res.render('../app/views/admin/login');
        };

      });

    };
  };
});


var getAllPicFiles = function () {
  //function to return all the picture files on the server
  var uploadFile = __dirname;
  var appWordLoc = uploadFile.indexOf("app");
  //console.log("app word loc=" + appWordLoc);
  var subDir = uploadFile.substr(0, appWordLoc);

  var pathUpload = subDir + "app/public/uploads/";
  var filesNoPath = [];
  var filesNewPath = [];

  function outputObj(_recNum, _imgSrc, _fileName) {
    this.recNum = _recNum;
    this.imgSrc = _imgSrc;
    this.fileName = _fileName;
  };

  var outputLine = [];

  //glob( subDir+'*.*', options, function (er, files) {
  glob(pathUpload + '*', function (er, files) {
    var outLen = files.length;
    for (var i = 0; i < outLen; i++) {
      var rootLoc = files[i].indexOf("uploads");
      var startLoc = rootLoc + 8;
      var endLoc = files[i].length;
      filesNoPath.push(files[i].substring(startLoc, endLoc));
    };

    for (var i = 0; i < outLen; i++) {
      outputLine.push(new outputObj(
        i,
        "/uploads/" + filesNoPath[i],
        filesNoPath[i]
      ));
      //console.log(outputLine[i]);
    };
  });
};


router.get('/files', function (req, res) {
  console.log("hit the files");

  var uploadFile = __dirname;
  console.log(uploadFile);
  var appWordLoc = uploadFile.indexOf("app");
  //console.log("app word loc=" + appWordLoc);
  var subDir = uploadFile.substr(0, appWordLoc);

  var pathUpload = subDir + "app/public/uploads/";
  var filesNoPath = [];
  var filesNewPath = [];

  function outputObj(_recNum, _imgSrc, _fileName) {
    this.recNum = _recNum;
    this.imgSrc = _imgSrc;
    this.fileName = _fileName;
  };

  var outputLine = [];

  console.log("\n files \n")

  //new location for image files
  //pathUpload = "/tmp/";
  //pathUpload = "/tmp/";
  var path = require('path');
  var jsonPath = path.join(__dirname, '..', 'public', 'uploads', 'MLNQ*');

  //var pathUpload = "../public/uploads/";
  //glob( subDir+'*.*', options, function (er, files) {
  //glob(pathUpload + 'MLNQ*', function (er, files) {
  glob(jsonPath, function (er, files) {
    var outLen = files.length;
    for (var i = 0; i < outLen; i++) {
      var rootLoc = files[i].indexOf("uploads");
      var startLoc = rootLoc + 8;
      var endLoc = files[i].length;
      console.log(path.basename(files[i]));
      console.log(files[i]);
      filesNoPath.push(path.basename(files[i]));
    };

    for (var i = 0; i < outLen; i++) {
      outputLine.push(new outputObj(
        i,
        '/uploads/' + filesNoPath[i],
        //                "/uploads/" + filesNoPath[i],
        //                filesNoPath[i]
        files[i]
      ));
      //console.log(outputLine[i]);
    };

    res.render('../app/views/admin/allpics', {
      outputLines: outputLine
    });
  });
});


router.post('/deleteAll', function (req, res) {
  console.log("deleting all files");
  //var allFiles = getAllPicFiles();
  var uploadFile = __dirname;
  var appWordLoc = uploadFile.indexOf("app");
  var subDir = uploadFile.substr(0, appWordLoc);

  var pathUpload = subDir + "app/public/uploads/";
  var filesNoPath = [];
  var filesNewPath = [];

  function outputObj(_recNum, _imgSrc, _fileName, _fullPath) {
    this.recNum = _recNum;
    this.imgSrc = _imgSrc;
    this.fileName = _fileName;
    this.fullPath = _fullPath;
  };

  var outputLine = [];

  var respondObj = {
    errCode: 0,   //0 if no error
    errLine: 0,   //which line of the input form
    errrMsg: "", //error message
    errExp: "",   //error explanation
  };

  var sendObjBack = function (errCode, errMsg, errLine, errExp, _user_name, _user_email, _user_id, _device_id) {
    auditMod.writeAuditLog(connection, "Delete All", "Admin", "root@email.com", "code: " + errCode + " = " + errMsg, " ", " ");
    respondObj.errCode = errCode;
    respondObj.errLine = errLine;
    respondObj.errMsg = errMsg;
    respondObj.errExp = errExp;
    // respondObj.user_id = _user_id;
    // respondObj.device_id = _device_id;
    res.send(respondObj);  //send the object
  };



  //new location for image files
  //pathUpload = "/tmp/";
  var path = require('path');
  var jsonPath = path.join(__dirname, '..', 'public', 'uploads', 'MLNQ*');

  //glob( subDir+'*.*', options, function (er, files) {
  glob(jsonPath, function (er, files) {
    var outLen = files.length;
    for (var i = 0; i < outLen; i++) {
      var rootLoc = files[i].indexOf("uploads");
      var rootLoc = files[i].indexOf("uploads");
      var startLoc = rootLoc + 8;
      var endLoc = files[i].length;
      filesNoPath.push(files[i].substring(startLoc, endLoc));
    };

    for (var i = 0; i < outLen; i++) {
      outputLine.push(new outputObj(
        i,
        files[i],
        // "/tmp/" + filesNoPath[i],
        // filesNoPath[i],
        files[i],
        files[i]
      ));
      //console.log(outputLine[i]);
    };

    //have all file names, now loop thru and delete them
    for (var i = 0; i < outputLine.length; i++) {
      fs.unlinkSync(outputLine[i].fullPath);
    };

    //var query1 = "DELETE FROM uploads WHERE user_id = ? AND device_id = ?";
    var query1 = "DELETE FROM uploads";
    connection.query(query1, function (err, response) {
      //deleted all the files from the upload log
      sendObjBack(0,
        "",
        0,
        "Admin",        //req.session.user_id
        "Admin",        //req.session.username,
        "admin email",  //req.session.user_email,
        "user_id",      //req.session.user_id,
        "device id"     //req.session.device_id
      );
    })
  });
});


router.post('/log', function (req, res) {
  dispAuditPage(res);
});


router.get('/log-disp', function (req, res) {
  dispAuditPage(res);
});


var dispAuditPage = function (res) {
  console.log("hit the admin audit page");

  var auditOutput = [];

  var queryStr = "SELECT * FROM audit_log";
  function auditOutputObj(_typeRec, _time_stamp, _user_name, _user_email, _fault, _browser_id, _ip_addr) {
    this.typeRec = _typeRec;
    this.time_stamp = _time_stamp;
    this.user_name = _user_name;
    this.user_email = _user_email;
    this.fault = _fault;
    this.browser_id = _browser_id;
    this.ip_addr = _ip_addr;

    this.timeStampStr = moment.unix(_time_stamp).format("YYYY-MM-DD  HH:mm a");
  };


  connection.query(queryStr, [], function (err, response) {
    //all of the sessions of previous times pulled out
    for (var i = 0; i < response.length; i++) {
      //loop thru all of the responses
      auditOutput.push(new auditOutputObj(
        response[i].typeRec,
        response[i].time_stamp,
        response[i].user_name,
        response[i].user_email,
        response[i].fault,
        response[i].browser_id,
        response[i].ip_addr
      ));
    };

    res.render('../app/views/admin/audits', {
      outputLines: auditOutput
    });
  });
};

var dispAdminUsersPage = function (res) {
  console.log("hit the admin users page");

  var auditOutput = [];

  var queryStr = "SELECT * FROM users";

  function auditOutputObj(_id, _name, _email_hash, _email, _password_hash) {
    this.id = _id;
    this.name = _name;
    this.email_hash = _email_hash;
    this.email = _email;
    this.password_hash = _password_hash;
  };


  connection.query(queryStr, [], function (err, response) {
    //all of the sessions of previous times pulled out
    for (var i = 0; i < response.length; i++) {
      //loop thru all of the responses
      var testStr = response[i].email_hash;
      //encryption / decrypt can not be done on null strings
      if (testStr === undefined || testStr === null || testStr === "") {
        testStr = loginMod.encrypt(" ");
        testStr = loginMod.encrypt(testStr);
      };
      var emailDecrypt = loginMod.decrypt(testStr);
      auditOutput.push(new auditOutputObj(
        response[i].user_id,
        response[i].name,
        response[i].email_hash,
        emailDecrypt,
        response[i].password_hash,
      ));
    };

    res.render('../app/views/admin/users', {
      outputLines: auditOutput
    });
  });
};


router.post('/admin_users', function (req, res) {
  console.log("hit the admin users post");
  //wont work with a post
  dispAdminUsersPage(res);
});


//for now, use a get to redirect to users post
//really should be a post, so that can't be bookmarked
router.get('/admin_users', function (req, res) {
  console.log("hit the admin users post");
  dispAdminUsersPage(res);
});


router.get('/create', function (req, res) {
  res.render('../app/views/admin/create', {
    success: true,
    errCode: 0
  });
});


//create a new user -- can only reach thru admin menu
router.post('/create', function (req, res) {
  console.log('hit post admin/create"')
  var query = "SELECT * FROM users WHERE email = ?"
  var userPassword = req.body.user_password;
  var userPassword2 = req.body.user_password2;
  var userName = req.body.user_name;
  var userEmail = req.body.user_email;
  var respondObj = {
    errCode: 0,   //0 if no error
    errLine: 0,   //which line of the input form
    errrMsg: "", //error message
    errExp: ""   //error explanation
  };

  if (auditMod.hackCheck(connection, transporterObj, userName, userEmail, userPassword, userPassword2)) {
    userName = "invalid";
    userEmail = "invalid";
    userPassword = "invalid1";
    userPassword2 = "invalid2";
  };


  var sendObjBack = function (errCode, errMsg, errLine, errExp, _user_name, _user_email) {
    auditMod.writeAuditLog(connection, "login attempt", _user_name, _user_email, "code: " + errCode + " = " + errMsg, " ", " ");
    respondObj.errCode = errCode;
    respondObj.errLine = errLine;
    respondObj.errMsg = errMsg;
    respondObj.errExp = errExp;
    res.send(respondObj);  //send the object
  };
  //check if the user name is blank
  if (userName === undefined || userName === null) {
    sendObjBack(10,
      "USER NAME IS BLANK",
      1,
      "The user name is blank and needs a non blank name of at least 5 characters.",
      userName,
      userEmail
    );
    return;
  };

  userName = userName.toLowerCase().trim();
  if (userName === null || userName === "") {
    sendObjBack(11,
      "USER NAME IS BLANK",
      1,
      "The user name is blank and needs a non blank name of at least 5 characters.",
      userName,
      userEmail
    );
    return;
  };

  if (userName.length < 5) {
    sendObjBack(1,
      "USER NAME IS TOO SHORT",
      1,
      "The user name needs at least 5 characters.",
      userName,
      userEmail
    );
    return;
  };


  if (userEmail === undefined || userEmail === null) {
    sendObjBack(12,
      "USER EMAIL IS BLANK",
      2,
      "The user email is blank and needs to be in the proper format.",
      userName,
      userEmail
    );
    return;
  };

  userEmail = userEmail.toLowerCase().trim();
  if (userEmail === null || userEmail === "") {
    sendObjBack(13,
      "USER EMAIL IS BLANK",
      2,
      "The user email is blank and needs to be in the proper format.",
      userName,
      userEmail
    );
    return;
  };

  //email not blank, so look if valid
  if (userEmail.indexOf("@") < 0) {
    sendObjBack(5,
      "USER EMAIL IS INVALID",
      2,
      "The user email does not have an '@' in it.",
      userName,
      userEmail
    );
    return;
  };

  if (userEmail.indexOf(".") < 0) {
    sendObjBack(6,
      "USER EMAIL IS INVALID",
      2,
      "The user email does not have a '.' in it.",
      userName,
      userEmail
    );
    return;
  };

  if (userPassword === undefined || userPassword === null) {
    sendObjBack(14,
      "USER PASSWORD IS BLANK",
      3,
      "The user password can not be blank and needs to be greater than 5 characters.",
      userName,
      userEmail
    );
    return;
  };

  userPassword = userPassword.trim();
  if (userPassword === null || userPassword === "") {
    sendObjBack(15,
      "USER PASSWORD IS BLANK",
      3,
      "The user password can not be blank (spaces don't count !!!) and needs to be greater than 5 characters.",
      userName,
      userEmail
    );
    return;
  };

  if (userPassword.length < 5) {
    sendObjBack(9,
      "USER PASSWORD IS TOO SHORT",
      3,
      "The user password needs to be at least 5 characters without leading or trailing spaces.",
      userName,
      userEmail
    );
    return;
  };

  if (userPassword2 === undefined || userPassword2 === null) {
    console.log("pass2=" + userPassword2)
    sendObjBack(16,
      "CONFIRMING PASSWORD IS BLANK",
      4,
      "The confirming password can not be blank.",
      userName,
      userEmail
    );
    return;
  };

  userPassword2 = userPassword2.trim();
  if (userPassword2 === null || userPassword2 === "") {
    console.log("pass2b=" + userPassword2)
    sendObjBack(17,
      "CONFIRMING PASSWORD IS BLANK",
      4,
      "The confirming password can not be blank and spaces don't count !",
      userName,
      userEmail
    );
    return;
  };

  if (userPassword != userPassword2) {
    sendObjBack(30,
      "PASSWORDS DO NOT MATCH",
      4,
      "Both passwords must match EXTACTLY including upper and lower case.",
      userName,
      userEmail
    );
    return;
  };

  var emailEnc = loginMod.encrypt(req.body.user_email)
  connection.query(query, [emailEnc], function (err, response) {
    console.log(response)
    if (response != undefined && response != null && response.length > 0) {
      console.log("email already in use");
      sendObjBack(40,
        "EMAIL IS ALREADY IN USE",
        1,
        "An account with that email has already been setup. Either sign in " +
        "with that account or pick another email to use",
        userName,
        req.body.user_email
      );
    } else {
      bcrypt.genSalt(10, function (err, salt) {
        bcrypt.hash(userPassword, salt, function (err, hash) {
          var query = "INSERT INTO users (name, email_hash, password_hash, account_id, is_this_master_for_acct ) VALUES (?, ?, ?, ?, ? )";
          var emailEnc = loginMod.encrypt(userEmail);
          connection.query(query, [userName, emailEnc, hash, 0, true], function (err, response) {
            //need to add error 
            console.log(err);
            //now need to requery to make sure that the user just entered to get the user id
            var query = "SELECT * FROM users WHERE email_hash = ?";

            var emailEnc = loginMod.encrypt(userEmail);
            connection.query(query, [emailEnc], function (err, response) {
              req.session.user_id = response[0].id;
              req.session.logged_in = true;
              req.session.username = userName;
              req.session.user_email = userEmail;
              console.log("user added to db");
              sendObjBack(0,
                "",
                0,
                "",
                userName,
                userEmail
              );
              //query to re-read the current user to get their id
            });
          });
        });
      });
    }
  });
});



/*
var tempStr = "richbu@hotmail.com";
console.log(tempStr);
console.log( encrypt(tempStr) );

tempStr = "richbu001@gmail.com";
console.log(tempStr);
console.log( encrypt(tempStr) );

tempStr = "appsandtoys@gmail.com";
console.log(tempStr);
console.log( encrypt(tempStr) );


tempStr = "Admin";
console.log(tempStr);
console.log( encrypt(tempStr) );
*/

console.log('admin controller loaded')
module.exports = router;

