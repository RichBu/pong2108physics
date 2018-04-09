
//global variable .... must leave off the "var", "const", or "let"
fbase_ballpos_outputObj = {  //variable written to in Firebase
    game_id: 1,
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
        between: 0.0,
        play_1: 0.0,
        play_2: 0.0
    },
    time: {
        start_unix: 0,
        stop_unix: 0,
        play_1: 0.0,
        play_2: 0.0
    },
    speed_up_fact: 0.0,
    hit_play_1: 0,
    hit_play_2: 0
};



var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var methodOverride = require("method-override");
var morgan = require('morgan');


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

var configData = {
    firebaseStorage: "/games/user",         //prior to tacking on user number
    firebaseMainGame: "/games",
    firebaseStatusFolder: "/status",
    firebaseRefreshBit: "/status/refreshUsers",
    firebaseActive: false
};

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


//put in the logic to run the physics engine now
var update_ball_pos = function () {
    //console.log('update position');
    if (configData.firebaseActive == true) {
        //only run these routines if firebase is active
        dbUserGameStorageMain.set(fbase_ballpos_outputObj);
    } else {
        //console.log(fbase_ballpos_outputObj);
    }
};



function game_rec_type (
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



var read_game_rec = function ( _game_id) {
    //constructor for record coming from the database
    var query = "SELECT * FROM games WHERE game_id=?";

    return new Promise( function(resolve, reject) {
        connection.query(query, [ _game_id], function (err, response) {
            if(err) {
                console.log("err at read game rec = ");
                console.log(err);
            } else {
                resolve( response );
            };
        });
    })
};




var write_ball_hit_rec = function(_game_id) {
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



function ball_hit_rec_type(
    _game_id,
    _ball_hit_id,
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
    this.time_start_st = _time_start_str;
    this.time_start_unix = _time_start_unix;
    this.time_stop_unix = _time_stop_unix;
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
    this._ball_angle = _ball_angle;
    this.speed_up_fact = _speed_up_fact;
};



var hit_ball = function ( _game_id, _player_num, _type_hit) {
    //incoming player_num is player who hit the ball
    //a player has hit the ball, so need to pull record from
    //game settings and push it onto a single player
    read_game_rec( _game_id).then( function(result) {
        //a valid game rec has been read

        switch (type_hit) {
            case 0:        //serve
                //write_ball_hit_rec( _game_id)
                break;
            case 1:        //good hit
                break;
            case 2:        //miss
                break;
        };
    

    }, function(err) {
        //invalid read
        console.log("can not hit ball no game stored");
    });
};



var timer_check_if_update = function () {
    //check if there should be an update

    var query = "SELECT * FROM engine_stats";

    connection.query(query, function (err, response) {
        running_stat = response[0].isRunning;
        if (response[0].isRunning || response[0].isRunning != 0) {
            samp_time_ball = response[0].samp_time_ball;

            if (timerBallUpd === undefined || timerBallUpd === null) {
                //timer is not currently setup to run.  only then 
                //start it up, otherwise will have duplicates
                console.log('turning on timer');
                timerBallUpd = setInterval(update_ball_pos, samp_time_ball);
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
};



initRoutines();
//setInterval(timer_check_if_update, 5000);



