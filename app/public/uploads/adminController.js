var bcrypt = require('bcryptjs');
var express = require('express');
var router = express.Router();
var connection = require('../config/connection.js');
var moment = require("moment");
var numeral = require("numeral");
var nodemailer = require('nodemailer');
var crypto = require('crypto');
var glob = require("glob");
var fs = require('fs');


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
    var decipher = crypto.createDecipher(crypto_algorithm, crypto_password)
    var dec = decipher.update(text, 'hex', 'utf8')
    dec += decipher.final('utf8');
    return dec;
}


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
        user_email_hash = encrypt(user_email);
        if (req.body.user_password === undefined || req.body.user_password === null || req.body.user_password === "") {
            console.log("no match #2");
            return res.render('../app/views/admin/login');
        } else {
            //somthing typed in .. check it out
            user_password = req.body.user_password;
            user_password = user_password.trim();
            password_compare = "$2a$10$LYnC1k8jC9A5CNbXmh72beAyx0PDvIrek4u4DArpatFNWz0fL.fQ2";
            bcrypt.compare(user_password, password_compare, function (err, result) {
                //the password matches
                if (user_email_hash === "0260d8a4f51548dcb386abf34fc0c4d2796675") {
                    console.log("password match");
                    return dispAuditPage(res);
                } else {
                    console.log("no match #3");
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

    var pathUpload = "../public/uploads/";
    //glob( subDir+'*.*', options, function (er, files) {
    glob(pathUpload + '*', function (er, files) {
        var outLen = files.length;
        for (var i = 0; i < outLen; i++) {
            var rootLoc = files[i].indexOf("uploads");
            var startLoc = rootLoc + 8;
            var endLoc = files[i].length;
            console.log( files[i] );
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

    res.render('../app/views/admin/allpics', {
        outputLines: outputLine
    });
});


router.get('/deleteAll', function (req, res) {
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
                filesNoPath[i],
                files[i]
            ));
            //console.log(outputLine[i]);
        };

        //have all file names, now loop thru and delete them
        for (var i = 0; i < outputLine.length; i++) {
            fs.unlinkSync(outputLine[i].fullPath);
        };

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

        this.timeStampStr = moment.unix(_time_stamp).format("YYYY-MM-DD  hh:mm a");
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
                testStr = encrypt(" ");
                testStr = encrypt(testStr);
            };
            var emailDecrypt = decrypt(testStr);
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

