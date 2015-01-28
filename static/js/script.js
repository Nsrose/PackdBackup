var days = {
    "0":"Sunday",
    "1":"Monday",
    "2":"Tuesday",
    "3":"Wednesday",
    "4":"Thursday",
    "5":"Friday",
    "6":"Saturday",
};

var ints_to_strings = {
    "1":"Not Crowded",
    "2":"Mildly Crowded",
    "3":"Very Crowded",
    "4":"Extreme",
};

var strings_to_ints = {
    "Not Crowded":1,
    "Mildly Crowded":2,
    "Very Crowded":3,
    "Extreme":4,
};

// Firebase url
var fireRef = new Firebase("https://packd.firebaseio.com/");

// Message on Closed or Error
var closedMessage = "RSF is Closed";

//RSF coordinates
var RSF_LAT = 37.868501;
var RSF_LONG = -122.262702;

// How many feedback responses to store before refactoring
var LOAD_FACTOR = 200;
// Uncomment next line for debugging:
// var LOAD_FACTOR = 5;

// Allowable distance from the RSF to vote.
var ALLOWED_RADIUS = 0.050;
// Uncomment next line for debugging:
// var ALLOWED_RADIUS = 10000.00;

// Converts numeric degrees to radians, from stackoverflow
if (typeof(Number.prototype.toRad) === "undefined") {
  Number.prototype.toRad = function() {
    return this * Math.PI / 180;
  }
}


// Distance between two coords, from stackoverflow, in km
function distance(lon1, lat1, lon2, lat2) {
  var R = 6371; // Radius of the earth in km
  var dLat = (lat2-lat1).toRad();
  var dLon = (lon2-lon1).toRad(); 
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) * 
          Math.sin(dLon/2) * Math.sin(dLon/2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c;
  return d;
}

// Determines if a rehashing of data is necessary
function checkLoadFactor(snapshot, day, hour) {
    var size = snapshot.child("Size").val();
    if (size > LOAD_FACTOR) {
        fireRef.update({Locked : true });
        refactor(snapshot);
    } else {
        var dataText = snapshot.child("-JgOwwFlFThZOqBMUnP0").child(day).child(hour).child("current_average").child("measure").val();
        if (dataText == null) {
            $("#data").text(closedMessage);
        } else {
            $("#data").text(dataText);    
        }
    }
}

// Refactors the tables for data to restructure json.
function refactor(snapshot) {
    var feedback = snapshot.child("-JgOwwFlFThZOqBMUnP0").val();
    for (var day in feedback) {
        for (var hour in feedback[day]) {
            var dataPoints = feedback[day][hour];
            var denom = getDenom(dataPoints);
            var average = 0;
            for (var dataPoint in dataPoints) {
                var measureInt = weight(dataPoints[dataPoint]["measure"]);
                var weightInt = dataPoints[dataPoint]["weight"];
                average += measureInt * (weightInt / denom);
            }
            var newMeasure = ints_to_strings[Math.round(average)];
            var newWeight = denom;
            var url = "https://packd.firebaseio.com/-JgOwwFlFThZOqBMUnP0/" + day + "/" + hour;
            var updateRef = new Firebase(url);
            updateRef.set({
                "current_average": {
                    "measure":newMeasure,
                    "weight":newWeight,
                }
            }) 

        }
    }
    fireRef.update({Locked : false });
    fireRef.update({Size : 0});
    var dataText = snapshot.child("-JgOwwFlFThZOqBMUnP0").child(day).child(hour).child("current_average").child("measure").val();
    if (dataText == null) {
        $("#data").text(closedMessage);
    } else {
        $("#data").text(dataText);    
    }
}

// Gets the denominator of a list of nodes
function getDenom(dataPoints) {
    var result = 0;
    for (var d in dataPoints) {
        var current = dataPoints[d];
        result += current["weight"];
    }
    return result;
}

// Given a heuristic string, returns an integer value representing
// that string.
function weight(string) {
    return strings_to_ints[string];
}

// Sets a cookie for disallowing multiple votes
function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + "; " + expires;
}

// Gets a cookie with name CNAME
function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i=0; i<ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1);
        if (c.indexOf(name) == 0) return c.substring(name.length,c.length);
    }
    return "";
}

// Checks whether user has already voted. Returns true if
// the user already voted.
function checkCookie(data) {
    var voteCookie = getCookie("user_data");
    if (voteCookie != "") {
        alert("You already voted, thanks!");
        return true;
    } else {
        setCookie("user_data", data, 1);
        return false;
    }
}

$(document).ready(function(){
    navigator.geolocation.getCurrentPosition(saveLocation);

    // Saves your location for voting reference.
    function saveLocation(location) {
        if (navigator.geolocation) {
            var latitude = location.coords.latitude;
            var longitude = location.coords.longitude;
            dist = distance(longitude, latitude, RSF_LONG, RSF_LAT);
            calculatingDistance = false;
        } else {
            alert("Location services not working");
        }
    }

    // True iff distance is currently being calculated
    var calculatingDistance = true;

    // Current distance, in km, to the RSF
    var dist = Number.MAX_VALUE;

    // True iff feedback has not already been sent
    var feedbackSent = false;

    var d = new Date();
    var dayNumber = d.getDay();
    var hour = d.getHours() * 100;
    var day = days[dayNumber];
    
    // This function will be called when the data is changed in the server
    fireRef.once('value', function (snapshot) {
        var dataText = null;
        var locked = snapshot.child("Locked").val();
        if (!locked) {
            checkLoadFactor(snapshot, day, hour);
        } else {
            dataText = snapshot.child(day).child(hour).val();
            if (dataText == null) {
                $("#data").text(closedMessage);
            } else {
                // console.log("does this happen?")
                // var theColor = "rgba(50, 120, 222, 1)";
                // if (dataText === "Not Crowded") {
                //     theColor = "rgba(50, 120, 222, 1)";
                // } else if (dataText === "Mildly Crowded") {
                //     theColor = "rgba(50, 120, 222, 1)";
                // } else if (dataText === "Very Crowded") {
                //     theColor = "rgba(50, 120, 222, 1)";
                // } else if (dataText === "Extreme") {
                //     theColor = "rgba(50, 120, 222, 1)";
                // }
                $("#data_container").css("background-color",theColor);
                $("#title_container").css("background-color",theColor);
                $("#data").text(dataText);    
            }
        } 
    }, function (errorObject) {
        var dataText = "Either the RSF is closed, or something went wrong.";
        $("#data").text(dataText);
    });

    // Feedback data form
    $("#send_data_submit").click(function() {
        if (!feedbackSent) {
            checkLocation();
        } else {
            alert("Thanks, we got it!");
        }
    })

    // Checks the location of the user and sends data, if okay.
    function checkLocation() {
        if (calculatingDistance) {
            alert("Hang on, getting your location. Try again in a few seconds");
        } else {
            if (dist > ALLOWED_RADIUS) {
                alert("You aren't actually at the RSF.");
            } else {
                var data = null;
                for (var i = 1; i < 5; i++) {
                    var radioNum = "radio" + i;
                    if (document.getElementById(radioNum).checked) {
                        data = $("#" + radioNum).val();
                    }
                }
                if (!checkCookie(data)) {
                    fireRef.once('value', function(snapshot) {
                    var size = snapshot.child("Size").val();
                    size += 1;
                    fireRef.update({Size : size});
                    });
                    var feedbackRef = fireRef.child("-JgOwwFlFThZOqBMUnP0");
                    var node = {
                        "measure":data,
                        "weight":1
                    }
                    feedbackRef.child(day).child(hour).push(node);
                    feedbackSent = true;
                    alert("Thanks, we got it!");
                }
                
            
            }
        } 
    }
});