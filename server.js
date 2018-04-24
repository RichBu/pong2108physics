

//global variable .... must leave off the "var", "const", or "let"


configData = {
    mySQLforceRemote: true,
    gKeyOther: "AIzaSyAE03QBe5yDXRr1fzDvkWs9i_E_BIyCDhk",
    gKeyRich: "AIzaSyCrHKoPEISSoDAClePzcHVJVHB7G1-xb6s",
    firebaseStorage: "/games/user",         //prior to tacking on user number
    firebaseMainGame: "/games",
    firebaseStatusFolder: "/status",
    firebaseRefreshBit: "/status/refreshUsers",
    firebaseActive: true,
    isDemoMode: true,
    demoNumHits: 0,     //number of hits 
    demoMaxNumHits: 2,
    demoAddrNum: 0,
    demoAddrArray: [
        '1801 Maple Ave. Evanston, IL 60208',
        '340 E. Superior St. Chicago, IL 60611',
        '6615 Roosevelt Rd, Berwyn, IL 60402',
        '233 S. Wacker Dr Chicago, IL 60606',
        '65 Dover Drive Des Plaines, IL 60018',
        '1200 W. Harrison St. Chicago, IL 60607',
        '1464 Industrial Dr. Itasca, IL 60143'
    ],
    isMovingPlayer: 0

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
        hit_time_win: 0.0,
        //serve_in_prog: 0        //serve in progress
    },
    play_2: {
        id: 1,
        coord_X: 0.0,
        coord_Y: 0.0,
        locat_GPS_lat: 0.0,
        locat_GPS_lon: 0.0,
        locat_addr: "",
        hit_time_win: 0.0,
        //serve_in_prog: 0        //serve in progress
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
var bcalcs = require('./app/modules/bcalcs-mod.js');



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


clearHitMissFirebaseObj = function () {
    //init Firebase object to not be hitting or running
    fbase_ballpos_outputObj.hit_play_1 = 0;
    fbase_ballpos_outputObj.hit_play_2 = 0;
    fbase_ballpos_outputObj.miss_play_1 = 0;
    fbase_ballpos_outputObj.miss_play_2 = 0;
    fbase_ballpos_outputObj.dirFrom = 0;
    writeFirebaseRec();
};


toggleFirebaseScreenRefresh = function () {
    //toggle the screen refresh by setting then resetting the time
    var temp = fbase_ballpos_outputObj.time.elapsed_unix;
    fbase_ballpos_outputObj.time.elapsed_unix = -1.0;
    writeFirebaseRec();
    fbase_ballpos_outputObj.time.elapsed_unix = temp;
    writeFirebaseRec();
};


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
    if (dirFrom == 1) {
        //from player #1 to player #2
        azimuth = bcalcs.calculateBearing(play_1.locat_GPS_lat, play_1.locat_GPS_lon, play_2.locat_GPS_lat, play_2.locat_GPS_lon);
        dist_ball_meter = bcalcs.FtToMeter(dist_play);
        dist_between_play = bcalcs.getPathLength(play_1.locat_GPS_lat, play_1.locat_GPS_lon, play_2.locat_GPS_lat, play_2.locat_GPS_lon);
        distCoordArray = bcalcs.getDestLatLon(play_1.locat_GPS_lat, play_1.locat_GPS_lon, azimuth, dist_play);
    } else if (dirFrom == 2) {
        azimuth = bcalcs.calculateBearing(play_2.locat_GPS_lat, play_2.locat_GPS_lon, play_1.locat_GPS_lat, play_1.locat_GPS_lon);
        dist_ball_meter = bcalcs.FtToMeter(dist_play);
        dist_between_play = bcalcs.getPathLength(play_1.locat_GPS_lat, play_1.locat_GPS_lon, play_2.locat_GPS_lat, play_2.locat_GPS_lon);
        distCoordArray = bcalcs.getDestLatLon(play_2.locat_GPS_lat, play_2.locat_GPS_lon, azimuth, dist_play);
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
        timeElapsed_ms = timeElapsed_ms;  //had speed up here
    } else {
        timeElapsed_ms = 0;  //stops updating the screen
        //timeElapsed_ms = timeElapsed_ms;  //had speed up here
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
    let velConst = (fbio.ball_physics.accel_val * timeAccel) * fbio.speed_up_fact;
    //console.log('veloc = ' + velConst);
    let distTravel_in = (0.5 * fbio.ball_physics.accel_val * timeAccel * timeAccel) * fbio.speed_up_fact + velConst * timeVel;

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
        fbo.time.play_1 = ((fbo.dist.play_1 * 12) / fbo.ball_physics.curr_vel); //had speed up fact here before ?
        fbo.time.play_2 = ((fbo.dist.play_2 * 12) / fbo.ball_physics.curr_vel);
    };

    //check if there is a miss
    //if it is beyond the players, kill it
    if (fbo.dirFrom == 1) {
        //it is going from player #1 to player #2
        if ((parseFloat(fbo.time.play_2) < 0) && Math.abs(parseFloat(fbo.time.play_2)) > parseFloat(fbo.play_2.hit_time_win)) {
            //missed
            console.log("player #2 missed");
            console.log("time to play #1 = " + parseFloat(fbo.time.play_1));
            console.log("time to play #2 = " + parseFloat(fbo.time.play_2));
            fbo.ball_active = 0;  //was 0
            fbo.dirFrom = 0;
            fbo.miss_play_2 = 1;
        };
    } else {
        //ball is going from player #2 to player #1
        if ((parseFloat(fbo.time.play_1) < 0) && Math.abs(parseFloat(fbo.time.play_1)) > parseFloat(fbo.play_1.hit_time_win)) {
            //missed
            console.log("player #1 missed");
            console.log("time to play #1 = " + parseFloat(fbo.time.play_1));
            console.log("time to play #2 = " + parseFloat(fbo.time.play_2));
            fbo.ball_active = 0;  //was 0
            fbo.dirFrom = 0;
            fbo.miss_play_1 = 1;
        };
    };
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
    var centerPosObj = ball_pos_calcs(fbo.play_1, fbo.play_2, fbio.dist.between / 2.0, 1);
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
    //this is the update ball position, so check if it is demo mode
    //clearInterval(timerBallUpd);

    if (configData.isMovingPlayer != 1) {
        //only update the routine if not in process of moving a player
        var fbo = fbase_ballpos_outputObj;
        fbo.dirFrom = parseInt(fbo.dirFrom);
        if (fbo.ball_active == 1 && configData.isDemoMode == true) {
            //it is a demo mode so now check which direction and if should hit
            var fixed_game_id = 1;
            var fixed_type_hit_int = 0;  //for serve
            var fixed_type_hit = "serve";
            var fixed_result_hit = "good";
            var player_hit;

            //console.log("dir=" + fbo.dirFrom);
            if (fbo.dirFrom == 1 && parseFloat(fbo.time.play_2) != 0.0) {
                if (Math.abs(parseFloat(fbo.time.play_2)) < parseFloat(fbo.play_2.hit_time_win)) {
                    //the ball should be hit from player #2 to player #1
                    player_hit = 2;
                    console.log("demo mode play #2 hit");
                    console.log("dir before=" + fbo.dirFrom);
                    hit_ball(fixed_game_id, player_hit, fixed_type_hit_int, fixed_result_hit);
                    console.log("dir after=" + fbo.dirFrom);
                };
            } else if (fbo.dirFrom == 2 && parseFloat(fbo.time.play_1) != 0.0 && configData.isMovingPlayer === 0) {
                if (Math.abs(parseFloat(fbo.time.play_1)) < parseFloat(fbo.play_1.hit_time_win)) {
                    //the ball should be hit from player #1 to player #2
                    console.log("demo mode play #1 entered");
                    console.log("#472 dir=" + fbo.dirFrom);
                    configData.demoNumHits++;  //increase the number of hit
                    if (configData.demoNumHits >= configData.demoMaxNumHits) {
                        //need to move the player
                        //first stop the action by "serving the ball" at player #1
                        configData.demoNumHits = 0;
                        setBallToPlayer(fbase_ballpos_outputObj, 1);
                        configData.demoAddrNum++;
                        if (configData.demoAddrNum >= configData.demoAddrArray.length) {
                            configData.demoAddrNum = 1;
                        };
                        var playAddrStr = configData.demoAddrArray[configData.demoAddrNum - 1];
                        //console.log("addr = \n" + playAddrStr);
                        var playGeoLoc = {
                            lat: 0.0,
                            lon: 0.0
                        };
                        configData.isMovingPlayer = 1;
                        movePlayerPos_async(fixed_game_id, 1, playAddrStr, playGeoLoc, true, false, false).then(
                            (response2) => {
                                //player has moved
                                //console.log('promise #1')
                                setBallToPlayer(fbase_ballpos_outputObj, 1);
                                playAddrStr = configData.demoAddrArray[configData.demoAddrNum];
                                //console.log("addr = \n" + playAddrStr);
                                movePlayerPos_async(fixed_game_id, 2, playAddrStr, playGeoLoc, true, false, true).then(
                                    (response3) => {
                                        //second address found and moved
                                        player_hit = 1;
                                        console.log('promise #2');
                                        //console.log('demo mode play #1 hit');
                                        //console.log("dir before=" + fbo.dirFrom);
                                        configData.isMovingPlayer = 0;
                                        timerBallUpd = setInterval(update_ball_pos, (samp_time_ball * 1000.0));
                                        hit_ball(fixed_game_id, player_hit, fixed_type_hit_int, fixed_result_hit);
                                        //console.log("dir after=" + fbo.dirFrom);
                                    }); //last false is update
                            }) //last false is update
                    } else {
                        //did not move the player so can hit 
                        //identical to call back function
                        player_hit = 1;
                        //console.log('call ...demo mode play #1 hit');
                        //console.log("dir before=" + fbo.dirFrom);
                        hit_ball(fixed_game_id, player_hit, fixed_type_hit_int, fixed_result_hit);
                        //console.log("dir after=" + fbo.dirFrom);
                    };
                };
            };
        };
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
        //if (configData.isMovingPlayer === 0) timerBallUpd = setInterval(update_ball_pos, (samp_time_ball * 1000.0));
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

    var fbo = fbase_ballpos_outputObj;
    fbo.dirFrom = parseInt(fbo.dirFrom);
    var _time_start_unix = 0;
    var _time_stop_unix = 0;

    var _start_pos_loc_GPS_lat;
    var _start_pos_loc_GPS_lon;

    var _start_pos_loc_GPS_lat = fbo.ball_curr_pos.loc_GPS_lat;
    var _start_pos_loc_GPS_lon = fbo.ball_curr_pos.loc_GPS_lon;
    var _stop_pos_loc_GPS_lat;
    var _stop_pos_loc_GPS_lon;
    if (fbo.dirFrom == 1) {
        //that means from 1 to 2 so start position was player #1
        _stop_pos_loc_GPS_lat = fbo.play_1.locat_GPS_lat;
        _stop_pos_loc_GPS_lon = fbo.play_1.locat_GPS_lon;
    } else if (fbo.dirFrom == 2) {
        _stop_pos_loc_GPS_lat = fbo.play_2.locat_GPS_lat;
        _stop_pos_loc_GPS_lon = fbo.play_2.locat_GPS_lon;
    };
    var _dist_between = fbo.dist.between;   //feet between
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


setBallToPlayer = function (fbaseTempObj, _playNum) {
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
        //fbaseTempObj.time.play_2 = fbaseTempObj.play_2.hit_time_win * 10.0;
        fbaseTempObj.time.play_2 = 0.0;
        fbaseTempObj.dirFrom = 0;
        //fbaseTempObj.play_1.serve_in_prog = 1;
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
        //fbaseTempObj.time.play_1 = fbaseTempObj.play_1.hit_time_win * 10.0;
        fbaseTempObj.time.play_1 = 0.0;
        fbaseTempObj.time.play_2 = 0.0;
        fbaseTempObj.dirFrom = 0;
        //fbaseTempObj.play_2.serve_in_prog = 1;
    };
};



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
    console.log("sub = hit_ball" + "  player = ", _player_num);

    //stop the interval timer, calculate the ball position first, then see if it matches the time window
    //after that, turn on the interval timer again
    //update_ball_pos();

    //write to Firebase first, then mySQl
    //this will allow the remotes to begin to catch up
    var fbo = fbase_ballpos_outputObj;
    fbo.dist.between = bcalcs.getPathLength(fbo.play_1.locat_GPS_lat, fbo.play_1.locat_GPS_lon, fbo.play_2.locat_GPS_lat, fbo.play_2.locat_GPS_lon);
    fbo.time_start_str = moment().format("YYYY-MM-DD  HH:mm:ss a");
    fbo.time.start_unix = moment().valueOf();

    //fbase_ballpos_outputObj.speed_up_fact = 1.0;

    var init_ball_accel_val = 410.0;
    var init_ball_accel_tim = 3.00;
    var init_ball_vel = 1232.00;    //in/sec  or 70mph
    var init_ball_angle = 0.00;
    var init_speed_up_fact = fbo.speed_up_fact;

    var init_ball_pos_Z = 10.00;

    var init_ball_active = 1;  //right now all hits make it active

    var out_ball_hit_rec;
    //a player has hit the ball, so need to pull record from
    //game settings and push it onto a single player
    //was reading record into a varb called rc
    var fbo = fbase_ballpos_outputObj; //need to define again in the callback
    var rc = {
        player_1_locat_GPS_lat: fbo.play_1.locat_GPS_lat,
        player_1_locat_GPS_lon: fbo.play_1.locat_GPS_lon,
        player_1_coord_X: fbo.play_1.coord_X,
        player_1_coord_Y: fbo.play_1.coord_Y,
        dist_players: fbo.dist.between,
        player_2_locat_GPS_lat: fbo.play_2.locat_GPS_lat,
        player_2_locat_GPS_lon: fbo.play_2.locat_GPS_lon
    };
    // read_game_rec(_game_id).then(function (result) {

    // var rc = result[0]; //short hand
    //configData.isMovingPlayer = 0; //reset the bit on a hit
    fbo.dist.between = bcalcs.getPathLength(fbo.play_1.locat_GPS_lat, fbo.play_1.locat_GPS_lon, fbo.play_2.locat_GPS_lat, fbo.play_2.locat_GPS_lon);
    //a valid game rec has been read
    //check if the ball was not active then it was a server
    if (fbo.ball_active === 0) {
        //the ball was not active so it is a serve
        //need to find out who should serve
        if (_player_num == 1) {
            //first check if the position match exactly
            //otherwise, do nothing because it's not ready to server
            // var fbo = fbase_ballpos_outputObj;
            if (parseFloat(fbo.ball_curr_pos.loc_GPS_lat) == parseFloat(fbo.play_1.locat_GPS_lat) &&
                parseFloat(fbo.ball_curr_pos.loc_GPS_lon) == parseFloat(fbo.play_1.locat_GPS_lon)) {
                //ball is EXACTLY in the same spot as the player, so it is a valid serve
                fbo.ball_active = 1;
                fbo.dirFrom = 1;
                fbo.miss_play_1 = 0;
                fbo.miss_play_2 = 0;
                _type_hit_int = 0;  //serve
            } else {
                //what to do if trying to server and the ball is not in position ?
                fbo.hit_play_1 = 0;
                fbo.miss_play_1 = 0;
                fbo.hit_play_2 = 0;
                fbo.miss_play_2 = 0;
                _type_hit_int = -1;
            };
        } else if (_player_num == 2) {
            console.log("player two tried to hit with ball while idle");
            var fbo = fbase_ballpos_outputObj;
            if (parseFloat(fbo.ball_curr_pos.loc_GPS_lat) == parseFloat(fbo.play_2.locat_GPS_lat) &&
                parseFloat(fbo.ball_curr_pos.loc_GPS_lon) == parseFloat(fbo.play_2.locat_GPS_lon)) {
                fbo.ball_active = 1;
                fbo.dirFrom = 2;
                fbo.miss_play_1 = 0;
                fbo.miss_play_2 = 0;
                _type_hit_int = 0;  //serve
            } else {
                //what to do if trying to serve and the ball not exactly in the same position ?
                console.log("detected missed ball");
                fbo.hit_play_1 = 0;
                fbo.miss_play_1 = 0;
                fbo.hit_play_2 = 0;
                fbo.miss_play_2 = 0;
                _type_hit_int = -1;
            };
        }
    } else {
        //check if it is valid hit
        //if the ball was not coming to the user, then ignore it
        if (_player_num == 1) {
            if (Math.abs(parseFloat(fbase_ballpos_outputObj.time.play_1)) <= parseFloat(fbase_ballpos_outputObj.play_1.hit_time_win)) {
                //valid hit for player #1
                _type_hit_int = 1;
                fbase_ballpos_outputObj.ball_active = 1;
                fbase_ballpos_outputObj.dirFrom = 1;
                fbase_ballpos_outputObj.miss_play_1 = 0;
            } else {
                //missed
                _type_hit_int = 2;  //swinging miss
                fbase_ballpos_outputObj.ball_active = 0;  //was 0
                fbase_ballpos_outputObj.dirFrom = 0;
                fbase_ballpos_outputObj.miss_play_1 = 1;
                console.log("time to play #1 = " + parseFloat(fbase_ballpos_outputObj.time.play_1));
                console.log("time to play #2 = " + parseFloat(fbase_ballpos_outputObj.time.play_2));
            };
        } else {
            //must be player num 2
            if (Math.abs(parseFloat(fbase_ballpos_outputObj.time.play_2)) <= parseFloat(fbase_ballpos_outputObj.play_2.hit_time_win)) {
                //valid hit for player #1
                _type_hit_int = 1;
                fbase_ballpos_outputObj.ball_active = 1;
                fbase_ballpos_outputObj.dirFrom = 2;
            } else {
                //missed
                _type_hit_int = 2;
                fbase_ballpos_outputObj.ball_active = 0;  //was 0
                fbase_ballpos_outputObj.dirFrom = 0;
                fbase_ballpos_outputObj.miss_play_2 = 1;
                console.log("time to play #1 = " + parseFloat(fbase_ballpos_outputObj.time.play_1));
                console.log("time to play #2 = " + parseFloat(fbase_ballpos_outputObj.time.play_2));
            };
        };
    };


    if (_type_hit_int != -1) {  //it was a swing and a miss so do nothing
        //it was a swing at the wrong time
        switch (_type_hit_int) {
            case 0:        //serve
                _type_hit = "serve";
                _type_result = "good";
                write_ball_hit_rec(_game_id, _player_num, _type_hit, _type_result, 1);
                break;
            case 1:        //good hit
                _type_hit = "hit";
                _type_result = "good";
                write_ball_hit_rec(_game_id, _player_num, _type_hit, _type_result, 1);
                break;
            case 2:        //swinging miss
                _type_hit = "miss";
                _type_result = "swing and miss";
                write_ball_hit_rec(_game_id, _player_num, _type_hit, _type_result, 1);
                break;
            case 3:        //miss and did not swing
                _type_hit = "miss";
                _type_result = "did not swing";
                write_ball_hit_rec(_game_id, _player_num, _type_hit, _type_result, 1);
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
        } else if (_player_num === 2) {
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
    }; //valid hit

    //setup the firebase variables
    var fbo = fbase_ballpos_outputObj; //shorthand
    fbo.game_id = _game_id;
    fbo.ball_physics.curr_vel = init_ball_vel;
    fbo.ball_physics.accel_val = init_ball_accel_val;
    fbo.ball_physics.accel_time = init_ball_accel_tim;
    fbo.ball_physics.angle = init_ball_angle;
    if (_type_hit_int != -1) {
        //only update the position of the ball if it is a valid hit
        fbo.ball_curr_pos.loc_GPS_lat = out_ball_hit_rec.start_pos_loc_GPS_lat;
        fbo.ball_curr_pos.loc_GPS_lon = out_ball_hit_rec.start_pos_loc_GPS_lon;
    };
    if (fbo.miss_play_1 == false && fbo.miss_play_2 == false) {
        //only update if the player did not miss
        if (fbo.hit_play_1 === 1) {
            //player #1 hit the ball, so move his recs from game rec
            //to firebase
            fbo.ball_curr_pos.loc_GPS_lat = rc.player_1_locat_GPS_lat;
            fbo.ball_curr_pos.loc_GPS_lon = rc.player_1_locat_GPS_lon;
            fbo.ball_curr_pos.pos_X = rc.player_1_coord_X;
            fbo.ball_curr_pos.pos_Y = rc.player_1_coord_Y;
            fbo.ball_curr_pos.pos_Z = init_ball_pos_Z;
            //fbo.dist.between = rc.dist_players;
            fbo.dist.play_1 = 0.0;
            fbo.dist.play_2 = fbo.dist.between;
        } else if (fbo.hit_play_2 === 1) { //don't assume it's an automatic hit
            //must be player #1
            fbo.ball_curr_pos.loc_GPS_lat = rc.player_2_locat_GPS_lat;
            fbo.ball_curr_pos.loc_GPS_lon = rc.player_2_locat_GPS_lon;
            fbo.ball_curr_pos.pos_X = rc.player_2_coord_X;
            fbo.ball_curr_pos.pos_Y = rc.player_2_coord_Y;
            fbo.ball_curr_pos.pos_Z = init_ball_pos_Z;
            //fbo.dist.between = rc.dist_players;
            fbo.dist.play_1 = fbo.dist.between;
            fbo.dist.play_2 = 0.0;
        };
    };

    // }, function (err) {
    //     //invalid read
    //     console.log("can not hit ball no game stored");
    // });
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
    clearHitMissFirebaseObj();  //write the record once on startup
};



initRoutines();
//setInterval(timer_check_if_update, 5000);



