//
// module for GPS functions

var request = require("request");
const axios = require("axios");
var numeral = require("numeral");



exports.convertGeoToAddr = async (_geoLoc, _apKey) => {
    var geoLoc = _geoLoc;
    var apKey = _apKey;
    var userPositionToAddressURL = "https://maps.googleapis.com/maps/api/geocode/json?latlng=";
    userPositionToAddressURL += numeral(geoLoc.lat).format("+0000.000000");
    userPositionToAddressURL += "," + numeral(geoLoc.lon).format("+0000.000000");
    userPositionToAddressURL += "&key=" + apKey;

    //let outObj = {};
    var searchObj = {
        geoLoc: _geoLoc,
        apKey: _apKey
    };


    let outObj = {};
    await axios
        .get(userPositionToAddressURL)
        .then(response => {
            let _addrStr = response.data.results[0].formatted_address;
            outObj = {
                addrStr: _addrStr,
                geoLat: numeral(geoLoc.lat).format("+0000.000000"),
                geoLon: numeral(geoLoc.lon).format("+0000.000000")
            };
        })
        .catch(function (error) {
            console.log("GPS error " + error);
            return error;
        })
    return outObj
};

// sample call :
// GPSmod.convertGeoToAddr({ lat: 42.050377, lon: -87.684347 }, configData.gKeyOther).then(
//     (result, error) => {
//       var addressObj = result;
//       console.log("geo location = " + addressObj.addrStr);
//     });



exports.checkAndConvertAddrToGeo = async (_geoLoc, _apKey) => {
    // take address typed in an convert to Geo Location

    //read in the current inputted address and see if it changed
    var origAddrStr;

    //need to check for blanks and null before accepting page's address
    var searchStr = _geoLoc.addrStr;
    if (searchStr == null || searchStr == undefined) {
        //handle a blank input
        searchStr = "";
    };

    //needs new geo location based on address and NOT in test mode
    var userAddrToGeoURL = "https://maps.googleapis.com/maps/api/geocode/json";
    userAddrToGeoURL += "?address=" + searchStr + "&key=";
    userAddrToGeoURL += _apKey;

    let outObj = {};
    await axios
        .get(userAddrToGeoURL)
        .then(function (response) {
            //got the geo location
            outObj.geoLat = numeral( parseFloat(response.data.results[0].geometry.location.lat)).format("+0000.000000");
            outObj.geoLon = numeral( parseFloat(response.data.results[0].geometry.location.lng)).format("+0000.000000");
            outObj.addrStr = response.data.results[0].formatted_address;
        })
        .catch(function(error) {
            console.log("GPS addr to geo error " + error );
            return error
        })
    return outObj
};


