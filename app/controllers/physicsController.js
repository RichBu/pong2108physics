
var express = require('express');
var router = express.Router();
var multer = require('multer'),
  bodyParser = require('body-parser'),
  path = require('path');
var fs = require('fs');
var moment = require("moment");
var momentDurationFormatSetup = require("moment-duration-format");
var numeral = require("numeral");
var extend = require('extend');
var loginMod = require('../modules/login-mod.js');
var auditMod = require('../modules/auditLog-mod.js');
var GPSmod = require('../modules/gps-mod.js');
var bcalcs = require('../modules/bcalcs-mod.js');



// //for firebase
// var adminFirebase = require("firebase-admin");
// var serviceAccount = require("../../pong2108-200301.json");
// adminFirebase.initializeApp({
//   credential: adminFirebase.credential.cert(serviceAccount),
//   databaseURL: "https://pong2108-200301.firebaseio.com"
// });



momentDurationFormatSetup(moment);  //setup formatting for durations

console.log('physics controller is loaded...');



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
    var timeElapsed_unix = moment.duration(timeStop_unix - timeStart_unix);
    var timeElapsed_str = response[0].isRunning !== 0 ? timeElapsed_unix.format("HH:mm:ss", { trim: false }) : "- - - - -";
    var isRunning_str = response[0].isRunning !== 0 ? "RUNNING" : "STOPPED";
    res.render('../app/views/physics/engine', {
      time_started: timeStart_str,
      time_stopped: timeStop_str,
      time_elapsed: timeElapsed_str,
      samp_time_ball: response[0].samp_time_ball,
      speed_up_fact: response[0].speed_up_fact,
      isRunning: isRunning_str
    });

  });
});



router.post('/button', function (req, res) {
  console.log('did a post inside of button routes');
  var speed_up_fact = parseFloat(req.body.speed_up_fact);
  fbase_ballpos_outputObj.speed_up_fact = speed_up_fact;
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
        auditMod.writeAuditLog(connection, "Stop engine", "Admin", " ", "thru admin screen", " ", " ");
      } else {
        running_stat = 1;
      };
    } else {
      //was not running, so only evaluate start button
      if (start_button_stat == 'true') {
        timeStart_unix = moment().valueOf();
        clearHitMissFirebaseObj();
        running_stat = 1;
        auditMod.writeAuditLog(connection, "Start engine", "Admin", " ", "thru admin screen", " ", " ");
      } else {
        running_stat = 0;
      };
    };

    var query2 = "UPDATE engine_stats SET time_started_unix=?, ";
    query2 += "time_stopped_unix=?, samp_time_ball=?, speed_up_fact=?, isRunning=? ";
    query2 += "WHERE engine_stats_id=1";
    var arrayOut = [timeStart_unix, timeStop_unix, parseFloat(ball_samp_time), speed_up_fact, running_stat];
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


movePlayerPos = async (_game_id, _play_num, _addrString, _geo_loc, _isAddrChange, _isGeoChange, _isUpdDisp) => {
  //this routine called by post command to move to new address or from the demo game mode
  var outVal = false;
  if (_isAddrChange == true) {
    //it's an address change
    //call the addr to geo routine
    var searchLoc = {
      geoLoc: {
        geoLoc: _geo_loc,
      },
      addrStr: _addrString, 
    };
    await GPSmod.checkAndConvertAddrToGeo(searchLoc, configData.gKeyOther)
      .then((result, error) => {
        var addressObj = result;
        //save to firebase
        var fbo = fbase_ballpos_outputObj; //for shorthand
        if (_play_num == 1) {
          fbo.play_1.locat_GPS_lat = addressObj.geoLat;
          fbo.play_1.locat_GPS_lon = addressObj.geoLon;
          fbo.play_1.locat_addr = addressObj.addrStr;
          fbo.dist.between = bcalcs.getPathLength(fbo.play_1.locat_GPS_lat, fbo.play_1.locat_GPS_lon, fbo.play_2.locat_GPS_lat, fbo.play_2.locat_GPS_lon);
        } else if (_play_num == 2) {
          fbo.play_2.locat_GPS_lat = addressObj.geoLat;
          fbo.play_2.locat_GPS_lon = addressObj.geoLon;
          fbo.play_2.locat_addr = addressObj.addrStr;
          fbo.dist.between = bcalcs.getPathLength(fbo.play_1.locat_GPS_lat, fbo.play_1.locat_GPS_lon, fbo.play_2.locat_GPS_lat, fbo.play_2.locat_GPS_lon);
        };
        var _type_hit = "move";
        var _type_result = "good";
        write_ball_hit_rec(_game_id, _play_num, _type_hit, _type_result, 1);
        if (_isUpdDisp == true) {
          writeFirebaseRec();
          toggleFirebaseScreenRefresh();
        };
        outVal = true;
      });
    //write sql record
    //recalc the data ?
    //create sendObj
    //send the sendObj back
  } else if (_isGeoChange == true) {
    //its a geo change
    //call the geo to addr routine
    //write sql record
    //save to firebase
    //recalc the data
    //create sendObj
    //send the sendObj back
  };

  //check the speedup fact if it has changed
  //if req.body.speed_fact <> fbase_ballpos_outputObj.speed_up_fact
  //--- store the data to fbase
  //--- 
  return outVal;
};


movePlayerPos_async = async ( _game_id, _play_num, _addrString, _geo_loc, _isAddrChange, _isGeoChange, _isUpdDisp ) => {
  await movePlayerPos( _game_id, _play_num, _addrString, _geo_loc, _isAddrChange, _isGeoChange, _isUpdDisp );
};


router.post('/game-change', function (req, resMain) {
  //for address or speed up fact change
  console.log('game change');
  /*
    expecting a record to come in with following data:
      - game_id: 0           //game id
      - play_num: 0          //player num
      - isAddrChange: true   //addr flag
      - addrString     //addr string
      - isGeoChange: false    //did the geo location change
      - geo_loc :      //geo loc
          { 
            lat : 00.0000,
            lon : 00.0000
          };
      - speed_up_fact      
  */

  //if it is an addr change, then need to take addr and change to 
  var _game_id = req.body.game_id;
  var _play_num = req.body.play_num;
  req.body.isAddrChange = req.body.isAddrChange == 'true';
  req.body.isGeoChange = req.body.isGeoChange == 'true';
  req.body.play_num = parseInt(req.body.play_num);

  movePlayerPos(_game_id, _play_num, req.body.addrString, req.body.geo_loc, req.body.isAddrChange, req.body.isGeoChange, true );

  fbase_ballpos_outputObj.speed_up_fact = parseFloat(req.body.speed_up_fact);

  //fixed strings right now
  var fixed_game_id = 1;
  var fixed_type_hit_int = 0;  //for serve

  //turn off the ball placement
  var fbo = fbase_ballpos_outputObj;


  //should it be the object or will they get from fbase ?
  resMain.send({
    errCode: 0,
    Status: "OK"
  });
});





router.post('/button/hit', function (req, res) {
  console.log('post hit button routes');
  fbase_ballpos_outputObj.speed_up_fact = parseFloat(req.body.speed_up_fact);
  console.log("speed up fact = " + fbase_ballpos_outputObj.speed_up_fact);
  var ball_samp_time = req.body.ball_samp_time;
  var start_button_stat = req.body.start_button;
  var stop_button_stat = req.body.stop_button;
  var button_hit_01 = req.body.hit_01;
  var button_hit_02 = req.body.hit_02;
  var running_stat = true;

  //fixed strings right now
  var fixed_game_id = 1;
  var fixed_type_hit_int = 0;  //for serve
  var fixed_type_hit = "serve";
  var fixed_result_hit = "good";

  //turn off the ball placement
  var fbo = fbase_ballpos_outputObj;


  var player_hit;
  if (button_hit_01 == 1) {
    player_hit = 1;
  }
  else if (button_hit_02 == 1) {
    player_hit = 2;
  };

  console.log("player hit = " + player_hit);
  console.log(button_hit_01);
  console.log(button_hit_02);
  hit_ball(fixed_game_id, player_hit, fixed_type_hit_int, fixed_result_hit);
  //write_ball_hit_rec(1, "serve", "good");
  res.send({
    errCode: 0,
    Status: "OK"
  });
});


router.post('/button/serve', function (req, res) {
  console.log('post serve button routes');
  fbase_ballpos_outputObj.speed_up_fact = parseFloat(req.body.speed_up_fact);
  var ball_samp_time = req.body.ball_samp_time;
  var start_button_stat = req.body.start_button;
  var stop_button_stat = req.body.stop_button;
  var button_hit_01 = req.body.hit_01;
  var button_hit_02 = req.body.hit_02;
  var place_ball_01 = req.body.place_ball_1;
  var place_ball_02 = req.body.place_ball_2;
  var running_stat = true;

  console.log("ball 01 = " + place_ball_01);
  console.log("ball 02 = " + place_ball_02);

  //fixed strings right now
  var fixed_game_id = 1;
  var fixed_type_hit_int = 0;  //for serve
  var fixed_type_hit = "serve";
  var fixed_result_hit = "good";

  var player_hit;
  var fbaseTempObj = {};
  extend(true, fbaseTempObj, fbase_ballpos_outputObj);


  var playToTaxfr;
  if (place_ball_01 == 1) {
    playToTaxfr = 1;
  };

  if (place_ball_02 == 1) {
    playToTaxfr = 2;
  };

  /*
  fbase_ballpos_outputObj.miss_play_1 = 0;
  fbase_ballpos_outputObj.hit_play_1 = 0;
  fbase_ballpos_outputObj.miss_play_2 = 0;
  fbase_ballpos_outputObj.hit_play_2 = 0;
  writeFirebaseRec();
*/

  setBallToPlayer(fbaseTempObj, playToTaxfr);


  extend(true, fbase_ballpos_outputObj, fbaseTempObj);
  writeFirebaseRec();
  toggleFirebaseScreenRefresh();
  //write a few time in case there was another write going on
  // extend(true, fbase_ballpos_outputObj, fbaseTempObj );
  // writeFirebaseRec();
  // extend(true, fbase_ballpos_outputObj, fbaseTempObj );
  // writeFirebaseRec();

  //hit_ball(fixed_game_id, player_hit, fixed_type_hit_int, fixed_result_hit);
  //write_ball_hit_rec(1, "serve", "good");
  res.send({
    errCode: 0,
    Status: "OK"
  });

});



function game_rec_type(
  _game_id,
  _player_1_id,
  _player_1_coord_X,
  _player_1_coord_Y,
  _player_1_locat_GPS_lat,
  _player_1_locat_GPS_lon,
  _player_1_locat_addr,
  _player_1_hit_time_win,
  _player_2_id,
  _player_2_coord_X,
  _player_2_coord_Y,
  _player_2_locat_GPS_lat,
  _player_2_locat_GPS_lon,
  _player_2_locat_addr,
  _player_2_hit_time_win,
  _field_size_X,
  _field_size_Y,
  _field_scale_X,
  _field_scale_Y,
  _dist_players,
  _ball_type,
  _ball_curr_vel,
  _ball_curr_pos_X,
  _ball_curr_pos_Y,
  _ball_curr_pos_Z,
  _ball_curr_pos_loc_GPS_lat,
  _ball_curr_pos_loc_GPS_lon,
  _game_speed_up_fact,
  _start_time_unix,
  _stop_time_unix,
  _isGameRunning
) {
  this.game_id = _game_id;
  this.player_1_id = _player_1_id;
  this.player_1_coord_X = _player_1_coord_X;
  this.player_1_coord_Y = _player_1_coord_Y;
  this.player_1_locat_GPS_lat = _player_1_locat_GPS_lat;
  this.player_1_locat_GPS_lon = _player_1_locat_GPS_lon;
  this.player_1_locat_addr = _player_1_locat_addr;
  this.player_1_hit_time_win = _player_1_hit_time_win;
  this.player_2_id = _player_2_id;
  this.player_2_coord_X = _player_2_coord_X;
  this.player_2_coord_Y = _player_2_coord_Y;
  this.player_2_locat_GPS_lat = _player_2_locat_GPS_lat;
  this.player_2_locat_GPS_lon = _player_2_locat_GPS_lon;
  this.player_2_locat_addr = _player_2_locat_addr;
  this.player_2_hit_time_win = _player_2_hit_time_win;
  this.field_size_X = _field_size_X;
  this.field_size_Y = _field_size_Y;
  this.field_scale_X = _field_scale_X;
  this.field_scale_Y = _field_scale_Y;
  this.dist_players = _dist_players;
  this.ball_type = _ball_type;
  this.ball_curr_vel = _ball_curr_vel;
  this.ball_curr_pos_X = _ball_curr_pos_X;
  this.ball_curr_pos_Y = _ball_curr_pos_Y;
  this.ball_curr_pos_Z = _ball_curr_pos_Z;
  this.ball_curr_pos_loc_GPS_lat = _ball_curr_pos_loc_GPS_lat;
  this.ball_curr_pos_loc_GPS_lon = _ball_curr_pos_loc_GPS_lon;
  this.game_speed_up_fact = _game_speed_up_fact;
  this.start_time_unix = _start_time_unix;
  this.stop_time_unix = _stop_time_unix;
  this.isGameRunning = _isGameRunning;
};




router.post('/start/:typeStart', function (req, res) {
  console.log('started a game');
  var typeStart = parseInt(req.params.typeStart);  //1=admin screen
  console.log("type strt = " + typeStart);
  var _game_id = 1;
  var _speed_up_fact;
  var startTime_str = moment().format("YYYY-MM-DD HH:mm:ss a");
  if (typeStart == 1) {
    _spped_up_fact = parseFloat(req.body.speed_up_fact);
    fbase_ballpos_outputObj.speed_up_fact = parseFloat(req.body.speed_up_fact);
  };
  console.log("after req.body ");

  var fbo = fbase_ballpos_outputObj; //shorthand notation

  //create a record for the start of the game
  //initialize with values
  var gr = new game_rec_type(
    _game_id,  //_game_id  later on make it increment
    1, //_player_1_id,
    0.00, //_player_1_coord_X,
    0.00, //_player_1_coord_Y,
    42.050377, //_player_1_locat_GPS_lat,
    -87.684347, //_player_1_locat_GPS_lon,
    "1801 Maple Ave.,  Evanston, IL 60208", // _player_1_locat_addr,
    4.00, //_player_1_hit_time_win,
    2, //_player_2_id,
    67056.00, //_player_2_coord_X,
    0.00, //_player_2_coord_Y,
    41.896041,  //_player_2_locat_GPS_lat,
    -87.618772, //_player_2_locat_GPS_lon,
    "340 E. Superior St., Chicago, IL 60611", //_player_2_locat_addr,
    4.00, //_player_2_hit_time_win,
    4000.00, //_field_size_X,
    4000.00, //_field_size_Y,
    1.00, //_field_scale_X,
    1.00, //_field_scale_Y,
    67056.00, //_dist_players,
    1, //_ball_type,
    5.00, //_ball_curr_vel  ft/sec
    0.00, //_ball_curr_pos_X,
    0.00, //_ball_curr_pos_Y,
    20.00, //_ball_curr_pos_Z,
    42.050377, //_ball_curr_pos_loc_GPS_lat,
    -87.684347, //_ball_curr_pos_loc_GPS_lon,
    _speed_up_fact, //_game_speed_up_fact,
    moment().valueOf(), //_start_time_unix,  start time in  unix ms
    0, //_stop_time_unix,
    true //_isGameRunning
  );

  if (fbo.play_1.locat_GPS_lat == undefined || fbo.play_1.locat_GPS_lat == undefined || fbo.play_1.locat_GPS_lat == "") {
    //the firebase was null so keep the game rec variables
  } else {
    //player #1 was not blank so use the firebase data
    gr.player_1_locat_GPS_lat = fbo.play_1.locat_GPS_lat;
    gr.player_1_locat_GPS_lon = fbo.play_1.locat_GPS_lon;
    gr.player_1_locat_addr = fbo.play_1.locat_addr;
  };

  if (fbo.play_2.locat_GPS_lat == undefined || fbo.play_2.locat_GPS_lat == undefined || fbo.play_2.locat_GPS_lat == "") {
    //the firebase was null so keep the game rec variables
  } else {
    //player #1 was not blank so use the firebase data
    gr.player_2_locat_GPS_lat = fbo.play_2.locat_GPS_lat;
    gr.player_2_locat_GPS_lon = fbo.play_2.locat_GPS_lon;
    gr.player_2_locat_addr = fbo.play_2.locat_addr;
  };



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
    gr.game_speed_up_fact,
    gr.start_time_unix,
    gr.stop_time_unix,
    gr.isGameRunning
  ];

  console.log("len=" + gameRecArray.length);

  var query2_bottom = "";
  var query2_top = "INSERT INTO games ";
  query2_bottom += "( ";
  query2_bottom += "player_1_id, player_1_coord_X, player_1_coord_Y, player_1_locat_GPS_lat, ";
  query2_bottom += "player_1_locat_GPS_lon, player_1_locat_addr, player_1_hit_time_win, ";
  query2_bottom += "player_2_id, player_2_coord_X, player_2_coord_Y, player_2_locat_GPS_lat, ";
  query2_bottom += "player_2_locat_GPS_lon, player_2_locat_addr, player_2_hit_time_win, ";
  query2_bottom += "field_size_X, field_size_Y, field_scale_X, field_scale_Y, dist_players, ";
  query2_bottom += "ball_type, ball_curr_vel, ball_curr_pos_X, ball_curr_pos_Y, ";
  query2_bottom += "ball_curr_pos_Z, ball_curr_pos_loc_GPS_lat, ball_curr_pos_loc_GPS_lon, ";
  query2_bottom += "game_speed_up_fact, start_time_unix, stop_time_unix, isGameRunning ";
  query2_bottom += ") ";
  query2_bottom += "VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? ) ";
  var query2 = query2_top + query2_bottom;

  var query3_bottom = "";
  var query3_top = "UPDATE games SET "
  query3_bottom += "player_1_id=?, player_1_coord_X=?, player_1_coord_Y=?, player_1_locat_GPS_lat=?, ";
  query3_bottom += "player_1_locat_GPS_lon=?, player_1_locat_addr=?, player_1_hit_time_win=?, ";
  query3_bottom += "player_2_id=?, player_2_coord_X=?, player_2_coord_Y=?, player_2_locat_GPS_lat=?, ";
  query3_bottom += "player_2_locat_GPS_lon=?, player_2_locat_addr=?, player_2_hit_time_win=?, ";
  query3_bottom += "field_size_X=?, field_size_Y=?, field_scale_X=?, field_scale_Y=?, dist_players=?, ";
  query3_bottom += "ball_type=?, ball_curr_vel=?, ball_curr_pos_X=?, ball_curr_pos_Y=?, ";
  query3_bottom += "ball_curr_pos_Z=?, ball_curr_pos_loc_GPS_lat=?, ball_curr_pos_loc_GPS_lon=?, ";
  query3_bottom += "game_speed_up_fact=?, start_time_unix=?, stop_time_unix=?, isGameRunning=? ";
  query3_bottom + "WHERE game_id=?";
  var query3 = query3_top + query3_bottom;


  //console.log("after change\n");
  //console.log(fbase_ballpos_outputObj);
  // *** to add: need logic to find out which player hit the ball,
  //then get his position and stats to impart on the ball

  //move data over to the firebase object so that it can be written

  fbo.play_1.id = gr.player_1_id;
  fbo.play_1.coord_X = gr.player_1_coord_X;
  fbo.play_1.coord_Y = gr.player_1_coord_Y;
  fbo.play_1.locat_GPS_lat = gr.player_1_locat_GPS_lat;
  fbo.play_1.locat_GPS_lon = gr.player_1_locat_GPS_lon;
  fbo.play_1.locat_addr = gr.player_1_locat_addr;
  fbo.play_1.hit_time_win = gr.player_1_hit_time_win;
  //fbo.play_1.serve_in_prog = 0;

  fbo.play_2.id = gr.player_2_id;
  fbo.play_2.coord_X = gr.player_2_coord_X;
  fbo.play_2.coord_Y = gr.player_2_coord_Y;
  fbo.play_2.locat_GPS_lat = gr.player_2_locat_GPS_lat;
  fbo.play_2.locat_GPS_lon = gr.player_2_locat_GPS_lon;
  fbo.play_2.locat_addr = gr.player_2_locat_addr;
  fbo.play_2.hit_time_win = gr.player_2_hit_time_win;
  //fbo.play_2.serve_in_prog = 0;

  configData.demoNumHits = 0;
  configData.demoAddrNum = 1;

  //first find out if game exists
  var query1 = "SELECT * FROM games WHERE game_id=?";
  connection.query(query1, [_game_id], function (err, response) {
    if (err) {
      console.log("error start game -- find prev game = \n" + err);
    } else {
      //no error check if game_id exists
      //write to audit file
      console.log("resp=" + response);
      if (response[0] == undefined || response[0] == null || response.length < 0) {
        //it was empty so write new value, append (insert) into it
        connection.query(query2, gameRecArray, function (err, response2) {
          if (err) {
            console.log("error at start game, insert = \n" + err);
          } else {
            console.log("wrote new game record");
            //write to audit file
            //if (err) throw err;  
          };
        });
      } else {
        //value exists so need to update it
        //output array needs value of game_id
        gameRecArray.push(_game_id);
        connection.query(query3, gameRecArray, function (err, response2) {
          if (err) {
            console.log("error at start game, update = \n" + err);
          } else {
            console.log("updated existing record");
            //write to audit file
            //if (err) throw err;
          };
        });
      };

    };
  });
  res.send({
    errCode: 0,
    Status: "OK"
  });

  setBallToPlayer(fbo, 1);  //set the ball on player #1
  clearHitMissFirebaseObj();
  toggleFirebaseScreenRefresh();
});



module.exports = router;
