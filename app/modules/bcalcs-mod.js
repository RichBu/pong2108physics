//



//bcalcs-mod.js   ball calcs


exports.degToRad = function (degree) {
    //returns the angle in radians
    var outVal = degree * Math.PI / 180.0;
    return outVal;
};


exports.radToDeg = function (radians) {
    var outVal = radians * 180.0 / Math.PI;
    return outVal;
};

exports.meterToFt = function (_meter) {
    var outVal = parseFloat(_meter) * 3.2808;
    return parseFloat(outVal.toFixed(6))
};

exports.FtToMeter = function (_feet) {
    var outVal = parseFloat(_feet) / 3.2808;
    return parseFloat(outVal.toFixed(6))
};


exports.getPathLength = function (lat1, lon1, lat2, lon2) {
    var lat1_rad, lat2_rad, delta_lat, delta_lon, a, c, dist_meter, R;

    //make sure all the coords are there
    if (lat1 == lat2 && lon1 == lon2) {
        //same set of coords
        return 0;
    };

    R = 6371000;  //rad of earth in meters
    lat1_rad = exports.degToRad(lat1);
    lat2_rad = exports.degToRad(lat2);
    delta_lat = exports.degToRad(lat2 - lat1);
    delta_lon = exports.degToRad(lon2 - lon1);

    a = Math.sin(delta_lat / 2) * Math.sin(delta_lat / 2) + Math.cos(lat1_rad) * Math.cos(lat2_rad) * Math.sin(delta_lon / 2.0) * Math.sin(delta_lon / 2.0);
    c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));

    dist_meter = R * c;
    if (isNaN(dist_meter)) {
        return 0;
    };
    var dist_ft = exports.meterToFt(dist_meter);
    return dist_ft;
};  //getPathLength


exports.getDestLatLon = function (lat, lon, azimuth, dist_ft) {
    var lat2, lon2, R, brng, d_km, lat1, lon1;
    var dist_meter = exports.FtToMeter(dist_ft);
    R = 6378.1;  //radius of the earh in km

    //brng is the degrees converted to radians of the azimuth
    brng = exports.degToRad(azimuth);
    d_km = dist_meter / 1000.0
    lat1 = exports.degToRad(lat);
    lon1 = exports.degToRad(lon);
    lat2 = Math.asin(Math.sin(lat1) * Math.cos(d_km / R) + Math.cos(lat1) * Math.sin(d_km / R) * Math.cos(brng));
    lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d_km / R) * Math.cos(lat1), Math.cos(d_km / R) - Math.sin(lat1) * Math.sin(lat2));

    //now need it back to degrees
    lat2 = exports.radToDeg(lat2);
    lon2 = exports.radToDeg(lon2);
    return [parseFloat(lat2.toFixed(6)), parseFloat(lon2.toFixed(6))];
};


exports.calculateBearing = function (lat1, lon1, lat2, lon2) {
    var startLat, startLon, endLat, endLon, dLon, dPhi, bearing;

    startLat = exports.degToRad(lat1);
    startLon = exports.degToRad(lon1);
    endLat = exports.degToRad(lat2);
    endLon = exports.degToRad(lon2);
    dLon = endLon - startLon;
    dPhi = Math.log(Math.tan(endLat / 2.0 + Math.PI / 4.0) / Math.tan(startLat / 2.0 + Math.PI / 4.0));

    if (Math.abs(dLon) > Math.PI) {
        if (dLon > 0) {
            dLon = -(2.0 * Math.PI - dLon)
        } else {
            dLon = (2.0 * Math.PI + dLon)
        }
    }

    bearing = (exports.radToDeg(Math.atan2(dLon, dPhi)) + 360.0) % 360.0;
    return bearing;
};


