

//global variable .... must leave off the "var", "const", or "let"


configData = {
    mySQLforceRemote: true,
    firebaseStorage: "/games/user",         //prior to tacking on user number
    firebaseMainGame: "/games",
    firebaseStatusFolder: "/status",
    firebaseRefreshBit: "/status/refreshUsers",
    firebaseActive: true
};


fbase_ballpos_outputObj = {  //variable written to in Firebase
    game_id: 1,
    ball_active: 0,         //ball is active if 1
    time_start_str: "",       //full string for calculating
    ball_physics: {
        curr_vel: 0.0,
        accel_val: 0.0,
        accel_time: 0.0,
        angle: 0.0
    },
    ball_curr_pos: {
        pos_X: 0.0,
        pos_Y: 0.0,
        pos_Z: 0.0,
        loc_GPS_lat: 0.0,
        loc_GPS_lon: 0.0
    },
    dist: {
        between: 0.0,   //in ft
        play_1: 0.0,    //in ft
        play_2: 0.0
    },
    time: {
        start_unix: 0,
        stop_unix: 0,
        elapsed_unix: 0,
        play_1: 0.0,        //in secs
        play_2: 0.0         //in secs
    },
    play_1: {
        id: 1,
        coord_X: 0.0,
        coord_Y: 0.0,
        locat_GPS_lat: 0.0,
        locat_GPS_lon: 0.0,
        locat_addr: "",
        hit_time_win: 0.0
    },
    play_2: {
        id: 1,
        coord_X: 0.0,
        coord_Y: 0.0,
        locat_GPS_lat: 0.0,
        locat_GPS_lon: 0.0,
        locat_addr: "",
        hit_time_win: 0.0
    },
    field: {
        center_coord_X: 0.0,
        center_coord_Y: 0.0,
        center_locat_GPS_lat: 0.0,
        center_locat_GPS_lon: 0.0
    },
    speed_up_fact: 0.0,
    hit_play_1: 0,
    hit_play_2: 0,
    dirFrom: 1,      //direction 1=from 1 to 2
    miss_play_1: 0,  //player #1 missed
    miss_play_2: 0
};

var fbase_ball_pos_inputObj;


var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var methodOverride = require("method-override");
var morgan = require('morgan');
var util = require('util');   //for inspecting objects
var extend = require('extend');

var moment = require("moment");
var momentDurationFormatSetup = require("moment-duration-format");
var numeral = require("numeral");
var math = require('mathjs');


// Configure the Express application
var app = module.exports = express();
var PORT = process.env.PORT || 3005;


//for firebase
var adminFirebase = require("firebase-admin");
var serviceAccount = require("./pong2108-200301.json");
adminFirebase.initializeApp({
    credential: adminFirebase.credential.cert(serviceAccount),
    databaseURL: "https://pong2108-200301.firebaseio.com"
});


var connConfig;
var database;
var connectionsRef;
var connectedRef;
var dbUserGameStorageMain;
var dbUserStorageArea;
var dbUserStatusFolder;

var dbIncomingRec;
var dbOppStorageArea;
var dbRefreshScreenBit;


//make public folder accessible to browser
app.use(express.static(path.join(__dirname, './app/public')));

//    USER TO REMAIN LOGGED IN   cookies and session
//following lines allow for a user to remain logged in
var cookieParser = require('cookie-parser');
var session = require('express-session');  //allows user to stay logged in
//allow sessions
app.use(session({ secret: 'app', cookie: { maxAge: 6 * 1000 * 1000 * 1000 * 1000 * 1000 * 1000 }, resave: true, saveUninitialized: false }));
app.use(cookieParser());


//need for parsing JSON files
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodyParser.text());
app.use(morgan('dev'));

//allow the use of DELETE
// Override with POST having ?_method=DELETE
//allows the use of PUT and DELETE where it normally wouldn't be allowed
//usage would be:  app.delete(  )
app.use(methodOverride("_method"));


//      HANDLE BARS
// Set Handlebars.
var exphbs = require("express-handlebars");

var hbs = exphbs.create({
    // Specify helpers which are only registered on this instance.
    helpers: {
        if_eq: function (a, b, opts) {
            if (a == b) {
                return opts.fn(this);
            } else {
                return opts.inverse(this);
            }
        },
        foo: function (a) { return 'FOO!' + a; },
        bar: function (b) { return 'BAR!' + b; },
        breaklines: function (text) {
            text = Handlebars.Utils.escapeExpression(text);
            text = text.replace(/(\r\n|\n|\r)/gm, '<br>');
            return new Handlebars.SafeString(text);
        }
    },
    defaultLayout: "../../app/views/layouts/main"
});

app.engine("handlebars", hbs.engine);
app.set("view engine", "handlebars");       //sets default for file type for handlebar


//this is where the browser will go for paths after clicking
// require(path.join(__dirname, './app/routing/apiRoutes'))(app);
//require(path.join(__dirname, './app/routing/htmlRoutes'))(app);
//var groupController = require("./app/controllers/groupController.js");
var applicationController = require("./app/controllers/applicationController.js");
var physicsController = require("./app/controllers/physicsController.js");
var usersController = require("./app/controllers/usersController.js");
//var campaignController = require("./app/controllers/campaignController.js");
//var scheduleController = require("./app/controllers/scheduleController.js");
var adminController = require("./app/controllers/adminController.js");

console.log('all controllers loaded');

//prepends all the paths
app.use("/", applicationController);
app.use("/physics", physicsController);
// app.use("/group", groupController);
app.use("/users", usersController);
// app.use("/campaign", campaignController);
// app.use("/schedule", scheduleController);
app.use("/admin", adminController);


// Start listening on PORT
app.listen(PORT, function () {
    console.log('app is up, running, and listening on port: ' + PORT);
});

var timerBallUpd;   //const variable for the update of the ball speed


var ball_pos_calcs = function (play_1, play_2, dist_play, dirFrom) {
    //calculate the positon of the ball
    //works for player #1 to player #2
    //output 

    var slope;
    var theta;
    var PT_x;
    var PT_y;
    var azimuth;
    var coords;

    var degToRad = function (degree) {
        //returns the angle in radians
        var outVal = degree * Math.PI / 180.0;
        return outVal;
    };


    var radToDeg = function (radians) {
        var outVal = radians * 180.0 / Math.PI;
        return outVal;
    };

    var meterToFt = function (_meter) {
        var outVal = parseFloat(_meter) * 3.2808;
        return parseFloat(outVal.toFixed(6))
    };

    var FtToMeter = function (_feet) {
        var outVal = parseFloat(_feet) / 3.2808;
        return parseFloat(outVal.toFixed(6))
    };


    var getPathLength = function (lat1, lon1, lat2, lon2) {
        var lat1_rad, lat2_rad, delta_lat, delta_lon, a, c, dist_meter, R;

        //make sure all the coords are there
        if (lat1 == lat2 && lon1 == lon2) {
            //same set of coords
            return 0;
        };

        R = 6371000;  //rad of earth in meters
        lat1_rad = degToRad(lat1);
        lat2_rad = degToRad(lat2);
        delta_lat = degToRad(lat2 - lat1);
        delta_lon = degToRad(lon2 - lon1);

        a = Math.sin(delta_lat / 2) * Math.sin(delta_lat / 2) + Math.cos(lat1_rad) * Math.cos(lat2_rad) * Math.sin(delta_lon / 2.0) * Math.sin(delta_lon / 2.0);
        c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));

        dist_meter = R * c;
        if (isNaN(dist_meter)) {
            return 0;
        };
        var dist_ft = meterToFt(dist_meter);
        return dist_ft;
    };  //getPathLength


    var getDestLatLon = function (lat, lon, azimuth, dist_ft) {
        var lat2, lon2, R, brng, d_km, lat1, lon1;
        var dist_meter = FtToMeter(dist_ft);
        R = 6378.1;  //radius of the earh in km

        //brng is the degrees converted to radians of the azimuth
        brng = degToRad(azimuth);
        d_km = dist_meter / 1000.0
        lat1 = degToRad(lat);
        lon1 = degToRad(lon);
        lat2 = Math.asin(Math.sin(lat1) * Math.cos(d_km / R) + Math.cos(lat1) * Math.sin(d_km / R) * Math.cos(brng));
        lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d_km / R) * Math.cos(lat1), Math.cos(d_km / R) - Math.sin(lat1) * Math.sin(lat2));

        //now need it back to degrees
        lat2 = radToDeg(lat2);
        lon2 = radToDeg(lon2);
        return [parseFloat(lat2.toFixed(6)), parseFloat(lon2.toFixed(6))];
    };


    var calculateBearing = function (lat1, lon1, lat2, lon2) {
        var startLat, startLon, endLat, endLon, dLon, dPhi, bearing;

        startLat = degToRad(lat1);
        startLon = degToRad(lon1);
        endLat = degToRad(lat2);
        endLon = degToRad(lon2);
        dLon = endLon - startLon;
        dPhi = Math.log(Math.tan(endLat / 2.0 + Math.PI / 4.0) / Math.tan(startLat / 2.0 + Math.PI / 4.0));

        if (Math.abs(dLon) > Math.PI) {
            if (dLon > 0) {
                dLon = -(2.0 * Math.PI - dLon)
            } else {
                dLon = (2.0 * Math.PI + dLon)
            }
        }

        bearing = (radToDeg(Math.atan2(dLon, dPhi)) + 360.0) % 360.0;
        return bearing;
    };


    var getCoordinates = function (lat1, lon1, lat2, lon2) {

    };





    if (play_2.coord_X === play_1.coord_X) {
        //they are vertical, so can not calculate slopw
        PT_y = dist_play;
        PT_x = 0.0;
    } else {
        theta = Math.atan2(play_2.coord_Y - play_1.coord_Y, play_2.coord_X - play_1.coord_X);
        PT_y = dist_play * Math.sin(theta);
        slope = (play_2.coord_Y - play_1.coord_Y) / (play_2.coord_X - play_1.coord_X);
        if (slope == 0) {
            PT_x = dist_play;
        } else {
            PT_x = PT_y / slope;
        }
    };

    //have not accounted for the direction of the ball
    var outputObj = {};
    outputObj.pos_X = play_1.coord_X + PT_x;
    outputObj.pos_Y = play_1.coord_Y + PT_y;

    //calculate the lat/lon coordinates
    var dist_ball_meter;
    var dist_between_play;
    var distCoordArray;
    if ( dirFrom == 1) {
        //from player #1 to player #2
        azimuth = calculateBearing(play_1.locat_GPS_lat, play_1.locat_GPS_lon, play_2.locat_GPS_lat, play_2.locat_GPS_lon);
        dist_ball_meter = FtToMeter(dist_play);
        dist_between_play = getPathLength(play_1.locat_GPS_lat, play_1.locat_GPS_lon, play_2.locat_GPS_lat, play_2.locat_GPS_lon);
        distCoordArray = getDestLatLon(play_1.locat_GPS_lat, play_1.locat_GPS_lon, azimuth, dist_play);
    } else if ( dirFrom == 2) {
        azimuth = calculateBearing(play_2.locat_GPS_lat, play_2.locat_GPS_lon, play_1.locat_GPS_lat, play_1.locat_GPS_lon);
        dist_ball_meter = FtToMeter(dist_play);
        dist_between_play = getPathLength(play_1.locat_GPS_lat, play_1.locat_GPS_lon, play_2.locat_GPS_lat, play_2.locat_GPS_lon);
        distCoordArray = getDestLatLon(play_2.locat_GPS_lat, play_2.locat_GPS_lon, azimuth, dist_play);
    };
    //console.log("dist btw players = " + dist_between_play);

    outputObj.loc_GPS_lat = distCoordArray[0];
    outputObj.loc_GPS_lon = distCoordArray[1];
    return outputObj;
};


var ball_calcs = function (snap, useLocal) {
    //normally only called on a callback from the firebase read
    //but, if firebase is down, call this function also
    var isBallAct;

    fbase_ball_pos_inputObj = {};
    if (useLocal == false) {
        //equivalent to jquery.extend.  will pick off only
        //keys with .val()
        extend(true, fbase_ball_pos_inputObj, snap.val());
    } else {
        //make a copy of the outgoting to the incoming
        extend(true, fbase_ball_pos_inputObj, fbase_ballpos_outputObj);
        //console.log("inputObj after copy=" + util.inspect(fbase_ball_pos_inputObj, false, null ) );
    };
    var fbio = fbase_ball_pos_inputObj;  //shorthand notation
    if (fbio.ball_active == 1) {
        isBallAct = true;
    } else {
        isBallAct = false;
    };

    //   console.log("snap=" + util.inspect(fbase_ball_pos_inputObj, false, null ) );
    //only update after having read on in
    var timeNow_unix = moment().valueOf();
    var timeElapsed_ms = moment.duration(timeNow_unix - fbio.time.start_unix).valueOf();
    //if the ball is not active then time elapsed is set to 0
    if (isBallAct) {
        timeElapsed_ms = timeElapsed_ms * fbio.speed_up_fact;
    } else {
        timeElapsed_ms = 0;
    };
    //solve dist = 1/2 * accel * t^2
    //in order to solve physics problem, need to find out how long accelerating
    //time accelerating can not be more than accel time limit
    let timeAccel = 0.0;
    let timeVel = 0.0;
    if (timeElapsed_ms > (fbio.ball_physics.accel_time * 1000)) {
        //ball is beyond the accel zone
        timeAccel = fbio.ball_physics.accel_time;
        timeVel = (timeElapsed_ms / 1000.0) - fbio.ball_physics.accel_time;
    } else {
        //ball is still in the accel zone
        timeAccel = timeElapsed_ms / 1000.0;
        timeVel = 0.0
    };
    //find out what the velocity is after accel is done
    //console.log("accel = " + timeAccel);
    //console.log("time vel = " + timeVel);
    let velConst = (fbio.ball_physics.accel_val * timeAccel);
    //console.log('veloc = ' + velConst);
    let distTravel_in = (0.5 * fbio.ball_physics.accel_val * timeAccel * timeAccel) + velConst * timeVel;

    fbio.time.elapsed_unix = timeElapsed_ms;
    var fbo = fbase_ballpos_outputObj; //shorthand notation

    //assume player #1 hit the ball, if not, then just revers the distances
    fbio.dist.play_1 = distTravel_in / 12.0;
    fbio.dist.play_2 = fbio.dist.between - fbio.dist.play_1;
    if (fbio.hit_play_2 == 1) {
        //player 1 hit the ball 
        let temp1 = fbio.dist.play_2;
        fbio.dist.play_2 = fbio.dist.play_1;
        fbio.dist.play_1 = temp1;
    };

    fbo.ball_physics.curr_vel = velConst;
    fbo.dist.play_1 = fbio.dist.play_1;
    fbo.dist.play_2 = fbio.dist.play_2;
    let distIn = (fbio.dist.play_1 / 12);
    if (fbo.ball_physics.curr_vel === 0) {
        //can't divide by zero, so make the time be really big
        fbo.time.play_1 = 0.0;
        fbo.time.play_2 = 0.0;
    } else {
        fbo.time.play_1 = ((fbo.dist.play_1 * 12) / fbo.ball_physics.curr_vel) / fbo.speed_up_fact;
        fbo.time.play_2 = ((fbo.dist.play_2 * 12) / fbo.ball_physics.curr_vel) / fbo.speed_up_fact;
    };

    //check if there is a miss
    //if it is beyon he players, kill it
    if (Math.abs(parseFloat(fbo.time.play_2)) <= parseFloat(fbo.play_2.hit_time_win)) {
        //valid hit for player #1
        fbo.ball_active = 1;
        fbo.dirFrom = 2;
    } else {
        //missed
        console.log("player #2 missed");
        fbo.ball_active = 0;  //was 0
        fbo.dirFrom = 0;
        fbo.miss_play_2 = 1;

    fbo.time.elapsed_unix = timeElapsed_ms;
    var outBallPosObj;
    if (fbio.dirFrom == 1) {
        outBallPosObj = ball_pos_calcs(fbo.play_1, fbo.play_2, fbio.dist.play_1, fbio.dirFrom);
    } else if (fbio.dirFrom == 2) {
        outBallPosObj = ball_pos_calcs(fbo.play_1, fbo.play_2, fbio.dist.play_2, fbio.dirFrom);        
    };

    if (isBallAct) {
        //only update the ball position if the ball is active
        fbo.ball_curr_pos.pos_X = outBallPosObj.pos_X;
        fbo.ball_curr_pos.pos_Y = outBallPosObj.pos_Y;
        fbo.ball_curr_pos.loc_GPS_lat = outBallPosObj.loc_GPS_lat;
        fbo.ball_curr_pos.loc_GPS_lon = outBallPosObj.loc_GPS_lon;    
    };

    //need to find the center of the field
    fbo.field.center_coord_X = (parseFloat(fbo.play_2.coord_X) - parseFloat(fbo.play_1.coord_X)) / 2.0 + parseFloat(fbo.play_1.coord_X);
    fbo.field.center_coord_Y = (parseFloat(fbo.play_2.coord_Y) - parseFloat(fbo.play_1.coord_Y)) / 2.0 + parseFloat(fbo.play_1.coord_Y);
    //in this case, the direction of the ball does not matter ?
    var centerPosObj = ball_pos_calcs(fbo.play_1, fbo.play_2, fbio.dist.between / 2.0, 1 );
    fbo.field.center_locat_GPS_lat = centerPosObj.loc_GPS_lat;
    fbo.field.center_locat_GPS_lon = centerPosObj.loc_GPS_lon;

    //dbUserGameStorageMain.set(fbase_ballpos_outputObj);
    writeFirebaseRec();
    /*
    if (configData.firebaseActive == true) {
        dbUserGameStorageMain.set(fbo);
    };
    */
};


//put in the logic to run the physics engine now
var update_ball_pos = function () {
    //console.log('update position');
    if (configData.firebaseActive == true) {
        //only run these routines if firebase is active
        dbIncomingRec = database.ref(configData.firebaseMainGame);
        //dbIncomingRec.on("value", function (snap) {
        dbIncomingRec.once("value", function (snap) {
            //a valud read was done
            ball_calcs(snap, false);
        });
    } else {
        //console.log(fbase_ballpos_outputObj);
        var snap = {};
        balln_calcs(snap, true)
    };
};



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
    _game_soeed_up_fact,
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
    this.game_soeed_up_fact = _game_soeed_up_fact;
    this.start_time_unix = _start_time_unix;
    this.stop_time_unix = _stop_time_unix;
    this.isGameRunning = _isGameRunning;
};


writeFirebaseRec = function () {
    if (configData.firebaseActive == true) {
        dbUserGameStorageMain.set(fbase_ballpos_outputObj);
        //console.log("ball lat #5 = " + fbase_ballpos_outputObj.ball_curr_pos.loc_GPS_lat);
        //console.log("ball lon #5 = " + fbase_ballpos_outputObj.ball_curr_pos.loc_GPS_lon);      
    };
};



var read_game_rec = function (_game_id) {
    //constructor for record coming from the database
    var query = "SELECT * FROM games WHERE game_id=?";

    return new Promise(function (resolve, reject) {
        connection.query(query, [_game_id], function (err, response) {
            if (err) {
                console.log("err at read game rec = ");
                console.log(err);
            } else {
                resolve(response);
            };
        });
    })
};




write_ball_hit_rec = function (_game_id, _player_num, _type_hit, _result_hit, _ball_active) {
    //will have to be some kind of ball hit.  need to know:
    //player number and type of hit ?
    var startTime_str = moment().format("YYYY-MM-DD HH:mm:ss a");

    //var _game_id = 1;
    var _ball_hit_id = 1;
    var _time_start_str = startTime_str;

    var _time_start_unix = 0;
    var _time_stop_unix = 0;
    var _start_pos_loc_GPS_lat = 42.050377;
    var _start_pos_loc_GPS_lon = -87.684347;
    var _stop_pos_loc_GPS_lat = 41.896041;
    var _stop_pos_loc_GPS_lon = -87.618772;
    var _dist_between = 100.45;   //feet between
    //var _type_hit = "SERVE";
    //var _result_hit = "GOOD";
    //var _player_num = 1;          comes in from the params
    var _ball_accel_val = 0.00;
    var _ball_accel_tim = 0.00;
    var _ball_vel = 5.00;         //in per second
    var _ball_angle = 0.00;
    var _speed_up_fact = fbase_ballpos_outputObj.speed_up_fact;

    var query = "INSERT INTO ball_hits ( ";
    query += "game_id,  ball_active, time_start_unix, time_stop_unix, start_pos_loc_GPS_lat, ";
    query += "start_pos_loc_GPS_lon, stop_pos_loc_GPS_lat, stop_pos_loc_GPS_lon, ";
    query += "dist_between, type_hit, result_hit, player_num, ball_accel_val, ";
    query += "ball_accel_tim, ball_vel, ball_angle, speed_up_fact ) ";
    query += "VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )";

    //console.log(query);
    var queryArray = [
        _game_id,
        _ball_active,
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

    return new Promise(function (resolve, reject) {
        connection.query(query, queryArray, function (err, response) {
            if (err) {
                console.log("error at write ball hit game = \n" + err);
                reject(err);
            } else {
                //write to audit file
                resolve("saved");
            };
        }); //connection query
    });
};


setBallToPlayer = function( fbaseTempObj, _playNum ) {
    if (_playNum == 1) {
        //put the ball on player #1 spot
        fbaseTempObj.ball_curr_pos.pos_X = parseFloat(fbase_ballpos_outputObj.play_1.coord_X);
        fbaseTempObj.ball_curr_pos.pos_Y = parseFloat(fbase_ballpos_outputObj.play_1.coord_Y);
        fbaseTempObj.ball_curr_pos.loc_GPS_lat = parseFloat(fbase_ballpos_outputObj.play_1.locat_GPS_lat);
        fbaseTempObj.ball_curr_pos.loc_GPS_lon = parseFloat(fbase_ballpos_outputObj.play_1.locat_GPS_lon);
        fbaseTempObj.ball_active = 0;
        fbaseTempObj.hit_play_1 = 0;
        fbaseTempObj.hit_play_2 = 0;
        fbaseTempObj.miss_play_1 = 0;
        fbaseTempObj.miss_play_2 = 0;
        fbaseTempObj.time.play_1 = 0.0;
        fbaseTempObj.time.play_2 = fbaseTempObj.play_2.hit_time_win * 10.0;
        fbaseTempObj.dirFrom = 0;
      };
    
    
      if (_playNum == 2) {
        //put the ball on player #1 spot
        console.log("set ball to player #2");
        fbaseTempObj.ball_curr_pos.pos_X = parseFloat(fbase_ballpos_outputObj.play_2.coord_X);
        fbaseTempObj.ball_curr_pos.pos_Y = parseFloat(fbase_ballpos_outputObj.play_2.coord_Y);
        fbaseTempObj.ball_curr_pos.loc_GPS_lat = parseFloat(fbase_ballpos_outputObj.play_2.locat_GPS_lat);
        fbaseTempObj.ball_curr_pos.loc_GPS_lon = parseFloat(fbase_ballpos_outputObj.play_2.locat_GPS_lon);
        fbaseTempObj.ball_active = 0;
        fbaseTempObj.hit_play_1 = 0;
        fbaseTempObj.hit_play_2 = 0;
        fbaseTempObj.miss_play_1 = 0;
        fbaseTempObj.miss_play_2 = 0;
        fbaseTempObj.time.play_1 = fbaseTempObj.play_1.hit_time_win * 10.0;
        fbaseTempObj.time.play_2 = 0.0;
        fbaseTempObj.dirFrom = 0;
        console.log("ball lat #1 = " + fbaseTempObj.ball_curr_pos.loc_GPS_lat);
        console.log("ball lon #1 = " + fbaseTempObj.ball_curr_pos.loc_GPS_lon);
      };    
}



function ball_hit_rec_type(
    _game_id,
    _ball_hit_id,
    _ball_active,
    _time_start_str,
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
) {
    this.game_id = _game_id;
    this.ball_hit_id = _ball_hit_id;
    this.ball_active = _ball_active;
    this.time_start_st = _time_start_str;
    this.time_start_unix = _time_start_unix;
    this.time_stop_unix = _time_stop_unix;
    this.start_pos_loc_GPS_lat = _start_pos_loc_GPS_lat;
    this.start_pos_loc_GPS_lon = _start_pos_loc_GPS_lon;
    this.stop_pos_loc_GPS_lat = _stop_pos_loc_GPS_lat;
    this.stop_pos_loc_GPS_lon = _stop_pos_loc_GPS_lon;
    this.dist_between = _dist_between;
    this.type_hit = _type_hit;
    this.result_hit = _result_hit;
    this.player_num = _player_num;
    this.ball_accel_val = _ball_accel_val;
    this.ball_accel_tim = _ball_accel_tim;
    this.ball_vel = _ball_vel;
    this.ball_angle = _ball_angle;
    this.speed_up_fact = _speed_up_fact;
};



hit_ball = function (_game_id, _player_num, _type_hit_int, _result_hit) {
    //incoming player_num is player who hit the ball
    console.log("sub = hit_ball");
    console.log("player = ", _player_num);

    //write to Firebase first, then mySQl
    //this will allow the remotes to begin to catch up
    fbase_ballpos_outputObj.time_start_str = moment().format("YYYY-MM-DD  HH:mm:ss a");
    fbase_ballpos_outputObj.time.start_unix = moment().valueOf();
    //fbase_ballpos_outputObj.speed_up_fact = 1.0;

    var init_ball_accel_val = 410.0;
    var init_ball_accel_tim = 3.00;
    var init_ball_vel = 1232.00;    //in/sec  or 70mph
    var init_ball_angle = 0.00;
    var init_speed_up_fact = fbase_ballpos_outputObj.speed_up_fact;

    var init_ball_pos_Z = 10.00;

    var init_ball_active = 1;  //right now all hits make it active

    var out_ball_hit_rec;
    //a player has hit the ball, so need to pull record from
    //game settings and push it onto a single player
    read_game_rec(_game_id).then(function (result) {
        var rc = result[0]; //short hand
        //a valid game rec has been read
        //check if the ball was not active then it was a server
        if (fbase_ballpos_outputObj.ball_active === 0) {
            //the ball was not active so it is a serve
            _type_hit_int = 0;  //serve
            //need to find out who should serve
            if (_player_num == 1) {
                fbase_ballpos_outputObj.ball_active = 1;
                fbase_ballpos_outputObj.dirFrom = 1;
            } else if (_player_num == 2) { 
                fbase_ballpos_outputObj.ball_active = 1;
                fbase_ballpos_outputObj.dirFrom = 2;                
            }
        } else {
            //check if it is valid hit
            //if the ball was not coming to the user, then ignore it
            if (_player_num == 1) {
                if (Math.abs(parseFloat(fbase_ballpos_outputObj.time.play_1)) <= parseFloat(fbase_ballpos_outputObj.play_1.hit_time_win)) {
                    //valid hit for player #1
                    fbase_ballpos_outputObj.ball_active = 1;
                    fbase_ballpos_outputObj.dirFrom = 1;
                } else {
                    //missed
                    console.log("player #1 missed");
                    fbase_ballpos_outputObj.ball_active = 0;  //was 0
                    fbase_ballpos_outputObj.dirFrom = 0;
                    fbase_ballpos_outputObj.miss_play_1 = 1;
                };
            } else {
                //must be player num 2
                if (Math.abs(parseFloat(fbase_ballpos_outputObj.time.play_2)) <= parseFloat(fbase_ballpos_outputObj.play_2.hit_time_win)) {
                    //valid hit for player #1
                    fbase_ballpos_outputObj.ball_active = 1;
                    fbase_ballpos_outputObj.dirFrom = 2;
                } else {
                    //missed
                    console.log("player #2 missed");
                    fbase_ballpos_outputObj.ball_active = 0;  //was 0
                    fbase_ballpos_outputObj.dirFrom = 0;
                    fbase_ballpos_outputObj.miss_play_2 = 1;
                };
            };
        };

        switch (_type_hit_int) {
            case 0:        //serve
                _type_hit = "serve";
                _type_result = "good";
                write_ball_hit_rec(_game_id, _player_num, _type_hit, _type_result, 1);
                break;
            case 1:        //good hit
                break;
            case 2:        //miss
                break;
        };

        if (_player_num === 1) {
            //first player   
            out_ball_hit_rec = new ball_hit_rec_type(
                _game_id,
                0, //ball hit id
                init_ball_active,
                moment().format("YYYY-MM-DD HH:mm:ss a"),
                moment().valueOf(),
                0,
                rc.player_1_locat_GPS_lat,
                rc.player_1_locat_GPS_lon,
                0.00,
                0.00,
                rc.dist_players,
                _type_hit,
                _result_hit,
                1, //play num
                init_ball_accel_val,
                init_ball_accel_tim,
                init_ball_vel,
                init_ball_angle,
                init_speed_up_fact
            );
            fbase_ballpos_outputObj.hit_play_1 = 1;
            fbase_ballpos_outputObj.hit_play_2 = 0;
        } else {
            //second player
            out_ball_hit_rec = new ball_hit_rec_type(
                _game_id,
                0, //ball hit id
                moment().format("YYYY-MM-DD HH:mm:ss a"),
                moment().valueOf(),
                0,
                rc.player_2_locat_GPS_lat,
                rc.player_2_locat_GPS_lon,
                0.00,
                0.00,
                rc.dist_players,
                _type_hit,
                _result_hit,
                2, //play num
                init_ball_accel_val,
                init_ball_accel_tim,
                init_ball_vel,
                init_ball_angle,
                init_speed_up_fact
            );
            fbase_ballpos_outputObj.hit_play_1 = 0;
            fbase_ballpos_outputObj.hit_play_2 = 1;
        };

        //setup the firebase variables
        var fbo = fbase_ballpos_outputObj; //shorthand
        fbo.game_id = _game_id;
        fbo.ball_physics.curr_vel = init_ball_vel;
        fbo.ball_physics.accel_val = init_ball_accel_val;
        fbo.ball_physics.accel_time = init_ball_accel_tim;
        fbo.ball_physics.angle = init_ball_angle;
        fbo.ball_curr_pos.loc_GPS_lat = out_ball_hit_rec.start_pos_loc_GPS_lat;
        fbo.ball_curr_pos.loc_GPS_lon = out_ball_hit_rec.start_pos_loc_GPS_lon;
        if (fbo.hit_play_1 === 1) {
            //player #1 hit the ball, so move his recs from game rec
            //to firebase
            fbo.ball_curr_pos.loc_GPS_lat = rc.player_1_locat_GPS_lat;
            fbo.ball_curr_pos.loc_GPS_lon = rc.player_1_locat_GPS_lon;
            fbo.ball_curr_pos.pos_X = rc.player_1_coord_X;
            fbo.ball_curr_pos.pos_Y = rc.player_1_coord_Y;
            fbo.ball_curr_pos.pos_Z = init_ball_pos_Z;
            fbo.dist.between = rc.dist_players;
            fbo.dist.play_1 = 0.0;
            fbo.dist.play_2 = rc.dist_players;
        } else {
            //must be player #1
            fbo.ball_curr_pos.loc_GPS_lat = rc.player_2_locat_GPS_lat;
            fbo.ball_curr_pos.loc_GPS_lon = rc.player_2_locat_GPS_lon;
            fbo.ball_curr_pos.pos_X = rc.player_2_coord_X;
            fbo.ball_curr_pos.pos_Y = rc.player_2_coord_Y;
            fbo.ball_curr_pos.pos_Z = init_ball_pos_Z;
            fbo.dist.between = rc.dist_players;
            fbo.dist.play_1 = rc.dist_players;
            fbo.dist.play_2 = 0.0;
        };

    }, function (err) {
        //invalid read
        console.log("can not hit ball no game stored");
    });
};



var timer_check_if_update = function () {
    //check if there should be an update

    var query = "SELECT * FROM engine_stats";

    //console.log('query = ' + query);

    connection.query(query, function (err, response) {
        // console.log('err = ' + err);
        // console.log('response = ' + response);
        running_stat = response[0].isRunning;
        if (response[0].isRunning || response[0].isRunning != 0) {
            samp_time_ball = response[0].samp_time_ball;

            if (timerBallUpd === undefined || timerBallUpd === null) {
                //timer is not currently setup to run.  only then 
                //start it up, otherwise will have duplicates
                console.log('turning on timer');
                timerBallUpd = setInterval(update_ball_pos, (samp_time_ball * 1000.0));
                //timerBallUpd = setInterval(update_ball_pos, 3000);
            };
        } else {
            if (timerBallUpd !== undefined && timerBallUpd !== null) {
                //if (timerBallUpd['0'] !== null) {
                //timer is defined and running, but want to shut off
                console.log('turning off the timer');
                clearInterval(timerBallUpd);
                timerBallUpd = null;
                //console.log(timerBallUpd['0']);
                //};
            };
        };
    });
};


var initRoutines = function () {
    console.log("init routine");
    setInterval(timer_check_if_update, 5000);
    if (configData.firebaseActive == true) {
        startConnection();
    };
    //next line ensures that init runs only once
    initRoutines = function () { };
};


var startConnection = function () {
    console.log("connecting to Firebase");

    //startConnection = function() { };
    //firebase.initializeApp(connConfig);
    // Create a variable to reference the database.
    database = adminFirebase.database();

    // -------------------------------------------------------------- (CRITICAL - BLOCK) --------------------------- //
    // connectionsRef references a specific location in our database.
    // All of our connections will be stored in this directory.
    connectionsRef = database.ref("/connections");
    dbUserGameStorageMain = database.ref(configData.firebaseMainGame);
    dbUserStatusFolder = database.ref(configData.firebaseStatusFolder);
    dbRefreshScreenBit = database.ref(configData.firebaseRefreshBit);

    // '.info/connected' is a special location provided by Firebase that is updated every time
    // the client's connection state changes.
    // '.info/connected' is a boolean value, true if the client is connected and false if they are not.
    connectedRef = database.ref(".info/connected");

    /*
    // When the client's connection state changes...
    connectedRef.on("value", function (snap) {
        // If they are connected..
        if (snap.val()) {   //executes with the value is finally set to true

            // Add user to the connections list.
            var con = connectionsRef.push(true);

            // Remove user from the connection list when they disconnect.
            con.onDisconnect().remove();
        }
    });
    */

    /*
    dbRefreshScreenBit.on("value", function (snap) {
        //refresh bit has been triggers
        console.log(snap);
        // If they are connected..
        if (snap.val()) {   //executes with the value is finally set to true
            connectionObj.refreshScreenBit = true;
        } else {
            connectionObj.refreshScreenBit = false;
        };
        //refresh the user list
        //make sure that it doesn't pop the window open
        dispAllUsersOnPage_start(true);
    });
    */

    /*
    // When first loaded or when the connections list changes...
    connectionsRef.on("value", function (snap) {
        // Display the viewer count in the html.
        // The number of online users is the number of children in the connections list.
        connectionObj.currNumberOfConn = snap.numChildren();
        $("#numUsers").text(connectionObj.currNumberOfConn + " active connections");
        //only change the user name if the linkActice switches
        if (connectionObj.linkActive === false) {
            connectionObj.linkActive = true;  //link is active
            connectionObj.currUserRec.outRec.ID = configData.firebaseStorage + moment().valueOf();
            dbUserStorageArea = database.ref(connectionObj.currUserRec.outRec.ID);
            dbUserStorageArea.onDisconnect().remove();
            console.log("started the connection");
            connectionObj.writeCurrUserRec();
            //            dispAllUsersOnPage_start(true);   //refresh entire area
            showLinkButtonStatus();

            //now get the incoming record's location and set a listener on it
            dbIncomingRec = database.ref(connectionObj.currUserRec.outRec.ID + "/inRec");
            dbIncomingRec.on("value", function (snap) {
                //a new incoming record
                //store the record to memory
                connectionObj.writeDBtoInRec(snap);
                evalIncomingRec();
            });
        };
        console.log("new connection detected");
        //setTimeout(dispAllUsersOnPage_start(true), 5000);
    });
    */
   writeFirebaseRec();   //write the firebase record once on startup

};



initRoutines();
//setInterval(timer_check_if_update, 5000);



