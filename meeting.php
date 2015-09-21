
<?php
require_once('config.php');

$mmins = 60*24+1;
$mday = -1;

if(isset($_SESSION['username'])) {

	if(!in_array($_SESSION['username'],$admin) && isset($_GET['room'])) {
		$sql="SELECT day, time FROM appointments JOIN appointment_slots ON appointments.aid = appointment_slots.id JOIN users ON users.uid = appointments.uid WHERE username='".$_SESSION['username']."'";

		$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con));

		$isUp = false;
		
		$dow = (int)gmdate('N');
		if($dow == 7)
			$dow = 0;
		
		$mins = (int)gmdate('G') * 60 + (int)gmdate('i');
		
		while($row = mysqli_fetch_assoc($query)) {
			$mmins = (int)substr($row['time'],0,2) * 60 + (int)substr($row['time'],2,2);
			if($row['day'] == gmdate('N') && $mins > $mmins && $mins - $mmins < 30) {
				$mday = $row['day'];
				$isUp = true;
				break;
			}
		}

		if(!$isUp) {
			header('location:http://meditation.sirimangalo.org/appointment.php');
			die();
		}
		
	}
}
else{
	header('location:http://meditation.sirimangalo.org/appointment.php');
	die();
}

require('bar.php');


?><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml">
<head>
	<title>Meditation+ Meeting Room</title>
	<meta http-equiv="content-type" content="text/html;charset=utf-8" />
	<meta name="generator" content="Geany 0.21" />
	<link rel="stylesheet" type="text/css" href="styles.css">
	<link rel="image_src" href="http://static.sirimangalo.org/images/dhammawheelcommunity_t.png" />
	<link rel="Shortcut Icon" type="image/x-icon" href="http://www.sirimangalo.org/favicon.ico" />
	<script src="//ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js"></script>
	<script src="tz.js"></script>
	<script>

<?php

	echo ('
		var G_static = '.(isset($_GET['static'])?'true':'false').';');

	if(isset($_SESSION['loggedin']) && $_SESSION['loggedin']) {
		echo '
		var isAdmin = '.(in_array($_SESSION['username'],$admin)?'true':'false').';
		var logged_user = \''.$_SESSION['username'].'\';';
	}
	else
		echo '
		var isAdmin = false;
		var logged_user = \'\';';

	echo '
	var day = '.$mday.';
	var mmins = '.$mmins.';';


?>

	</script>
        <script src="//simplewebrtc.com/latest.js"></script>
        <script>
	
			function loaded() {

				var webrtc = new SimpleWebRTC({
					// the id/element dom element that will hold "our" video
					localVideoEl: 'localVideo',
					// the id/element dom element that will hold remote videos
					remoteVideosEl: 'remotesVideos',
					media: {
						video: {
							mandatory: {
								maxFrameRate: 15,
								maxWidth: 320,
								maxHeight: 240
							}
						},
						audio: true
					},
					// immediately ask for camera access
					autoRequestMedia: true
				});

				// we have to wait until it's ready
				webrtc.on('readyToCall', function () {
					// you can name it anything
					webrtc.joinRoom('<?php echo(isset($_GET['room']) ? $_GET['room'] : 'general') ?>');
				});
				refreshTime();
			}
		
			var dow = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
			var monthNames = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];

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
					
					window.setTimeout(function() {refreshTime() },1000);

			}
		
        </script>
</head>

<body onload="loaded()">
<?php echo $header_bar; ?>
	<div id="content">
		<div id="header">
			<div class="heading">Meeting Room</div>
		</div>
		<div id="live"></div>
		<div id="inner" style="text-align:center">
			<video height="300" id="localVideo"></video>
			<div id="remotesVideos"></div>
		</div>
	</div>
</body>
</html>
