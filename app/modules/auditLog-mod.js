
//audit log files

var moment = require("moment");


exports.writeAuditLog = function ( connMod, _typeRec, _user_name, _user_email, _fault, _browser_id, _ip_addr) {
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
    _fault = _fault + "                                              ";
    _fault = _fault.substring(0, 28);
    if (_browser_id === undefined || _browser_id === null) {
      _browser_id = " ";
    };
    if (_ip_addr === undefined || _ip_addr === null) {
      _ip_addr = " ";
    };
  
    var timeStamp = moment().unix();
  
    var query = "INSERT INTO audit_log ( typeRec, time_stamp, user_name, user_email, fault, browser_id, ip_addr ) VALUES (?, ?, ?, ?, ?, ?, ? )";
  
  
    connMod.query(query, [_typeRec, timeStamp, _user_name, _user_email, _fault, _browser_id, _ip_addr], function (err, response) {
      console.log("error at audit = \n" + err);
      //write to audit file
      //if (err) throw err;
    });
  };
  
  