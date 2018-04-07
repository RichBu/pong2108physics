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
var fbase_ballpos_outputObj = {
    game_id: 1,
    time_start_str: "",       //full string for calculating
    ball_physics: {
      curr_vel : 0.0,
      accel_val : 0.0,
      accel_time : 0.0,
      angle : 0.0
    },
    ball_curr_pos: {
      pos_X: 0.0,
      pos_Y: 0.0,
      pos_Z: 0.0,
      loc_GPS_lat: 0.0,
      loc_GPS_lon: 0.0
    },
    dist : {
      between : 0.0,
      play_1 : 0.0,
      play_2 : 0.0
    },
    time : {
      start_unix : 0,
      stop_unix : 0,
      play_1 : 0.0,
      play_2 : 0.0
    },
    speed_up_fact : 0.0,
  };



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
    dbUserGameStorageMain.set( fbase_ballpos_outputObj );   
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


var startConnection = function () {
    console.log("connecting to Firebase");
    setInterval(timer_check_if_update, 5000);

    startConnection = function() { };
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



startConnection();
//setInterval(timer_check_if_update, 5000);



