<?php
require_once('config.php');

$isMe = true;

$edit = false;

$profilePage = true;

if(isset($_GET['user'])) {
	$profile = $_GET['user'];

	if(isset($_SESSION['username'])) {
		if($_SESSION['username'] != $profile) {
			$isMe = false;
			if(in_array($_SESSION['username'],$admin))
				$edit = true;
		}
		else
			$edit = true;
	}
}
else if(isset($_SESSION['username'])) {
	$profile = $_SESSION['username'];
	$edit = true;
}
else
	die('You are not logged in');

require('profiledb.php');
require('countries.php');

require('bar.php');


?><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml">
<head>
	<title>Meditation+ Profile</title>
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

	echo '
		var G_edit = '.($edit?'true':'false')+';';


?>
	</script>
	<script src="profile.js?ver=1"></script>
</head>

<body onload="loaded()">
<?php echo $header_bar; ?>
	<div id="content">
<?php 

if(!loggedIn())
	die('Not logged in.');

if(empty($profilea))
	die('Profile not found.');

if($edit) {
?>
		<div id="header">
			<div class="heading"><?php echo $profile; ?></div>
		</div>
		<div id="inner">
			<div id="profile">
				<div id="profile-title">Profile</div>
				<br/>
				<form id="profform" method="POST">
					<span class="profile-field-head">Name</span>
					<input name="name" id="name" value="<?php echo $profile; ?>"><hr/>
					<span class="profile-field-head">Profile Image (square)</span>
					<input name="img" id="img" value="<?php echo $profilea['img']; ?>"><hr/>
					<span class="profile-field-head">About</span><br/>
					<textarea name="desc" id="desc" rows="4" cols="40"><?php echo $profilea['description']; ?></textarea>
					<hr/>
					<span class="profile-field-head">Email</span>
					<input name="email" id="email" size="50" value="<?php echo $profilea['email']; ?>"><hr/>
					<span class="profile-field-head">Show Email</span> (<i>otherwise email is only used for recovering your password</i>):<br/>
					<input type="radio" id="show_email0" name="show_email" value="0"<?php echo ($profilea['show_email'] == 0 ?' checked':'') ?>>Don't show
					<input type="radio" id="show_email1" name="show_email" value="1"<?php echo ($profilea['show_email'] == 1 ?' checked':'') ?>>Show <hr/>
					<span class="profile-field-head">Website</span>
					<input name="website" id="website" size="50" value="<?php echo $profilea['website']; ?>">
					<hr/>
					<span class="profile-field-head">Country</span>
					<select name="country" id="country"><?php
						foreach($countries as $code => $country) {
							echo '<option value="'.$code.'"'.($code == $profilea['country'] ? ' selected' : '').'>'.$countries[$code].'</option>';
						}
					?>"></select>
					<hr/>
					<input type="submit" name="submit" value="Submit">
					<input type="hidden" name="old_name" value="<?php echo $profile; ?>">
					<input type="hidden" name="uid" value="<?php echo $profilea['uid']; ?>">
					<input type="hidden" name="form_id" value="profile">
				</form>
			</div>
<?php }
else {
?>
		<div id="header">
			<div class="heading"><?php echo $profile; ?></div>
			<div id="profile-img"><?php if($profilea['img']) echo '<img src="'.$profilea['img'].'" width="100px" height="100px">';?></div>
		</div>
		<div id="inner">
			<div id="profile">
				<div id="profile-title">Profile:</div>
				<hr/>
				<span class="profile-field-head">Name: </span>
				<span name="name-span" id="name-span"><?php echo htmlspecialchars($profile); ?></span></<br/><br/>
				<span class="profile-field-head">About</span>
				<span name="desc-span" id="desc-span"><?php echo nl2br(htmlspecialchars($profilea['description'])); ?></span>
				<hr/>
<?php if($profilea['show_email'] == 1) { ?>
				<span class="profile-field-head">Email</span>
				<span name="email-span" id="email-span"><?php echo $profilea['email']; ?></span><br/><br/>
<?php
}
?>
				<span class="profile-field-head">Website</span>
				<span name="website-span" id="website-span"><?php echo htmlspecialchars($profilea['website']); ?></span>
				<hr/>
				<span class="profile-field-head">Country: </span>
				<span name="country-span" id="country-span"><?php echo $countries[$profilea['country']]; ?></span>
				<div id="big-flag"><?php if($profilea['country']) echo '<img src="images/flags/48/'.strtolower($profilea['country']).'.png">';?></div>
			</div>
<?php
}
?>
		</div>
	</div>
</body>
</html>
