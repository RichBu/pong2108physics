var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var methodOverride = require("method-override");
var morgan = require('morgan');


// Configure the Express application
var app = module.exports = express();
var PORT = process.env.PORT || 3005;


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

setInterval(timer_check_if_update, 5000);



