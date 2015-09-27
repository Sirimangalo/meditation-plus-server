function loaded() {

	submitData(false);
	refreshTime();
}

var obj;

var seq = 0;

var monthNames = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];

var dow = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function refreshTime() {
		var d = new Date();
		var hour = d.getUTCHours().toString().length == 1 ? '0'+d.getUTCHours():d.getUTCHours();
		var minute = d.getUTCMinutes().toString().length == 1 ? '0'+d.getUTCMinutes():d.getUTCMinutes();
		var second = d.getUTCSeconds().toString().length == 1 ? '0'+d.getUTCSeconds():d.getUTCSeconds();
		var lhour = d.getHours().toString().length == 1 ? '0'+d.getHours():d.getHours();
		var lminute = d.getMinutes().toString().length == 1 ? '0'+d.getMinutes():d.getMinutes();
		var lsecond = d.getSeconds().toString().length == 1 ? '0'+d.getSeconds():d.getSeconds();

						
		var myTime = 'The time now is:<br/><br/><b id="now">'+hour+':'+minute+':'+second + ' UTC, ' + dow[d.getUTCDay()] + ', ' + monthNames[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', '+d.getUTCFullYear()+'</b><br/><i>('+lhour+':'+lminute+':'+lsecond+', ' + dow[d.getDay()] + ', ' + monthNames[d.getMonth()] + ' ' + d.getDate() + ', '+d.getFullYear()+' your time)</i>';

		$('#live').html(myTime);
		
		if(!G_static) {
			
			if(meetingMember && meetingMember != '') {
				$('#meeting').show();
				$('#meeting-user').html('Currently scheduled: <a class="link bold" target="_blank" href="profile.php?user='+meetingMember+'">'+meetingMember+'</a>.');

				if(meetingRoom != '') {
					$('#meeting-room').attr('href','meeting.php?room='+meetingRoom); 

					gapi.hangout.render('hangout-button', {
						'render': 'createhangout',
						'invites': [{'id' : 'yuttadhammo@gmail.com', 'invite_type' : 'EMAIL'}],
						'initial_apps': [{'app_id' : '211383333638', 'start_data' : 'dQw4w9WgXcQ', 'app_type' : 'ROOM_APP' }],
						'widget_size': 175
					});
				}
				else {
					$('#meeting').hide();
				}

			}
			else
				$('#meeting').hide();


			if(++seq % 10 == 0) {
				submitData('');
			}
		}
		
		window.setTimeout(function() {refreshTime() },1000);

}

function changeAppointment(day,time,username) {
	submitData('form_id=appoint&day='+day+'&time='+time+'&username='+username);
}

var me = [-1,'0000'];

var meetingRoom = '';
var meetingMember = '';

function submitData(serializedData) {
	
	// variable to hold request
	var request;
	// abort any pending request
	if (request) {
		request.abort();
	}
	
	// fire off the request to /commitdb.php
	request = $.ajax({
		url: "/appointmentdb.php",
		type: "post",
		data: serializedData,
		dataType: "json"
	});

	// callback handler that will be called on success
	request.done(function (response, textStatus, jqXHR){
		// log a message to the console
	});

	// callback handler that will be called on failure
	request.fail(function (jqXHR, textStatus, errorThrown){
		// log the error to the console
		console.error(
			"The following error occured: "+
			textStatus, errorThrown
		);
	});

	// callback handler that will be called on success
	request.success(function (result){
		
		var output = '				<tr><td></td><td class="th">Sunday</td><td class="th">Monday</td><td class="th">Tuesday</td><td class="th">Wednesday</td><td class="th">Thursday</td><td class="th">Friday</td><td class="th">Saturday</td></tr>';

		var obj = result.appointments;

		var reserves = [];

		for(var atime in obj) {
			for(var i = 0; i < 7; i++) {
				var a = obj[atime][i];
				if(a && a['username'])
					reserves[a['username']] = true;
			}
		}

		var im = false;

		var d = new Date();
		for(var atime in obj) {
			
			var mmins = parseInt(atime.substring(0,2))*60 + parseInt(atime.substring(2,4));
			var mins = d.getUTCHours()*60 + d.getUTCMinutes();
			
			var myTimeM = mmins - d.getTimezoneOffset();
			var myMins = myTimeM % 60;
			var myTime = Math.floor(myTimeM/60) + ':' + (myMins < 10 ? '0' : '') +myMins;
			
			output += '<tr><td class="th pointer" title="'+myTime+' your time.">'+atime+'h UTC</td>';
			for(var i = 0; i < 7; i++) {
				if(obj[atime][i]) {
					
					// meeting room hash
					
					if(obj[atime][i]['room'] && i == d.getUTCDay() && mmins <= mins && mins - mmins < 30) {
						meetingRoom = obj[atime][i]['room'];
						meetingMember = obj[atime][i]['username'];
					}
					
					var a = obj[atime][i];
					var func;
					if(logged_user && !(a['username']) && !reserves[logged_user])
						func = ' onclick="changeAppointment(\''+i+'\',\''+atime+'\',\''+logged_user+'\')"';
					else if(logged_user && a['username'] == logged_user || isAdmin)
						func = ' onclick="changeAppointment(\''+i+'\',\''+atime+'\',\''+a['username']+'\')"';
					else
						func = '';
						
					var style;
					
					if(a['username'] && a['username'] == logged_user) {// me
						style = 'me';
						me = [i,atime];
						im = true;
					}
					else if(a['username']) // taken
						style = 'taken';
					else if(reserves[logged_user]) // avail, but we are taken
						style = 'open';
					else 
						style = 'avail';

					var userlink;
					
					if(a['username'] && a['username'] != logged_user) 
						userlink = '<a href="profile.php?user='+a['username'] +'" target="_blank">'+a['username'] +'</a>';
					else if(a['username'])
						userlink = a['username'];
					else
						userlink = '<i>available</i>';

					output += '<td'+func+' class="appoint-'+style+'">'+userlink+'</td>';
				}
				else
					output += '<td class="appoint-empty"></td>';
			}
			output += '</tr>';
		}

		if(im)
			$('#register').hide();
		else {
			me = [-1,'0000'];
			$('#register').show();
		}


		$('#appointment-schedule').html(output);
	});

	// callback handler that will be called regardless
	// if the request failed or succeeded
	request.always(function () {
	});
}
