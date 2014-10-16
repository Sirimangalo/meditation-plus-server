function loaded() {
	$( 'pform' ).bind('keypress', function(e){
		if ( e.keyCode == 13 ) {
			$( this ).find( 'input[type=button]:first' ).click();
		}
	});

	$('#dow').hide();
	$('#dom').hide();
	$('#doy').hide();
	$('#spec-time-shell').hide();
	$('#time-shell').hide();
	$('#repeat-type').hide();

	submitData(false);
	refreshTime();
}

var obj;

var monthNames = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];

var dow = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function showHideDays() {

	$('#dow').hide();
	$('#dom').hide();
	$('#doy').hide();

	var period = $('#period option:selected').index();

	if($('input[name=type]:checked').val() == 'total')
		$('#spec-time-shell').hide();
	else {
		$('#spec-time-shell').show();
		if(period == 1)
			$('#dow').show();
		else if(period == 2)
			$('#dom').show();
		else if(period == 3)
			$('#doy').show();
	}
}
function showHideTime() {
	var specTime = $('#spec-time').prop('checked');
	if(specTime)
		$('#time-shell').show();
	else
		$('#time-shell').hide();
}
function showHideType() {
	showHideDays();
	var type = $('input[name=type]:checked').val();
	if(type == 'repeat') {
		$('#total-type').hide();
		$('#repeat-type').show();
	}
	else {
		$('#total-type').show();
		$('#repeat-type').hide();
	}
		
}

function refreshTime() {
		var d = new Date();
		var hour = d.getUTCHours().toString().length == 1 ? '0'+d.getUTCHours():d.getUTCHours();
		var minute = d.getUTCMinutes().toString().length == 1 ? '0'+d.getUTCMinutes():d.getUTCMinutes();
		var second = d.getUTCSeconds().toString().length == 1 ? '0'+d.getUTCSeconds():d.getUTCSeconds();
		var lhour = d.getHours().toString().length == 1 ? '0'+d.getHours():d.getHours();
		var lminute = d.getMinutes().toString().length == 1 ? '0'+d.getMinutes():d.getMinutes();
		var lsecond = d.getSeconds().toString().length == 1 ? '0'+d.getSeconds():d.getSeconds();

						
		var myTime = 'The time now is:<br/><br/><b id="now">'+hour+':'+minute+':'+second + ' UTC, '+ monthNames[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', '+d.getUTCFullYear()+'</b><br/><i>('+lhour+':'+lminute+':'+lsecond+', '+ monthNames[d.getMonth()] + ' ' + d.getDate() + ', '+d.getFullYear()+' your time)</i>';

		$('#live').html(myTime);
		
		window.setTimeout(function() {refreshTime() },1000);

		if(++seq % 60000 == 0 && !G_static) {
			submitData();
		}

}


function submitData(submit,formid) {
	
	if(formid == 'cancelform') {
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
		var $inputs = $form.find("input, textarea, select");
		
		if($inputs.length > 0) {
			
			if(!validateForm(formid))
				return;

			// get form name
				
			// serialize the data in the form
			serializedData = $inputs.serialize();
		}

		serializedData = (serializedData.length >0 ?serializedData+'&':'')+"form_id="+formid+(logged_user?"&username="+logged_user:'');

		// let's disable the inputs for the duration of the ajax request
		// Note: we disable elements AFTER the form data has been serialized.
		// Disabled form elements will not be serialized.
		$inputs.prop("disabled", true);
	}
	else
		serializedData = logged_user?"username="+logged_user:'';

	// fire off the request to /commitdb.php
	request = $.ajax({
		url: "/commitdb.php",
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

		// reset
		clearForm();
		
		obj = result.commitments;
		
		var output = '';
		
		for(var i = 0; i < obj.length; i++) {

			var length = obj[i]['length'];
			var time = obj[i]['time'];
			var def = '';

			var repeat = false;

			if(length.indexOf(':') > 0) {
				repeat = true;
				var lengtha = length.split(':');
				def += lengtha[0]+' minutes walking and '+ lengtha[1] + ' minutes sitting';
			}
			else
				def += length+' minutes total meditation';
			
			var period = obj[i]['period'];
			
			var day = obj[i]['day'];

			if(period == 'daily') {
				if(repeat)
					def += ' every day';
				else
					def += ' per day';
			}
			else if(period == 'weekly'){
				if(repeat)
					def += ' every '+ dow[day];
				else
					def += ' per week';
			}
			else if(period == 'monthly'){
				if(repeat)
					def += ' on the '+ day +(day.charAt(day.length-1) == '1' ?'st':(day.charAt(day.length-1) == 2?'nd':(day.charAt(day.length-1) == 3?'rd':'th')))+' day of the month';
				else
					def += ' per month';
			}
			else if(period == 'yearly'){
				if(repeat)
					def += ' on the '+ day +(day.charAt(day.length-1) == '1' ?'st':(day.charAt(day.length-1) == 2?'nd':(day.charAt(day.length-1) == 3?'rd':'th')))+' day of the year';
				else
					def += ' per year';
			}

			if(time != 'any') {
				var mtime = new Date();
				mtime.setUTCHours(time.split(':')[0]);
				mtime.setUTCMinutes(time.split(':')[1]);
				def += ' at '+(time.length == 4?'0':'')+time.replace(':','')+'h UTC <i>('+(mtime.getHours()>12?mtime.getHours()-12:mtime.getHours())+':'+((mtime.getMinutes()<10?'0':'')+mtime.getMinutes())+' '+(mtime.getHours()>11 && mtime.getHours()<24?'PM':'AM')+' your time)</i>';
			}

			var usera = [];
			
			var committed = -1;
			
			for(j in obj[i]['users']) {
				var ucomm = obj[i]['users'][j];
				if(j == logged_user)
					committed = ucomm;
				
				var k = j;
				
				if(j == obj[i]['creator'])
					k = '['+j+']';
				if(ucomm == '100')
					usera.push('<span class="committed" title="user has fulfilled their commitment">'+k+'</span>');
				else
					usera.push('<span class="uncommitted" title="user has fulfilled '+ucomm+'% of their commitment">'+k+'</span>');
			}
			var commit = '';
			if(logged_user) {
				if(obj[i]['users'][logged_user] == null)
					commit = '<input type="button" onclick="submitData(true,\'commitform_'+obj[i]['cid']+'\')" value="Commit">';
				else if(obj[i]['creator'] != logged_user)
					commit = '<input type="button" onclick="submitData(true,\'uncommitform_'+obj[i]['cid']+'\')" value="Uncommit">';
				else
					commit = '<input type="button" onclick="editCommit('+i+')" value="Edit"><input type="button" onclick="submitData(true,\'delcommitform_'+obj[i]['cid']+'\')" value="Delete">';
			}
			output += '<div class="a-comm-shell'+(committed == '100'?'-committed" title="you have fulfilled your commitment':(committed != '-1'?'-uncommitted" title="you have fulfilled '+committed+'% of your commitment':''))+'"><div class="a-comm-title">'+obj[i]['title']+'</div><div class="a-comm-desc">'+obj[i]['description']+'</div><div class="a-comm-creator">'+obj[i]['creator']+'</div><div class="a-comm-def">'+def+'</div><div class="a-comm-users">'+usera.join(', ')+'</div><div class="a-comm-commit">'+commit+'</div></div>';
		}
		$('#commitments').html(output);
	});

	// callback handler that will be called regardless
	// if the request failed or succeeded
	request.always(function () {
		// reenable the inputs
		if($inputs)
			$inputs.prop("disabled", false);
	});
}

function editCommit(id) {

    $('html, body').animate({
        scrollTop: $("#new-comm-title").offset().top
    }, 500);

	$('#new-comm-title').html('Edit Commitment');

	var c = obj[id];
	
	$('#edit-com').val(c['cid']);

	$('#title').val(c['title']);
	$('#desc').val(c['description']);
	
	$('#period').val(c['period']);
	
	switch(c['period']) {
		case 'weekly':
			$('#dow').val(c['day'])
			break;
		case 'monthly':
			$('#dom').val(c['day'])
			break;
		case 'yearly':
			$('#doy').val(c['day'])
			break;
	}
	
	var repeat = c['length'].indexOf(':') > -1;
	
	$('#type'+(repeat?'1':'0')).prop('checked',true);

	if(c['time'] != 'any') {
		$('#spec-time').prop('checked',true);
		$('#hour').val(c['time'].split(':')[0]);
		$('#min').val(c['time'].split(':')[1]);
	}
		
	
	if(repeat) {
		$('#walking').val(c['length'].split(':')[0]);
		$('#sitting').val(c['length'].split(':')[1]);
	}
	else {
		$('#length').val(c['length']);
	}
	
	showHideDays();
	showHideTime();
	showHideType();
	
}

function clearForm() {
	
	$('#new-comm-title').html('New Commitment');
	$('#edit-com').val('');

	$('#title').val('');
	$('#desc').val('');
	
	$('#period').val('daily');
	
	$('#dow').val('0')
	$('#dom').val('')
	$('#doy').val('')
	
	$('#type0').prop('checked',true);

	$('#spec-time').prop('checked',false);
	$('#hour').val('');
	$('#min').val('');
		
	$('#walking').val('');
	$('#sitting').val('');
	$('#length').val('');
	
	showHideDays();
	showHideTime();
	showHideType();
	
}

function validateForm(id) {
	var error = '';
	
	if(id == 'newform') {
		var title = $('#title').val();
		var desc = $('#desc').val();
		
		var dom = parseInt($('#dom').val());
		var doy = parseInt($('#doy').val());
		var wi = parseInt($('#walking').val());
		var si = parseInt($('#sitting').val());
		var length = parseInt($('#length').val());
		var hi = parseInt($('#hour').val());
		var mi = parseInt($('#min').val());
		
		if(!logged_user) {
			error = 'Please log in first';
		}
		else if($('input[name=type]:checked').val() == 'repeat') {
			if($('#period option:selected').index() == 2 && dom < 1 || dom > 31)
				error = 'invalid day of month';
			else if($('#period option:selected').index() == 3 && doy < 1 || doy > 365)
				error = 'invalid day of year';
			else if(wi > 60)
				error = 'max time 60 minutes';
			else if(si > 60) 
				error = 'max time 60 minutes';
			else if(wi < 0) 
				error = 'invalid walking time';
			else if(si < 0) 
				error = 'invalid sitting time';
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
