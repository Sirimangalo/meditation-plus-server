<?php
require_once('config.php');

require('bar.php');


?><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml">
<head>
	<title>Meditation+ Appointments</title>
	<meta http-equiv="content-type" content="text/html;charset=utf-8" />
	<meta name="generator" content="Geany 0.21" />
	<link rel="stylesheet" type="text/css" href="styles.css">
	<link rel="image_src" href="http://static.sirimangalo.org/images/dhammawheelcommunity_t.png" />
	<link rel="Shortcut Icon" type="image/x-icon" href="http://www.sirimangalo.org/favicon.ico" />
	<script src="//ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js"></script>
	<script src="tz.js"></script>
	<script src="https://apis.google.com/js/platform.js" async defer></script>
	<script>
<?php

	echo ('		var G_static = '.(isset($_GET['static'])?'true':'false').';');

	if(isset($_SESSION['loggedin']) && $_SESSION['loggedin']) {
		echo '
		var isAdmin = '.(in_array($_SESSION['username'],$admin)?'true':'false').';
		var logged_user = \''.$_SESSION['username'].'\';';
	}
	else
		echo '
		var isAdmin = false;
		var logged_user = \'\';';
?>

	</script>
	<script src="appointment.js?ver=1"></script>
</head>

<body onload="loaded()">
<?php echo $header_bar; ?>
	<div id="content">
		<div class="inner">
			<div class="heading">One-On-One Reporting Schedule</div>
		</div>
		<div id="inner">
			<div id="register">
				<ul>
					<li>
						This page is for those practicing formal meditation daily who would like to undertake a formal meditation course over the Internet.
					</li>
					<li>
						Book an appointment using the table below by clicking on the appropriate box. For local time conversion, hover the mouse over the times on the left-hand side.
					</li>
					<li>
						When the time for your meeting arrives, you will see a green button in a yellow box below this text inviting you to enter a one-on-one video conversation using <a class="link bold" href="https://hangouts.google.com/">Google Hangouts</a> (please visit <a class="link bold" href="https://hangouts.google.com/">https://hangouts.google.com/</a> to make sure you are able to use this functionality.)
					</li>
					<li>
						<b>You must initiate the hangout yourself</b> by pressing the button below and inviting the teacher when prompted to do so. You will not receive a call from the teacher.
					</li>
					<li>
						<b>Please note that if you miss an appointment without notifying us, your reservation will be cancelled.</b>
					</li>
					<li>
						In order to book an appointment, you must be logged in and have set an email address on <a class="link bold" href="profile.php">your profile page</a>.
					</li>
					<li>
						You will need headphones and a microphone, and preferably a webcam as well.
					</li>
				</ul>				
			</div>
			<div class="yellow-box" id="meeting">
				<div id="meeting-user" class="p" style="text-align:center">
					
				</div>
				<div id="meeting-link">
					<div class="p" style="text-align:center">
						<!--<a id="meeting-room" class="link bold" href="meeting.php" target="_blank">Click here to enter the meeting room.</a>-->
						Click the button below to call using Google Hangouts: 
					</div>
					<div class="p" style="text-align:center">
						<div id="hangout-button"></div>
					</div>
				</div>
			</div>
		</div>
		<div id="live"></div>
		<div id="">
			<table id="appointment-schedule">
			</table>
		</div>
	</div>
</body>
</html>
