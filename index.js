function loaded() {
	$( 'pform' ).bind('keypress', function(e){
		if ( e.keyCode == 13 ) {
			$( this ).find( 'input[type=button]:first' ).click();
		}
	});
	$('#walking').val(readCookie('walking'));
	$('#sitting').val(readCookie('sitting'));
	
	submitData(false);
	
	refreshTime();
	
	whichAudio = readCookie('timer_tone');

	if(whichAudio) {
		$('#audio-select').val(whichAudio);
		loadAudio(false);
	}
	var smileHTML = '';
	for (i in smilies) {
		smileHTML += '<img onmouseover="$(this).attr(\'src\',\''+smilies[i][2]+'\')" onmouseout="$(this).attr(\'src\',\''+smilies[i][1]+'\')" class="smilie" src="'+smilies[i][1]+'" title="'+smilies[i][0]+'('+i+')" onclick="insertSmilie(\''+i+'\')"> ';
	}
	$('#smilie-box').html(smileHTML);
}

var G_medObj = '';
var G_chatObj = '';

var listVersion = -1;
var chatVersion = -1;

var start = [];
start.push(1);
start.push(11);
start.push(19);

var duration = [2];

var monthNames = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];

var seq = 0;

var imWalking = false;
var imSitting = false;

function refreshTime() {
		var d = new Date();
		var hour = d.getUTCHours().toString().length == 1 ? '0'+d.getUTCHours():d.getUTCHours();
		var minute = d.getUTCMinutes().toString().length == 1 ? '0'+d.getUTCMinutes():d.getUTCMinutes();
		var second = d.getUTCSeconds().toString().length == 1 ? '0'+d.getUTCSeconds():d.getUTCSeconds();
		var lhour = d.getHours().toString().length == 1 ? '0'+d.getHours():d.getHours();
		var lminute = d.getMinutes().toString().length == 1 ? '0'+d.getMinutes():d.getMinutes();
		var lsecond = d.getSeconds().toString().length == 1 ? '0'+d.getSeconds():d.getSeconds();

						
		var myTime = 'Meditation sessions are generally held every day at:<br><br/>';
		
		for(i = 0; i < start.length; i++) {
			var mtime = new Date();
			mtime.setUTCHours(start[i]);
			mtime.setUTCMinutes(0);
			
			myTime += '<b>'+(start[i]<10?'0':'')+start[i]+'00h UTC</b> - <i>('+(mtime.getHours()>12?mtime.getHours()-12:mtime.getHours())+':'+((mtime.getMinutes()<10?'0':'')+mtime.getMinutes())+' '+(mtime.getHours()>11 && mtime.getHours()<24?'PM':'AM')+' your time)</i><br/>';
		}
		myTime += '<br/>The time now is:<br/><br/><b id="now">'+hour+':'+minute+':'+second + ' UTC, '+ monthNames[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', '+d.getUTCFullYear()+'</b><br/><i>('+lhour+':'+lminute+':'+lsecond+', '+ monthNames[d.getMonth()] + ' ' + d.getDate() + ', '+d.getFullYear()+' your time)</i>';

		$('#live').html(myTime);
		
		window.setTimeout(function() {refreshTime() },1000);

		if(++seq % 10 == 0 && !G_static) {
			if(++seq % 60 == 0){
				listVersion = -1;
				chatVersion = -1;
			}
				
			submitData();
		}
		
}

function submitData(submit,formid) {
	
	if(formid == 'cancelform') {
		imWalking = false;
		imSitting = false;
	}
	if(formid == 'chatform') {
		$('#message').focus();
	}
	
	// variable to hold request
	var request;
	// abort any pending request
	if (request) {
		request.abort();
	}
	
	var serializedData = '';
	
	if(submit) {
		
		// setup some local variables
		var $form = $("#"+formid);
		// let's select and cache all the fields
		var $inputs = $("input");
		
		
		if($inputs.length > 0) {
			
			if(!validateForm(formid))
				return;

			// get form name
				
			// serialize the data in the form
			serializedData = $inputs.serialize()+"&form_id="+formid;
		}
		else serializedData = "form_id="+formid;

		// let's disable the inputs for the duration of the ajax request
		// Note: we disable elements AFTER the form data has been serialized.
		// Disabled form elements will not be serialized.
		$inputs.prop("disabled", true);
	}
	
	serializedData += (serializedData.length > 0?'&':'')+(logged_user?"username="+logged_user:'');
	serializedData += (serializedData.length > 0?'&':'')+"list_version="+listVersion;
	serializedData += (serializedData.length > 0?'&':'')+"chat_version="+chatVersion;

	// fire off the request to /db.php
	request = $.ajax({
		url: "/db.php",
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
		
		if(result.alert && result.alert != '')
			alert(result.alert);
		
		if(result.refresh == 'true' && listVersion > -1) {
			location.reload();
		}
		
		if(formid == 'chatform')
			$('#message').val(''); 
		
		if(formid == 'timeform') {
			createCookie('walking',$('#walking').val(),365);
			createCookie('sitting',$('#sitting').val(),365);
		}
		
		if(result.list_version)
			listVersion = result.list_version;
		if(result.chat_version)
			chatVersion = result.chat_version;
		
		var obj = result.list;
		if(!(obj instanceof Array))
			obj = G_medObj;
		else G_medObj = obj;
		
		var chatObj = result.chat;
		if(!(chatObj instanceof Array))
			chatObj = G_chatObj;
		else G_chatObj = chatObj;

		var hoursObj = result.hours;


		var output = '';
		var chats = '';
		var meds = false;
		
		var medList = [];
		var imMeditating = false;
		
		chats += '<table id="chat-table">';
		for(var i = 0; i < chatObj.length; i++) {
			var then = chatObj[i].time-2;
			
			var date = new Date(chatObj[i].time*1000);

			var now = Math.round(new Date().getTime()/1000);

			var ela = now - then;
			
			var time = '';
			
			if (ela < 5)
				time = 'now'; 
			else if(ela < 60)
				time = ela + 's&nbsp;ago'; 
			else if(ela < 60*60)
				time = Math.floor(ela/60) + 'm&nbsp;ago'; 
			else if(ela < 60*60*24)
				time = Math.floor(ela/60/60) + 'h&nbsp;ago'; 
			else if(ela < 60*60*24*7)
				time = Math.floor(ela/60/60/24) + 'd&nbsp;ago'; 
			else {
				time = date.getUTCDate()+'/'+(date.getUTCMonth()+1)+'/'+date.getUTCFullYear().toString().substring(2);
			}
			
			var chat_username = chatObj[i].username.replace(' ','&nbsp;');

			// get age color
			
			// establish max age = 3 hours or #150
			
			var maxAge = 60*60*3;
			var maxColor = 150;

			// check if greater
			var elaAge = ela;
			if(elaAge > maxAge)
				elaAge = maxAge;
			
			// get elapsed time as color
			
			var ageColor = Math.round(maxColor*elaAge/maxAge);

			// convert decimal to hex
			
			var hexColor = ageColor.toString(16);
			
			if(hexColor.length == 1)
				hexColor = 0+hexColor;
			
			var hexColorString = '#'+hexColor+hexColor+hexColor;

			if(elaAge < 20)
				hexColorString = 'green';

			chats += '<tr class="achat" style="color:'+hexColorString+'"><td class="chattime"><span>'+time+'</span></td><td class="chat-message-shell"><span class="chatname'+(chatObj[i].me=='true'?'-me':'')+'"><a class="noline" target="_blank" href="/profile.php?user='+chat_username+'">'+chat_username+'</a>:&nbsp;</span>'+replaceSmilies(chatObj[i].message)+'</td>'+(logged_user == 'Yuttadhammo'?'<td class="del-chat"><a href="javascript:void()" onclick="submitData(true,\'delchat_'+chatObj[i].cid+'\')">x</a></td>':'')+'</td></tr>';

		}
		
		output += '<table id="listt"><tr><td class="thead">Currently</td><td class="thead">Name</td><td class="thead">Walking</td><td class="thead">Sitting</td></tr>';
		for(var i = 0; i < obj.length; i++) {
			
			// is a meditator
			
			meds = true;
			
			var user = obj[i].username;
			var start = obj[i].start;
			var end = obj[i].end;
			var walking = obj[i].walking;
			var sitting = obj[i].sitting;
			var me = obj[i].me == 'true';
			
			if(me)
				imMeditating = true;
			
			// add to meditator list
			
			medList[user] = 1;
			
			// figure out what they're doing
			
			var time = Math.ceil(new Date().getTime() / 1000);
			
			if(end < time) {
				listVersion = -1; // force refresh
				continue;
			}
			
			var elapsed = time - start;
			
			var walks = walking * 60;
			var sits = sitting * 60;

			var current = "walking";

			// sitting
			if(walks < elapsed) {
				
				if(me) {
					if(imWalking) // walking finished
						ringTimer();
						
					imWalking = false;
					imSitting = true;
				}
				
				current = "sitting";
				var walkm = 0;
				var sitm = Math.floor((sits + walks - elapsed)/60);
			}
			else {
				if(me)
					imWalking = true;
				var walkm = Math.floor((walks - elapsed)/60);
				var sitm = sitting;
			}
			
			output += '<tr><td><img src="'+ current + '_icon.png" height="16" title="'+current+'"></td><td class="medname'+(me?'-me':'')+'"><a class="noline" target="_blank" href="/profile.php?user='+user+'">'+(obj[i].country?'<img title="'+user+' is from '+countries[obj[i].country]+'" src="images/flags/16/'+obj[i].country.toLowerCase()+'.png">':'') + user + '</a></td><td>' + walkm + '/'+walking+'</td><td>' + sitm + '/'+sitting+'</td></tr>';					
		}
		
		// timer ringing
		
		if(!imMeditating && (imWalking || imSitting)) { // sitting done
			ringTimer();
			imWalking = false;
			imSitting = false;
		}

		// skip hours field if same
		
		if(hoursObj instanceof Array) {
		
			var now = new Date();
			var nowHour= now.getUTCHours();
			
			var total_hours = result.hours;
			var max_hour = Math.max(Math.max.apply( Math, total_hours ),60);
			
			var max_height = 80;
			var hours_table = '<table id="hours-table"><tr style="height:'+max_height+'px">';
			
			for(var i = 0; i < total_hours.length; i++) {
				var height = Math.ceil(max_height*total_hours[i]/max_hour);
				var htime = total_hours[i];
				if(htime > 4*60)
					htime = Math.round(htime / 60) +' hours';
				else htime = htime + ' minutes';
				
				hours_table += '<td class="hour-cell" title="'+(i < 10?'0':'')+i+'00h: '+htime+' total"><div class="hour-bar" style="height:'+height+'px">&nbsp;</div><div class="hour-number'+(nowHour == i?'-now':'')+'">'+i+'</div></td>';
			}

			hours_table += '</tr></table>';
			$('#hours-container').html(hours_table);
		}
		
		if(!meds)
			output += '<tr><td align="center" colspan="4">No one currently meditating.</td></tr>';

		output += '</table>';
		$('#list').html(output);

		chats += '</table>';
		var chatd = $('#chats');
		chatd.html(chats);
		chatd.scrollTop(chatd.prop("scrollHeight"));
		
		var loggedUsers = result.logged;
		var loggedOut = [];
		for(var i = 0; i < loggedUsers.length; i++) {
			loggedOut.push('<span class="one-logged-in-user'+(medList[loggedUsers[i]]?'-med':'')+'" title="'+(medList[loggedUsers[i]]?'':'not ')+'meditating"><a class="noline" target="_blank" href="/profile.php?user='+loggedUsers[i]+'">'+loggedUsers[i]+'</a></span>');
		}
		if(loggedOut.length > 0) {
			
			var loggedOutString = '<span id="logged-in-users-pre">Logged in users:</span> '+loggedOut.join(', ');
			$('#logged-users-shell').html(loggedOutString);
		}
		
	});

	// callback handler that will be called regardless
	// if the request failed or succeeded
	request.always(function () {
		// reenable the inputs
		if($inputs)
			$inputs.prop("disabled", false);
	});
}

function openSmilies() {
	$('#smilie-box').toggle();
}

function insertSmilie(s) {
	$("#message").val($("#message").val()+s);
	$('#smilie-box').hide();
	$("#message").focus();
}

function replaceSmilies(text) {
	for (i in smilies) {
		var esc = i.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
		var rep = new RegExp(esc,"g")
		text = text.replace(rep,'<img onmouseover="$(this).attr(\'src\',\''+smilies[i][2]+'\')" onmouseout="$(this).attr(\'src\',\''+smilies[i][1]+'\')" class="smilie" src="'+smilies[i][1]+'">');
	}
	return text;
}

function validateForm(id) {
	var error = '';
	
	if(id == 'timeform') {
		var walking = $('#walking').val();
		var sitting = $('#sitting').val();
		
		var wi = parseInt(walking);
		var si = parseInt(sitting);
		
		var pat = /[^0-9]/g;
		
		if(!logged_user) {
			error = 'Please log in first';
		}
		if(pat.test(walking)) {
			error = 'invalid walking time';
		}
		if(pat.test(sitting)) {
			error = 'invalid sitting time';
		}
		if(wi > 60) {
			error = 'max time 60 minutes';
		}
		if(si > 60) {
			error = 'max time 60 minutes';
		}
		if(wi < 0) {
			error = 'invalid walking time';
		}
		if(si < 0) {
			error = 'invalid sitting time';
		}
	}
	else if(id == 'chatform') {
		var message = $('#message').val();

		if(!logged_user) {
			error = 'Please log in first';
		}
		if(message.indexOf() > 140) {
			error = 'chat message max 140 char';
		}
		if(message.length < 1) {
			error = 'must input chat message';
		}
	}
	if(error.length > 0) {
		alert(error);
		return false;
	}
	
	return true;
}

function createCookie(name,value,days) {
	if (days) {
		var date = new Date();
		date.setTime(date.getTime()+(days*24*60*60*1000));
		var expires = "; expires="+date.toGMTString();
	}
	else var expires = "";
	document.cookie = name+"="+value+expires+"; path=/";
}

function readCookie(name) {
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	}
	return null;
}

function eraseCookie(name) {
	createCookie(name,"",-1);
}

function HTMLEncode(str){
	var i = str.length,
	aRet = [];

	while (i--) {
		var iC = str[i].charCodeAt();
		if (iC < 65 || iC > 127 || (iC>90 && iC<97)) {
			aRet[i] = '&#'+iC+';';
		} else {
			aRet[i] = str[i];
		}
	}
	return aRet.join('');    
}

var whichAudio;

function ringTimer() {
	if(whichAudio != 'none') {
		$("#audio-"+whichAudio).trigger('pause');
		$("#audio-"+whichAudio).prop("currentTime",0);
	}
	whichAudio = $( "#audio-select" ).val();
	if(whichAudio == 'none')
		return;
	$("#audio-"+whichAudio).trigger('play');
}

function loadAudio(cookie) {
	whichAudio = $( "#audio-select" ).val();
	
	if(cookie)
		createCookie('timer_tone',whichAudio,365*10);

	if(whichAudio == 'none')
		return;
	
	$("#audio-"+whichAudio).trigger('load');
}

function stopTimer() {
	whichAudio = $( "#audio-select" ).val();
	if(whichAudio == 'none')
		return;
	$("#audio-"+whichAudio).trigger('pause');
	$("#audio-"+whichAudio).prop("currentTime",0);
}
