
var express = require('express');
var router = express.Router();
var multer = require('multer'),
  bodyParser = require('body-parser'),
  path = require('path');
var fs = require('fs');
var moment = require("moment");
var numeral = require("numeral");


console.log('physics controller is loaded...');

//this is the picture_controller.js file
//really /picture
router.get('/', function (req, res) {
  console.log("at the physics engine");

  //don't have the device id 
  var query = "SELECT * FROM engine_stats";

  connection.query(query, function (err, response) {
    var timeStart_unix = response[0].time_started_unix;
    var timeStart_str = moment.unix(timeStart_unix).format("YYYY-MM-DD  hh:mm:ss a");
    var timeStop_unix = response[0].time_stopped_unix;
    var timeStop_str = response[0].isRunning ? "- - - - -" : moment.unix(timeStop_unix).format("YYYY-MM-DD  hh:mm:ss a");
    var timeElapsed_unix = moment().unix() - timeStart_unix;
    //var newTimeElap = moment.unix(timeElapsed_unix)- moment("06:00").format("hh:mm");
    //var t1 = moment.unix(timeStart_unix);
    //var t2 = moment();
    //console.log( moment.unix(newTimeElap).format("hh:mm:ss")   );
    //var timeElapsed_unix = moment().from( moment.unix(timeStart_unix));
    //var timeElapsed_unix = moment( moment().unix(timeStart_unix)).fromNow();
    //console.log("unix time = \n" + timeElapsed_unix);
    //console.log( moment.unix(timeElapsed_unix).format("hh:mm:ss") );
    //console.log( moment( moment.duration(timeElapsed_unix)).format("hh:mm:ss") );
    var timeElapsed_str = response[0].isRunning ? moment.unix(timeElapsed_unix).format("hh:mm:ss") : "- - - - -";
    var isRunning_str = response[0].isRunning ? "RUNNING" : "STOPPED";
    res.render('../app/views/physics/engine', {
      time_started: timeStart_str,
      time_stopped: timeStop_str,
      time_elapsed: timeElapsed_str,
      samp_time_ball: response[0].samp_time_ball,
      isRunning: isRunning_str
    });

  });
});

router.post('/button', function (req, res) {
  console.log('did a post inside of nutton routes');
  var ball_samp_time = req.body.ball_samp_time;
  var start_button_stat = req.body.start_button;
  var stop_button_stat = req.body.stop_button;
  var running_stat = true;

  var query = "SELECT * FROM engine_stats";

  connection.query(query, function (err, response) {
    var timeStart_unix = response[0].time_started_unix;
    var timeStop_unix = response[0].time_stopped_unix;
    running_stat = response[0].isRunning;

    if (response[0].isRunning || response[0].isRunning != 0) {
      //engine was already running, so only evaluate stop button
      if (stop_button_stat) {
        timeStop_unix = moment().unix();
        running_stat = false;
      } else {
        running_stat = true;
      };
    } else {
      //was not running, so only evaluate start button
      if (start_button_stat) {
        timeStart_unix = moment().unix();
        running_stat = true;
      } else {
        running_stat = false;
      };
    };

    var query2 = "UPDATE engine_stats SET time_started_unix=?, ";
    query2 += "time_stopped_unix=?, samp_time_ball=?, isRunning=? ";
    query2 += "WHERE engine_stats_id=1";
    var arrayOut = [timeStart_unix, timeStop_unix, ball_samp_time, running_stat];
    connection.query(query2, arrayOut, function (err, response) {
      //updated the engine stat
      console.log(err);
      res.send({
        errCode: 0,
        Status: "OK"
      });

    });
  });

});




module.exports = router;
