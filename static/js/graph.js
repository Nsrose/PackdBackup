var fireRef = new Firebase("https://packd.firebaseio.com/");

var days = {
    "0":"Sunday",
    "1":"Monday",
    "2":"Tuesday",
    "3":"Wednesday",
    "4":"Thursday",
    "5":"Friday",
    "6":"Saturday",
};

// Generates graph for X is hours of day. Y is 
// values from Dynamic data. 
function generateGraph() {
	var d = new Date();
    var dayNumber = d.getDay();
    var hour = d.getHours() * 100;
    var day = days[dayNumber];


	fireRef.once('value', function (snapshot) {
		var data = snapshot.child("-JgOwwFlFThZOqBMUnP0").val();
		var dayData = data[day];

	}, function (errorObject) {
        
    });
}