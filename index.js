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

var lastChatTime = 0;

var isLive = false;

var start = [];
start.push(1);
start.push(11);
start.push(19);

var duration = [2];

var monthNames = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];

var seq = 0;

var imWalking = false;
var imSitting = false;

var chatUsers = [];

function refreshTime() {
		var d = new Date();
		var hour = d.getUTCHours().toString().length == 1 ? '0'+d.getUTCHours():d.getUTCHours();
		var minute = d.getUTCMinutes().toString().length == 1 ? '0'+d.getUTCMinutes():d.getUTCMinutes();
		var second = d.getUTCSeconds().toString().length == 1 ? '0'+d.getUTCSeconds():d.getUTCSeconds();
		var lhour = d.getHours().toString().length == 1 ? '0'+d.getHours():d.getHours();
		var lminute = d.getMinutes().toString().length == 1 ? '0'+d.getMinutes():d.getMinutes();
		var lsecond = d.getSeconds().toString().length == 1 ? '0'+d.getSeconds():d.getSeconds();

/*						
		var myTime = 'Meditation sessions are generally held every day at:<br><br/>';
		
		for(i = 0; i < start.length; i++) {
			var mtime = new Date();
			mtime.setUTCHours(start[i]);
			mtime.setUTCMinutes(0);
			
			myTime += '<b>'+(start[i]<10?'0':'')+start[i]+'00h UTC</b> - <i>('+(mtime.getHours()>12?mtime.getHours()-12:mtime.getHours())+':'+((mtime.getMinutes()<10?'0':'')+mtime.getMinutes())+' '+(mtime.getHours()>11 && mtime.getHours()<24?'PM':'AM')+' your time)</i><br/>';
		}
*/
		var myTime = '<b id="now">'+hour+':'+minute+':'+second + ' UTC, '+ monthNames[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', '+d.getUTCFullYear()+'</b><br/><i>('+lhour+':'+lminute+':'+lsecond+', '+ monthNames[d.getMonth()] + ' ' + d.getDate() + ', '+d.getFullYear()+' your time)</i>';
		$('#time').html(myTime);
		
		
		
		window.setTimeout(function() {refreshTime() },1000);

		if(++seq % 10 == 0 && !G_static) {
			if(++seq % 60 == 0){
				listVersion = -1;
				chatVersion = -1;
				seq = 0;
			}
				
			submitData();
		}
		
}

function submitData(submit,formid) {
	
	if(formid == 'cancelform') {
		imWalking = false;
		imSitting = false;
		imMeditating = false;
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
	serializedData += (serializedData.length > 0?'&':'')+"last_chat="+lastChatTime;
	serializedData += (serializedData.length > 0?'&':'')+"source=web";

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
		else {
			if(chatObj.length < G_chatObj.length) {
				chatObj = G_chatObj.concat(chatObj);
				chatObj = chatObj.slice(chatObj.length - G_chatObj.length); // max length will be G_chatObj.length (50)
			}
			G_chatObj = chatObj;
		}

		var hoursObj = result.hours;


		var chats = '';
		var meds = false;
		
		var medList = [];
		var imMeditating = false;
		
		var latestChatTime = 0;
		
		chats += '<table id="chat-table">';
		for(var i = 0; i < chatObj.length; i++) {
			var then = chatObj[i].time-2;
			
			latestChatTime = chatObj[i].time;
			
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
			
			var chat_username = chatObj[i].username;
			
			chatUsers[chat_username] = true;
			
			chat_username = chat_username.replace(' ','&nbsp;');

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

			chats += '<tr class="achat" style="color:'+hexColorString+'"><td class="chattime"><span>'+time+'</span></td><td class="chat-message-shell"><span class="chatname'+(chatObj[i].me=='true'?'-me':'')+'"><a class="noline" target="_blank" href="/profile.php?user='+chat_username+'">'+chat_username+'</a>:&nbsp;</span>'+formatChatMessage(chatObj[i].message)+'</td>'+(logged_user == 'Yuttadhammo'?'<td class="del-chat"><a href="javascript:void()" onclick="submitData(true,\'delchat_'+chatObj[i].cid+'\')">x</a></td>':'')+'</td></tr>';

		}
		
		var output = '<table id="listt"><tr><td class="thead">Currently</td><td class="thead">Name</td><td class="thead">Country</td><td class="thead">Walking</td><td class="thead">Sitting</td><td class="thead">+1</td></tr>';
		
		var avatars = '';
		
		var meStart = 0;
		
		for(var i = 0; i < obj.length; i++) {
			
			// is a meditator
			
			meds = true;
			
			var user = obj[i].username;
			var start = obj[i].start;
			var end = obj[i].end;
			var walking = obj[i].walking;
			var sitting = obj[i].sitting;
			var me = obj[i].me == 'true';

			// change my type
			
			if(me)
				$('#type').val(obj[i].type == "love" ? "normal" : "love");

			// tells us that this session is our latest so far (in case of multiple me sessions)

			if(me && start > meStart)
				meStart = start;
			
			// add to meditator list
			
			medList[user] = 1;
			
			// figure out what they're doing
			
			var time = Math.ceil(new Date().getTime() / 1000);
			
			var opacity = "";

			var walkOut = walking;
			var sitOut = sitting;

			var current = "walking";
			
			if(end < time) {
				
				if(me&& meStart == start && imMeditating) {
					imMeditating = false;
				}
				
				var opi = 1 - (Math.round((time-end)*10/(60*60*2))/10)/2;
				if(opi > 1)
					opi = 1;
				opacity = ' style="opacity:'+opi+'"';
				
				current = "finished";
			}
			else {

				if(me && meStart == start)
					imMeditating = true;

			
				var elapsed = time - start;
				
				var walks = walking * 60;
				var sits = sitting * 60;


				// sitting
				if(walks < elapsed) {
					if(me && meStart == start) {
						if(imWalking && walking > 0) // walking finished
							ringTimer();
							
						imWalking = false;
						imSitting = true;
					}
					
					current = "sitting";
					var walkm = 0;
					var sitm = Math.floor((sits + walks - elapsed)/60);
				}
				else {
					if(me && meStart == start) {
						imWalking = true;
						imSitting = false;
					}
					var walkm = Math.floor((walks - elapsed)/60);
					var sitm = sitting;
				}
				
				walkOut = walkm + '/' + walking;
				sitOut = sitm + '/' + sitting;

				avatars += '<div class="rot"><a href="/profile.php?user='+user+'" target="_blank"><img class="avatar" src="'+(obj[i].avatar)+'"></a><div class="avatar-info">'+(obj[i].country?'<img class="avatar-flag" title="'+user+' is from '+countries[obj[i].country]+'" src="images/flags/16/'+obj[i].country.toLowerCase()+'.png">&nbsp;':'')+'<a class="avatar-title" href="/profile.php?user='+user+'" target="_blank">'+user+'</a><br/>'+(current ==  'walking'?'<b>'+walkOut+'</b>':walkOut)+'<br/>'+(current ==  'sitting'?'<b>'+sitOut+'</b>':sitOut)+'</div></div>';					

			}

			var current_status = obj[i].type == "love" ? "love_icon.png" : current + '_icon.png';			

			var anumodana = '<span class="anumodana" title="Anumodana!" onclick="submitData(true,\'anumed_'+obj[i].sid+'\')"><img src="/images/left_hand.png" height=16>'+(obj[i].anumodana > 0?'<span class="anu-number'+(obj[i].anu_me == "1" ? ' anu-me' :'')+'">'+obj[i].anumodana+'</span>':'')+'<img src="/images/right_hand.png" height=16></span>';

			output += '<tr'+opacity+'><td>'+(me && current == 'finished' ?'<a href="javascript:void()" onclick="submitData(true,\'change_type\')">':'')+'<img src="'+ current_status + '" height="16" title="'+current+'">'+(me && current == 'finished'?'</a>':'')+'</td><td class="medname'+(me?'-me':'')+'"><a class="noline" target="_blank" href="/profile.php?user='+user+'">' + user + '</a></td><td class="medcountry">'+(obj[i].country?'<img title="'+user+' is from '+countries[obj[i].country]+'" src="images/flags/16/'+obj[i].country.toLowerCase()+'.png">':'')+'</td><td>' + walkOut +'</td><td>' + sitOut +'</td><td>' + anumodana +'</td></tr>';
		}
		
		// timer ringing
		
		if(!imMeditating && (imWalking || imSitting)) { // sitting done
			ringTimer();
			imWalking = false;
			imSitting = false;
		}

		var now = new Date();

		// skip hours field if same
		
		if(hoursObj instanceof Array) {
		
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

		// chats

		chats += '</table>';
		var chatd = $('#chats');

		var scrolled = chatd.scrollTop();
		
		chatd.html(chats);

		if(lastChatTime < latestChatTime) {
			chatd.scrollTop(chatd.prop("scrollHeight"));
			lastChatTime = latestChatTime;
		}
		else
			chatd.scrollTop(scrolled);

		// avatar circle

		$('#avatar-container').html(avatars);
		createAvatarCircle();
		
		
		// live?

		var sched = result.schedule;
		var nextEvent = -1;
		var nowHour = now.getUTCHours();
		var nowMin = now.getUTCMinutes();
		var timeLeft = 24*60;
		var nowTime = nowHour*60 + nowMin;
		
		for(var i = 0; i < sched.length; i++) {
			
			var eHour = parseInt(sched[i].time.substring(0,2).replace(/^0/,''));
			var eMin = parseInt(sched[i].time.substring(2,4).replace(/^0/,''));
			
			var eTime = eMin + eHour * 60;
			if((eTime > nowTime && eTime - nowTime < timeLeft)) {
				timeLeft = eTime - nowTime;
				nextEvent = i;
			}
			else if(eTime < nowTime && eTime + 24*60 - nowTime < timeLeft) {
				timeLeft = eTime + 24*60 - nowTime;
				nextEvent = i;
			}
		}
		

		if(result.live != 'false' && !isLive) {
			$('#live_feed').html('<a href="'+result.live+'">Audio is live. Click here for live audio dhamma.<br/>'+result.live+'</a><br/><audio controls><source src="'+result.live+'" type="audio/mpeg">Your browser does not support HTML5 audio.</audio>');		
			isLive = true;
		}
		else if(nextEvent > -1) { // scheduled event
			$('#live_feed').html('Live stream currently offline. Next broadcast is <b>'+sched[nextEvent].title+'</b> at <b>'+sched[nextEvent].time+'h UTC</b> ('+(timeLeft > 60 ? Math.floor(timeLeft/60)+'h'+(timeLeft % 60 != 0?' and '+timeLeft % 60+'m':'') :timeLeft+'m')+' from now). Visit our <a class="link" href="/live" target="_blank">live stream archive</a> for past talks.');
			isLive = false;
		}
		else if (result.live == 'false' && isLive) {
			$('#live_feed').html('Live stream currently offline. Visit our <a class="link" href="/live" target="_blank">live stream archive</a> for past talks.');
			isLive = false;
		}

		// login form	
		
		var loggedUsers = result.loggedin;
		var loggedOut = [];
		for(var i = 0; i < loggedUsers.length; i++) {
			loggedOut.push('<span class="one-logged-in-user'+(medList[loggedUsers[i].username]?'-med':'')+'" title="'+(medList[loggedUsers[i].username]?'':'not ')+'meditating">'+(loggedUsers[i].source == 'android'?'<a href="https://play.google.com/store/apps/details?id=org.sirimangalo.meditationplus" target="_blank"><img src="images/android.png" height="12" title="User is on Android"></a>':'')+'<a class="noline" target="_blank" href="/profile.php?user='+loggedUsers[i].username+'">'+loggedUsers[i].username+'</a></span>');
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

function formatChatMessage(message) {
	message = replaceSmilies(message);
	if(logged_user.length > 0)
		message = message.replace('@'+logged_user,'<span class="red">@<x/>'+logged_user+'</span>');

	var ats = message.match(new RegExp('@[-a-zA-Z0-9_]+','gi'));
	
	if(!ats)
		return message;

	for(var i = 0; i < ats.length; i++) {
		var u = ats[i].substring(1);
		if(chatUsers[u]) {
			message = message.replace(new RegExp(ats[i],'i'),'<a class="link" target="_blank" href="/profile.php?user='+u+'">@<x/>'+u+'</a>');
		}
	}
	
	return message;
}

function createAvatarCircle() {
	var no = $('.rot').length;
	
	if(no == 0) {
		$('#avatar-container').hide();
		return;
	}

	$('#avatar-container').show();

	var baseSize = 30;
	var eachSize = baseSize/no;
	
	if(eachSize > baseSize/3)
		eachSize = baseSize/3;
	else if (eachSize < baseSize/5)
		eachSize = baseSize/5;

	$('#avatar-container').css({
		'padding':eachSize*0.7+'em',
		'width':baseSize+'em',
		'height':baseSize+'em',
	});
	
	var margin = (800 - document.getElementById('avatar-container').offsetWidth)/2;

	document.getElementById('avatar-container').style.margin = '0 '+margin+'px 10px';

	
	$('.rot').each(
		function(i, el) {
			el.style.width = eachSize+'em';
			el.style.height = eachSize+'em';
			el.style.margin = (-eachSize/2)+'em';
			var angle = 360/no*(i+1);
			el.style.transform = 'rotate('+angle+'deg) translate('+(baseSize/2)+'em) rotate(-'+angle+'deg)';
			
			var elw = el.offsetWidth;
			$(el).find('.avatar-info').each(
				function(i) {
					this.style.fontSize = (80+(20/no))+'%';
					this.style.marginLeft = (this.offsetWidth/(-2)+elw/2)+'px';
				}
			);
			
			
		}
	);

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
	
	// unicode hack
	
	for (i in unicode_smilies)
		text = text.replace(i,'<img class="smilie" src="http://apps.timwhitlock.info/static/images/emoji/emoji-android/'+unicode_smilies[i]+'.png">');

	// other replaces

	// youtube
	
	//text = text.replace(/https{0,1}:\/\/w{0,3}\.*youtube\.com\/watch\?\S*v=([A-Za-z0-9_-]+)[^< ]*/gi,'<iframe width="420" height="315" src="http://www.youtube.com/embed/$1?wmode=transparent" frameborder="0" allowfullscreen></iframe>');

	//text = text.replace(/https{0,1}:\/\/w{0,3}\.*youtu\.be\/([A-Za-z0-9_-]+)[^< ]*/gi,'<iframe width="420" height="315" src="http://www.youtube.com/embed/$1?wmode=transparent" frameborder="0" allowfullscreen></iframe>');

	// image

	//text = text.replace(/(https*:\/\/[-\%_\/.a-zA-Z0-9+]+\.(png|jpg|jpeg|gif|bmp))[^< ]*/gi,'<img src="$1" style="max-width:420px;max-height:315px" />');
	
	// link
	
	text = text.replace(/((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/g,"<a href=\"$1\" target=\"_blank\" class=\"link\">$1</a>");

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
		if(message.indexOf() > 1000) {
			error = 'chat message max 400 char';
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
		document.getElementById("audio-"+whichAudio).pause();
		document.getElementById("audio-"+whichAudio).setAttribute("currentTime",0);
	}
	whichAudio = $( "#audio-select" ).val();
	if(whichAudio == 'none')
		return;
	document.getElementById("audio-"+whichAudio).play();
}

function loadAudio(cookie) {
	whichAudio = $( "#audio-select" ).val();
	
	if(cookie)
		createCookie('timer_tone',whichAudio,365*10);

	if(whichAudio == 'none')
		return;
	
	document.getElementById("audio-"+whichAudio).load();
}

function stopTimer() {
	whichAudio = $( "#audio-select" ).val();
	if(whichAudio == 'none')
		return;

	document.getElementById("audio-"+whichAudio).pause();
	document.getElementById("audio-"+whichAudio).setAttribute("currentTime",0);
}

function dAlert(s) {
	if(logged_user && logged_user == 'Yuttadhammo')
		alert(s);
}
