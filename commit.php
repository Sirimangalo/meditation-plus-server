<?php
require('bar.php');

?><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml">
<head>
	<title>Meditation+ Commitments</title>
	<meta http-equiv="content-type" content="text/html;charset=utf-8" />
	<meta name="generator" content="Geany 0.21" />
	<link rel="stylesheet" type="text/css" href="styles.css">
	<link rel="image_src" href="http://static.sirimangalo.org/images/dhammawheelcommunity_t.png" />
	<link rel="Shortcut Icon" type="image/x-icon" href="http://www.sirimangalo.org/favicon.ico" />
	<script src="//ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js"></script>
	<script src="tz.js"></script>
	<script src="//ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js"></script>
	<script>

<?php
	
	echo '
		var G_static = '.(isset($_GET['static'])?'true':'false')+';';
		
	if(isset($_SESSION['loggedin']) && $_SESSION['loggedin']) {
		echo '
		var logged_user = \''.$_SESSION['username'].'\';';
	}
	else
		echo '
		var logged_user = \'\';';
?>
	</script>
	<script src="commitments.js?ver=2"></script>
</head>

<body onload="loaded()">
<?php echo $header_bar; ?>
	<div id="content">
		<div id="header">
			<div class="heading">Commitments</div>
			<div class="p"> Here are our commitments. This is experimental, so please be gentle!</div>
			<div id="live"></div>
<?php
	echo $sError;
	if(isset($_SESSION['loggedin']) && $_SESSION['loggedin']) {
		echo '<div id="loggedin">You are logged in as <span id="loggeduser">' . $_SESSION['username'] . '</span>. <span id="logout">(<a href="redirect.php?action=logout">Logout</a>)</span></div>'; 
	}
	else {
		echo '<div id="login">Please login or register to participate: <form name="login" method="post" action="redirect.php?action=login"> Username: <input type="text" name="username" /> Password: <input type="password" name="password" /> <input type="submit" name="submit" value="Login" /> <input type="submit" name="submit" value="Register" /></form>.</div>'; 
		exit();
	}
?>
			
		</div>
		<div id="inner">
			<div id="my-commitments"></div>
			<div id="commitments"></div>
			<div id="new-commitment">
				<div id="new-comm-title">New Commitment</div>
				<form id="newform">
					Title<br/>
					<input name="title" id="title"><br/><br/>
					Description<br/>
					<textarea name="desc" id="desc"></textarea>
					<hr/>
					Period: 
					<select onchange="showHideDays()" name="period" id="period">
						<option value="daily">daily</option>
						<option value="weekly">weekly</option>
						<option value="monthly">monthly</option>
						<option value="yearly" disabled>yearly</option>
					</select>
					<hr/>
					Type of commitment:
					<input type="radio" id="type0" name="type" value="total" checked onclick="showHideType()">Total&nbsp;
					<input type="radio" id="type1" name="type" value="repeat" onclick="showHideType()">Repeated
					<div id="total-type">Total amount per period (min): <input id="length" name="length"></div>
					<div id="repeat-type">Walking (min): <input id="walking" name="walking" size="2"> Sitting (min): <input id="sitting" name="sitting" size="2"></div>
					<hr/>
					<div id="dow">
						Day of Week: 
						<select name="dow" id="dow">
							<option value="0">Sunday</option>
							<option value="1">Monday</option>
							<option value="2">Tuesday</option>
							<option value="3">Wednesday</option>
							<option value="4">Thursday</option>
							<option value="5">Friday</option>
							<option value="6">Saturday</option>
						</select>
						<hr/>
					</div>
					<div id="dom">
						Day of Month: 
						<input size="2" name="dom" id="dom">
						<hr/>
					</div>
					<div id="doy">
						Day of Year: 
						<input size="3" name="doy" id="doy">
						<hr/>
					</div>
					<div id="spec-time-shell">
						<input type="checkbox" onclick="showHideTime()" name="spec-time" id="spec-time"> Specific Time
						<div id="time-shell">
							Time of Start: 
							<input size="3" name="hour" id="hour">:
							<input size="3" name="min" id="min"> (24-hour time UTC)
						</div>
						<hr/>
					</div>
					<input id="new-button" type="button" onclick="submitData(true,'newform')" value="Submit">
					<input id="edit-com" name="edit-com" type="hidden" value="">
				</form>
			</div>
		</div>
	</div>
</body>
</html>
