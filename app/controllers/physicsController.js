
var express = require('express');
var router = express.Router();
var multer = require('multer'),
  bodyParser = require('body-parser'),
  path = require('path');
var fs = require('fs');
var moment = require("moment");
var momentDurationFormatSetup = require("moment-duration-format");
var numeral = require("numeral");


// //for firebase
// var adminFirebase = require("firebase-admin");
// var serviceAccount = require("../../pong2108-200301.json");
// adminFirebase.initializeApp({
//   credential: adminFirebase.credential.cert(serviceAccount),
//   databaseURL: "https://pong2108-200301.firebaseio.com"
// });





momentDurationFormatSetup(moment);  //setup formatting for durations

console.log('physics controller is loaded...');

//this is the picture_controller.js file
//really /picture
router.get('/', function (req, res) {
  console.log("at the physics engine");

  //don't have the device id 
  var query = "SELECT * FROM engine_stats";

  connection.query(query, function (err, response) {
    var timeStart_unix = response[0].time_started_unix;
    var timeStart_str = moment.unix(timeStart_unix / 1000).format("YYYY-MM-DD  hh:mm:ss a");
    var timeStop_unix = response[0].time_stopped_unix;
    if (response[0].isRunning !== 0) {
      timeStop_unix = moment().valueOf();
      timeStop_str = "- - - - -";
    } else {
      timeStop_str = moment.unix(timeStop_unix / 1000).format("YYYY-MM-DD  hh:mm:ss a");
    };
    //var timeStop_str = response[0].isRunning!==0 ? "- - - - -" : moment.unix(timeStop_unix/1000).format("YYYY-MM-DD  hh:mm:ss a");
    var timeElapsed_unix = moment.duration(timeStop_unix - timeStart_unix);
    //var timeElapsed_unix = moment().unix() - timeStart_unix;
    //var newTimeElap = moment.unix(timeElapsed_unix)- moment("06:00").format("hh:mm");
    //var t1 = moment.unix(timeStart_unix);
    //var t2 = moment();
    //console.log( moment.unix(newTimeElap).format("hh:mm:ss")   );
    //var timeElapsed_unix = moment().from( moment.unix(timeStart_unix));
    //var timeElapsed_unix = moment( moment().unix(timeStart_unix)).fromNow();
    //console.log("unix time = \n" + timeElapsed_unix);
    //console.log( moment.unix(timeElapsed_unix).format("hh:mm:ss") );
    //console.log( moment( moment.duration(timeElapsed_unix)).format("hh:mm:ss") );
    //var timeElapsed_str = response[0].isRunning!==0 ? moment.unix(timeElapsed_unix).format("hh:mm:ss") : "- - - - -";
    var timeElapsed_str = response[0].isRunning !== 0 ? timeElapsed_unix.format("HH:mm:ss", { trim: false }) : "- - - - -";
    var isRunning_str = response[0].isRunning !== 0 ? "RUNNING" : "STOPPED";
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
  console.log('did a post inside of button routes');
  var ball_samp_time = req.body.ball_samp_time;
  var start_button_stat = req.body.start_button;
  var stop_button_stat = req.body.stop_button;
  var running_stat = true;

  var query = "SELECT * FROM engine_stats";

  connection.query(query, function (err, response) {
    var timeStart_unix = response[0].time_started_unix;
    var timeStop_unix = response[0].time_stopped_unix;
    running_stat = response[0].isRunning;

    if (response[0].isRunning !== 0) {
      //engine was already running, so only evaluate stop button
      if (stop_button_stat === 'true') {
        timeStop_unix = moment().valueOf();
        running_stat = 0;
      } else {
        running_stat = 1;
      };
    } else {
      //was not running, so only evaluate start button
      if (start_button_stat == 'true') {
        timeStart_unix = moment().valueOf();
        running_stat = 1;
      } else {
        running_stat = 0;
      };
    };

    var query2 = "UPDATE engine_stats SET time_started_unix=?, ";
    query2 += "time_stopped_unix=?, samp_time_ball=?, isRunning=? ";
    query2 += "WHERE engine_stats_id=1";
    var arrayOut = [timeStart_unix, timeStop_unix, parseFloat(ball_samp_time), running_stat];
    connection.query(query2, arrayOut, function (err, response) {
      //updated the engine stat
      if (err) console.log("error at button press query 2\n" + err);
      res.send({
        errCode: 0,
        Status: "OK"
      });

    });
  });

});



router.post('/start', function (req, res) {
  console.log('started a game');
  var startTime_str = moment().format("YYYY-MM-DD HH:mm:ss a");

  //create a record for the start of the game
  var gr = new game_rec_type(
    1,  //_game_id  later on make it increment
    1, //_player_1_id,
    0.00, //_player_1_coord_X,
    0.00, //_player_1_coord_Y,
    42.050377, //_player_1_locat_GPS_lat,
    -87.684347, //_player_1_locat_GPS_lon,
    "1801 N. Maple  Evanston, IL", // _player_1_locat_addr,
    5.00, //_player_1_hit_time_win,
    2, //_player_2_id,
    3000.00, //_player_2_coord_X,
    0.00, //_player_2_coord_Y,
    41.896041,  //_player_2_locat_GPS_lat,
    -87.618772, //_player_2_locat_GPS_lon,
    "340 E. Superior St., Chicago, IL 60611", //_player_2_locat_addr,
    5.00, //_player_2_hit_time_win,
    4000.00, //_field_size_X,
    40000.00, //_field_size_Y,
    1.00, //_field_scale_X,
    1.00, //_field_scale_Y,
    3000.00, //_dist_players,
    1, //_ball_type,
    5.00, //_ball_curr_vel  ft/sec
    0.00, //_ball_curr_pos_X,
    0.00, //_ball_curr_pos_Y,
    20.00, //_ball_curr_pos_Z,
    42.050377, //_ball_curr_pos_loc_GPS_lat,
    -87.684347, //_ball_curr_pos_loc_GPS_lon,
    1.000, //_game_soeed_up_fact,
    moment().valueOf(), //_start_time_unix,  start time in  unix ms
    0, //_stop_time_unix,
    true //_isGameRunning
  );

  var gameRecArray = [
    //gr.game_id,
    gr.player_1_id,
    gr.player_1_coord_X,
    gr.player_1_coord_Y,
    gr.player_1_locat_GPS_lat,
    gr.player_1_locat_GPS_lon,
    gr.player_1_locat_addr,
    gr.player_1_hit_time_win,
    gr.player_2_id,
    gr.player_2_coord_X,
    gr.player_2_coord_Y,
    gr.player_2_locat_GPS_lat,
    gr.player_2_locat_GPS_lon,
    gr.player_2_locat_addr,
    gr.player_2_hit_time_win,
    gr.field_size_X,
    gr.field_size_Y,
    gr.field_scale_X,
    gr.field_scale_Y,
    gr.dist_players,
    gr.ball_type,
    gr.ball_curr_vel,
    gr.ball_curr_pos_X,
    gr.ball_curr_pos_Y,
    gr.ball_curr_pos_Z,
    gr.ball_curr_pos_loc_GPS_lat,
    gr.ball_curr_pos_loc_GPS_lon,
    gr.game_soeed_up_fact,
    gr.start_time_unix,
    gr.stop_time_unix,
    gr.isGameRunning
  ];

  console.log("after change\n");
  console.log(fbase_ballpos_outputObj);
  //need logic to find out which player hit the ball,
  //then get his position and stats to impart on the ball


  //set to global variables right now.
  //should poll the existing file first and
  //get ball hit id from there and increment
  var _game_id = 1;
  var _ball_hit_id = 1;
  var _time_start_str = startTime_str;

  var _time_start_unix = 0;
  var _time_stop_unix = 0;
  var _start_pos_loc_GPS_lat = 42.050377;
  var _start_pos_loc_GPS_lon = -87.684347;
  var _stop_pos_loc_GPS_lat = 41.896041;
  var _stop_pos_loc_GPS_lon = -87.618772;
  var _dist_between = 100.45;   //feet between
  var _type_hit = "SERVE";
  var _result_hit = "GOOD";
  var _player_num = 1;
  var _ball_accel_val = 0.00;
  var _ball_accel_tim = 0.00;
  var _ball_vel = 5.00;         //in per second
  var _ball_angle = 0.00;
  var _speed_up_fact = 1.00;

  var query = "INSERT INTO ball_hits ( ";
  query += "game_id,  time_start_unix, time_stop_unix, start_pos_loc_GPS_lat, ";
  query += "start_pos_loc_GPS_lon, stop_pos_loc_GPS_lat, stop_pos_loc_GPS_lon, ";
  query += "dist_between, type_hit, result_hit, player_num, ball_accel_val, ";
  query += "ball_accel_tim, ball_vel, ball_angle, speed_up_fact ) ";
  query += "VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )";

  //console.log(query);
  var queryArray = [
    _game_id,
    _time_start_unix,
    _time_stop_unix,
    _start_pos_loc_GPS_lat,
    _start_pos_loc_GPS_lon,
    _stop_pos_loc_GPS_lat,
    _stop_pos_loc_GPS_lon,
    _dist_between,
    _type_hit,
    _result_hit,
    _player_num,
    _ball_accel_val,
    _ball_accel_tim,
    _ball_vel,
    _ball_angle,
    _speed_up_fact
  ];
  //console.log(queryArray);

  connection.query(query, queryArray, function (err, response) {
    if (err) {
      console.log("error at start game = \n" + err);
    };
    //write to audit file
    //if (err) throw err;
  });


});


module.exports = router;
