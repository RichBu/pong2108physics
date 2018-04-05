
var bcrypt = require('bcryptjs');
var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var connection = require('../config/connection.js');
var moment = require("moment");
var numeral = require("numeral");
var nodemailer = require('nodemailer');
var crypto = require('crypto');
var fs = require('fs');


//setup with password
var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'tabletopgenieproj@gmail.com',
    pass: 'projpassword1'
  }
});


var hackCheck = function (str1, str2, str3, str4) {
  //hack attack should look for 
  //  <, >, !, &, /, \, '

  var chkStr = function (_strIn) {
    var outVal = false;
    if (_strIn === undefined || _strIn === null) {
      //it's a null or undefined so can't be hack
      outVal = false;
    } else {
      if (_strIn.indexOf('<') >= 0) outVal = true;
      if (_strIn.indexOf('>') >= 0) outVal = true;
      if (_strIn.indexOf('&') >= 0) outVal = true;
      if (_strIn.indexOf('/') >= 0) outVal = true;
      if (_strIn.indexOf('\\') >= 0) outVal = true;
      if (_strIn.indexOf("'") >= 0) outVal = true;
      if (_strIn.indexOf("!") >= 0) outVal = true;
    };
    return outVal;
  };

  var sendHackEmail = function () {
    var mailOptions = function (_to, _subject, _html) {
      this.from = 'TableTopGenieProj@gmail.com'; // sender address
      this.to = _to;                   // list of receivers
      this.subject = _subject;          // Subject line
      this.html = _html                 // plain text body
    };

    var subjectStr = "HACKING attempt at Table Top Genie @ " + moment().format("YYYY-MM-DD  hh:mm a");
    var messageStr = "<h3>User is attempting to use unauthorized characters</h3><br/>";
    messageStr += "<h3>Characters were detected and input was sanitized.<h3>";
    messageStr += "<h3>You can check on the status by using  /Admin/1  page.<h3><br/>";

    //var mailTo = "RichBu001@gmail.com";
    var mailTo = "RichBu001@gmail.com, mrerlander@gmail.com, dscherer21@gmail.com";
    var mailOptionsObj = new mailOptions(mailTo, subjectStr, messageStr);
    transporter.sendMail(mailOptionsObj, function (err, info) {
      if (err)
        console.log(err)
      else
        //shoud audit log
        console.log();
    });
  };

  var fullOutVal = false;
  fullOutVal = chkStr(str1) || chkStr(str2) || chkStr(str3) || chkStr(str4);

  if (fullOutVal) {
    //there was a hacking attempt
    if (str1 === undefined || str1 === null) str1 = " ";
    if (str2 === undefined || str2 === null) str2 = " ";
    if (str3 === undefined || str3 === null) str3 = " ";
    if (str4 === undefined || str4 === null) str4 = " ";

    sendHackEmail();
    writeAuditLog("HACK ATTEMPT", str1, str2, " ", " ", " ");
  };
  return fullOutVal;
};


function encrypt(text) {
  var crypto_algorithm = 'aes-256-ctr';
  var crypto_password = 'HeLlo';
  var cipher = crypto.createCipher(crypto_algorithm, crypto_password)
  var crypted = cipher.update(text, 'utf8', 'hex')
  crypted += cipher.final('hex');
  return crypted;
}

function decrypt(text) {
  var crypto_algorithm = 'aes-256-ctr';
  var crypto_password = 'HeLlo';
  console.log(text);
  var decipher = crypto.createDecipher(crypto_algorithm, crypto_password)
  var dec = decipher.update(text, 'hex', 'utf8')
  dec += decipher.final('utf8');
  return dec;
}



console.log('users controller is loaded..');

var writeAuditLog = function (_typeRec, _user_name, _user_email, _fault, _browser_id, _ip_addr) {
  //write to the audit file
  //first make sure none are blank
  if (_typeRec === undefined || _typeRec === null) {
    _typeRec = " ";
  };
  if (_user_name === undefined || _user_name === null) {
    _user_name = " ";
  };
  if (_user_email === undefined || _user_email === null) {
    _user_email = " ";
  };
  if (_fault === undefined || _fault === null) {
    _fault = " ";
  };
  if (_browser_id === undefined || _browser_id === null) {
    _browser_id = " ";
  };
  if (_ip_addr === undefined || _ip_addr === null) {
    _ip_addr = " ";
  };

  var timeStamp = moment().unix();

  var query = "INSERT INTO audit_log ( typeRec, time_stamp, user_name, user_email, fault, browser_id, ip_addr ) VALUES (?, ?, ?, ?, ?, ?, ? )";


  connection.query(query, [_typeRec, timeStamp, _user_name, _user_email, _fault, _browser_id, _ip_addr], function (err, response) {
    if (err) console.log("error at audit = \n" + err);
    //write to audit file
    //if (err) throw err;
  });
};


//this is the users_controller.js file
router.get('/new', function (req, res) {
  res.render('users/new');
});


router.get('/log-in', function (req, res) {
  console.log("hit the login route");
  res.render('../app/views/users/login');
  //res.render('/users/Login');
});


router.get('/pick-type/:user_id', function (req, res) {
  var _user_id = req.params.user_id;
  console.log("hit the user pick type route");
  res.render('../app/views/users/picktype', { user_id: _user_id });
  //res.render('/users/PickType');
});


//Terminate Session
router.get('/log-out', function (req, res) {
  req.session.destroy(function (err) {
    res.redirect('/');
  });
});



router.get('/display_table/:user_id/:user_email', function (req, res) {
  //prompt the user for his device
  console.log("hit the display route");

  //needs incoming user_id and user email to be able to create a new devices record
  var _user_id = req.params.user_id;
  var _user_email = req.params.user_email;

  function outputObj(_device_id, _device_name, _location_name, _purpose, _timeLogOn, _lastTimUpd, _lastTimePic) {
    var timeLogOn_str = moment.unix(parseInt(_timeLogOn)).format("YYYY-MM-DD  hh:mm a");
    var lastTimUpd_str = moment.unix(parseInt(_lastTimUpd)).format("YYYY-MM-DD  hh:mm a");
    var lastTimePic_str = moment.unix(parseInt(_lastTimePic)).format("YYYY-MM-DD  hh:mm a");

    this.device_id = _device_id;
    this.device_name = _device_name;
    this.location_name = _location_name;
    this.purpose = _purpose;
    this.timeLogOn = timeLogOn_str;
    this.lastTimUpd = lastTimUpd_str;
    this.lastTimePic = lastTimePic_str;
  };

  var outputLineArray = [];
  var query = "SELECT * FROM devices WHERE user_id = ?";

  connection.query(query, [_user_id], function (err, response) {
    if (response === undefined || response === null) {
      //there is no response
    } else {
      var endVal = response.length;
      for (var i = 0; i < endVal; i++) {
        outputLineArray.push(new outputObj(
          response[i].device_id,
          response[i].device_name,
          response[i].location_name,
          response[i].purpose,
          response[i].timeLogOn_unix,
          response[i].lastTimUpd_unix,
          response[i].lastTimePic_unix
        ));
      };
    };

    // have all the output, display the proper page
    res.render('../app/views/users/display', {
      user_id: _user_id,
      user_email: _user_email,
      outputLines: outputLineArray
    });
  });
});



router.get('/device/:user_id/:user_email', function (req, res) {
  //prompt the user for his device
  //needs incoming user_id and user email to be able to create a new devices record
  var _user_id = req.params.user_id;
  var _user_email = req.params.user_email;

  console.log("hit the device route");
  res.render('../app/views/users/device', {
    user_id: _user_id,
    user_email: _user_email
  });
});



router.post('/deleteAllPics', function (req, res) {
  //the user has put in his address 
  console.log("hit delete all pics for a user");
  var user_id = req.body.user_id;
  //var device_id = req.body.device_id;

  var fileName = [];
  var recIDnum = [];
  var query = "SELECT * FROM uploads WHERE user_id = ?";
  var searchArray = [user_id]
  connection.query(query, searchArray, function (err, response) {
    //found the a current picture
    if (err) {
      throw err;
      return;
    };
    if (response === undefined || response === null || (response.length === 0)) {
      //nothing was found so set the output string to be null
      console.log("  no pics found in the uplaod");
    } else {
      //run the query deleting the same records just found
      console.log( "  found pics starting to delete" );
      var endVal = response.length;
      for (var i=0; i<endVal; i++) {
        //loop thru all the files
        fs.unlinkSync( response[i].filepathUpload );
        recIDnum.push( response[i].upload_id );
      };

      var query2 = "DELETE FROM uploads WHERE user_id = ?";
      var searchArray = [ user_id ];
      connection.query(query2, searchArray, function (err2, response2) {
        //can't really stop returning the sendback because it could have been
        //blank already.
      });
    };

    writeAuditLog( "Del pics", "User id=" + user_id, " ", " ", " ", " ");

    //send back the imgSource
    res.send({
      success: true,
      error: 0,
      errCode: 0,
    });
  });
});



router.post('/device/latestpic', function (req, res) {
  //the user has put in his address 
  console.log("hit latest pic");
  var user_id = req.body.user_id;
  var device_id = req.body.device_id;

  var query = "SELECT * FROM uploads WHERE user_id = ? AND device_id = ?";
  var searchArray = [user_id, device_id]
  connection.query(query, searchArray, function (err, response) {
    var imgSource = "";
    //found the a current picture
    if (err) {
      throw err;
      return;
    };
    if (response === undefined || response === null || (response.length === 0)) {
      //nothing was found so set the output string to be null
      imgSource = "";
    } else {
      var lastRec = response.length - 1;
      imgSource = response[lastRec].imgSource;
    };

    //send back the imgSource
    res.send({
      success: true,
      error: 0,
      errCode: 0,
      imgSource: imgSource
    });
  });
});


router.post('/device/kickoff', function (req, res) {
  //the user has put in his address 
  console.log("hit kickoff");
  var query = "DELETE FROM devices WHERE user_id = ? AND device_id = ?"
  connection.query(query, [req.body.user_id, req.body.device_id], function (err, response) {
    if (err) console.log("error at delete device id schedule = \n" + err);
    var respondObj = {
      errCode: 0,   //0 if no error
      errLine: 0,   //which line of the input form
      errrMsg: "", //error message
      errExp: "",   //error explanation
      user_id: "",
      device_id: ""
    };

    var sendObjBack = function (errCode, errMsg, errLine, errExp, _user_name, _user_email, _user_id, _device_id) {
      writeAuditLog("Kick off", _user_name, _user_email, "device id=" + _device_id, " ", " ");
      respondObj.errCode = errCode;
      respondObj.errLine = errLine;
      respondObj.errMsg = errMsg;
      respondObj.errExp = errExp;
      respondObj.user_id = _user_id;
      respondObj.device_id = _device_id;
      res.send(respondObj);  //send the object
    };

    //write to audit file and reply back to the browser
    sendObjBack(0,
      "",
      0,
      req.body.user_id,
      req.session.username,
      req.body.user_email,
      req.body.user_id,
      req.body.device_id
    );

    //if (err) throw err;
  });

});


//force pics
router.post('/forcepic', function (req, res) {
  //the camera is pinging for a status update 
  console.log("hit force pic");

  var user_id = req.body.user_id;
  var device_id = req.body.device_id;
  var numPicsTakenSession = 0;  //# pics taken
  var comm_numPicsMax = req.body.numPicsToTake;
  var comm_commTimeInt = req.body.timPicInterval;

  //first pull from the devices file and then send the command back
  //to the browers
  var query = "SELECT * FROM devices WHERE user_id=? AND device_id=?";

  connection.query(query, [user_id, device_id], function (err, response) {
    console.log("found the correct device");
    if (err) {
      console.log("error at delete device id schedule = \n" + err);
      return;
    };
    if (response === undefined || response === null || response.length === 0) {
      //there is nothing found .. should not happen, maybe they got kicked off ?
      //so, send command to reboot to google
    } else {
      //found a valid entry
      //var comm_commTimeInt = response[0].commTimeInt;
      //var comm_numPicsTakenSession = response[0].numPicsTakenSession;
      //var comm_numPicsMax = response[0].maxPicsSession;
      console.log("response is defined");

      //got results out from the table, update the update time
      var timeOfComm = moment().unix();
      var query2 = "UPDATE devices SET lastTimUpd_unix=?, ";
      query2 += "numPicsTakenSession=?, maxPicsSession=?, commTimeInt=? ";
      query2 += "WHERE user_id=? AND device_id=?";
      var updArray = [timeOfComm, numPicsTakenSession, comm_numPicsMax, comm_commTimeInt, parseInt(user_id), parseInt(device_id)];
      console.log(updArray);
      connection.query(query2, updArray, function (err2, response2) {
        console.log("updated new command");
        //so now can send response back to the browser
        res.send({
          Status: "OK",
          errCode: 0,
          user_id: user_id,
          device_id: device_id
        });
      });
    }
  });
});


router.get('/getAllPics/:user_id', function (req, res) {
  console.log("hit the user get all files");
  var _user_id = req.params.user_id;

  var outputLine = [];
  function outputObj(_recNum, _imgSrc, _fileName, _fullFileName, _descripString) {
    this.recNum = _recNum;
    this.imgSrc = _imgSrc;
    this.fileName = _fileName;
    this.fullFileName = _fullFileName;
    this.descripString = _descripString;
  };

  var query = "SELECT * FROM uploads WHERE user_id = ?";
  connection.query(query, [_user_id], function (err, response) {
    if (response === undefined || response === null) {
      //there is no response
    } else {
      var endVal = response.length;
      for (var i = 0; i < endVal; i++) {
        var timeStamp = moment.unix(response[i].date_start_unix).format("YYYY-MM-DD  hh:mm:ss a");
        var descripString = "Uploaded on " + timeStamp;
        var imgSource = response[i].imgSource;
        var filename = response[i].filename;
        var fullFileName = response[i].filepathUpload;
        outputLine.push(new outputObj(
          i,
          imgSource,
          filename,
          fullFileName,
          descripString
        ));
      };
      res.render('../app/views/users/allpics', {
        outputLines: outputLine,
        user_id : _user_id
      });
    };
  });
});


router.post('/device/register', function (req, res) {
  //the user has put in his address
  //RPB todo 
  console.log("hit register device post");

  var respondObj = {
    errCode: 0,   //0 if no error
    errLine: 0,   //which line of the input form
    errrMsg: "", //error message
    errExp: "",   //error explanation
    user_id: "",
    device_id: ""
  };

  var sendObjBack = function (errCode, errMsg, errLine, errExp, _user_name, _user_email, _user_id, _device_id) {
    writeAuditLog("Device reg", _user_name, _user_email, "code: " + errCode + " = " + errMsg, " ", " ");
    respondObj.errCode = errCode;
    respondObj.errLine = errLine;
    respondObj.errMsg = errMsg;
    respondObj.errExp = errExp;
    respondObj.user_id = _user_id;
    respondObj.device_id = _device_id;
    res.send(respondObj);  //send the object
  };

  //so the user has typed in all his credentials, its time store it
  //first, move over the data to session
  req.session.user_id = req.body.user_id;
  req.session.user_email = req.body.user_email;

  //validate the input, which now is basically just not blank
  if (req.body.device_name === undefined || req.body.device_name === null || req.body.device_name === "") { req.body.device_name = " " };
  if (req.body.location_name === undefined || req.body.location_name === null || req.body.location_name === "") { req.body.location_name = " " };
  if (req.body.purpose === undefined || req.body.purpose === null || req.body.purpose === "") { req.body.purpose = " " };
  if (req.body.location_lat === undefined || req.body.location_lat === null || req.body.location_lat === "") { req.body.location_lat = "0" };
  if (req.body.location_lon === undefined || req.body.location_lon === null || req.body.location_lon === "") { req.body.location_lon = "0" };



  var query = "INSERT INTO devices (user_id, device_name, location_name, purpose, locat_lat, locat_lon, locat_address, timeLogOn_unix, timeNextPrompt_unix, numPicsTakenSession, maxPicsSession, isLoggedOn, whatToDisp, show_on_scrn,   commNumPic, commTimeInt, commTimeDelay, commPromptInt, lastTimUpd_unix, lastTimePic_unix   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )"

  var dataStoreArr = [
    req.body.user_id,
    req.body.device_name,
    req.body.location_name,
    req.body.purpose,
    req.body.location_lat,
    req.body.location_lon,
    " ",   //address, node needs to find it
    moment().unix(),    //time logged on -- node
    0,    //time for next heart beat
    0,    //num pics this session
    0,    //max num of
    true,  //is logged on
    0,     //what to display
    0,  //show on screen
    0,  //num of pics to take
    0,  //secs between pics
    0,  //time delay before taking pictures
    5,  //interval between checking in
    moment().unix(),  //last time updated
    0,  //last time picture was sent
    0   //device status
  ];

  connection.query(query, dataStoreArr, function (err, response) {
    //need to add error 
    console.log(err);
    console.log("wrote registration record");

    device_id = response.insertId;
    req.session.device_id = device_id;

    //now need to send the data back
    sendObjBack(0,
      "",
      0,
      req.session.user_id,
      req.session.username,
      req.session.user_email,
      req.session.user_id,
      req.session.device_id
    );
  });
});



//if user trys to sign in with the wrong password or email tell them that on the page
router.post('/login', function (req, res) {
  console.log("got post for login");
  var respondObj = {
    errCode: 0,   //0 if no error
    errLine: 0,   //which line of the input form
    errrMsg: "", //error message
    errExp: ""   //error explanation
  };

  var sendObjBack = function (errCode, errMsg, errLine, errExp, _user_name, _user_email) {
    writeAuditLog("login attempt", _user_name, _user_email, "code: " + errCode + " = " + errMsg, " ", " ");
    respondObj.errCode = errCode;
    respondObj.errLine = errLine;
    respondObj.errMsg = errMsg;
    respondObj.errExp = errExp;
    res.send(respondObj);  //send the object
  };

  var user_email = req.body.user_email;
  var user_password = req.body.user_password;
  user_password = user_password.trim();

  if (hackCheck(user_email, user_password, " ", " ")) {
    user_email = "invalid";
    user_password = "invalid";
  };


  if (user_email === undefined || user_email === null) {
    sendObjBack(12,
      "USER EMAIL IS BLANK",
      2,
      "The user email is blank and needs to be in the proper format.",
      " ",
      user_email
    );
    return;
  };

  user_email = user_email.toLowerCase().trim();
  if (user_email === null || user_email === "") {
    sendObjBack(13,
      "USER EMAIL IS BLANK",
      2,
      "The user email is blank and needs to be in the proper format.",
      " ",
      user_email
    );
    return;
  };


  //email not blank, so look if valid
  if (user_email.indexOf("@") < 0) {
    sendObjBack(5,
      "USER EMAIL IS INVALID",
      2,
      "The user email does not have an '@' in it.",
      " ",
      user_email
    );
    return;
  };

  if (user_email.indexOf(".") < 0) {
    sendObjBack(6,
      "USER EMAIL IS INVALID",
      2,
      "The user email does not have a '.' in it.",
      " ",
      user_email
    );
    return;
  };


  if (user_password === undefined || user_password === null) {
    sendObjBack(14,
      "USER PASSWORD IS BLANK",
      3,
      "The user password can not be blank and needs to be greater than 5 characters.",
      " ",
      user_email
    );
    return;
  };

  user_password = user_password.trim();
  if (user_password === null || user_password === "") {
    sendObjBack(15,
      "USER PASSWORD IS BLANK",
      3,
      "The user password can not be blank (spaces don't count !!!) and needs to be greater than 5 characters.",
      " ",
      user_email
    );
    return;
  };

  var query = "SELECT * FROM users WHERE email_hash = ?";
  var emailEnc = encrypt(user_email);
  connection.query(query, [emailEnc], function (err, response) {
    if (response.length == 0) {
      sendObjBack(35,
        "NO SUCH USER",
        1,
        "The email you have entered is not on file.",
        " ",
        user_email
      );
      return;
    };
    bcrypt.compare(user_password, response[0].password_hash, function (err, result) {
      if (result == true) {
        req.session.logged_in = true;
        req.session.user_id = response[0].user_id;
        req.session.user_email = decrypt(response[0].email_hash);
        req.session.username = response[0].name;
        req.session.maxPictures = 3;
        req.session.numPic = 0;
        //send object back with error code = 0
        //means everything passed, but rest of req session not going back
        sendObjBack(0,
          "",
          0,
          req.session.user_id,
          req.session.username,
          user_email
        );
      } else {
        sendObjBack(35,
          "WRONG PASSWORD",
          1,
          "The password entered does not match the one on record.",
          req.session.username,
          user_email
        );
      }
    });
  });
});



router.post('/create', function (req, res) {
  var query = "SELECT * FROM users WHERE email_hash = ?"
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

  if (hackCheck(userName, userEmail, userPassword, userPassword2)) {
    userName = "invalid";
    userEmail = "invalid";
    userPassword = "invalid1";
    userPassword2 = "invalid2";
  };


  var sendObjBack = function (errCode, errMsg, errLine, errExp, _user_name, _user_email) {
    writeAuditLog("login attempt", _user_name, _user_email, "code: " + errCode + " = " + errMsg, " ", " ");
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

  var emailEnc = encrypt(req.body.user_email)
  connection.query(query, [emailEnc], function (err, response) {
    if (response.length > 0) {
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
          var query = "INSERT INTO users (name, email, password_hash ) VALUES (?, ?, ? )";
          var emailEnc = encrypt(userEmail);
          connection.query(query, [userName, emailEnc, hash], function (err, response) {
            //need to add error 
            console.log(err);
            //now need to requery to make sure that the user just entered to get the user id
            var query = "SELECT * FROM users WHERE email_hash = ?";

            var emailEnc = encrypt(userEmail);
            connection.query(query, [emailEnc], function (err, response) {
              req.session.user_id = response[0].id;
              req.session.logged_in = true;
              req.session.username = userName;
              req.session.user_email = userEmail;
              req.session.maxPictures = 3;
              req.session.numPic = 0;
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
var testStr = "password";
bcrypt.genSalt(10, function (err, salt) {
  bcrypt.hash( testStr, salt, function (err, hash) {
    console.log( "test of encrypt=" + testStr );
    console.log(hash);
  });
});
*/

module.exports = router;

