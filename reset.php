<?php
require_once('config.php');

$errorDiv = '
			<div id="notice-shell">
				<p>There was an error processing your request.</p>
			</div>';

$sendForm = '
			<div id="form-shell">
				<p>This form will send a reset link to your email address. Clicking on that link will allow you to reset your password.</p>
				<form method="POST">
					<p>Username: <input name="username"></p>
					<p>Email: <input name="email"></p>
					<p><input name="submit" type="submit" value="Send"></p>
				</form>
			</div>';
			
$resetForm = '
			<div id="form-shell">
				<p>Please enter a new password for your account.</p>
				<form method="POST">
					<p>Username: <input readonly name="username" value="'.@$_GET['username'] .'"></p>
					<p>New Password: <input type="password" name="newpass"></p>
					<p><input name="submit" type="submit" value="Reset"><input type="hidden" name="reset_key" value="'.@$_GET['reset_key'] .'"></p>
				</form>
			</div>';

$sendConfirm = '
			<div id="notice-shell">
				<p>A link has been sent to your inbox. Please reset your password by following that link.</p>
			</div>';

$resetConfirm = '
			<div id="notice-shell">
				<p>Your password has been reset.</p>
			</div>';

?><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml">
<head>
	<title>Meditation+ Password reset</title>
	<meta http-equiv="content-type" content="text/html;charset=utf-8" />
	<meta name="generator" content="Geany 0.21" />
	<link rel="stylesheet" type="text/css" href="styles.css?version=2">
	<link rel="image_src" href="http://static.sirimangalo.org/images/dhammawheelcommunity_t.png" />
	<link rel="Shortcut Icon" type="image/x-icon" href="http://www.sirimangalo.org/favicon.ico" />
	<script src="//ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js"></script>
</head>

<body>
	<div id="content">
		<div align="center">
<?php
	if(isset($_POST['submit']) && $_POST['submit'] == 'Send') {
		error_log('sending reset email');
		$resetKey = generateRandomString();
		
		$sql = "REPLACE INTO reset VALUES (NULL, (SELECT uid FROM users WHERE username = '".mysqli_real_escape_string($con,$_POST['username'])."' AND email='".mysqli_real_escape_string($con,$_POST['email'])."'), '".$resetKey."');";
		
		$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 

		if(mysqli_affected_rows($con) > 0) {
			if(mail($_POST['username'].' <'.$_POST['email'].'>', 'MeditationPlus Password Reset Request','Dear '.$_POST['username'].',

A password reset request was triggered on our site at http://meditation.sirimangalo.org/ in your name for this email address. To reset your password, please click on the link below:

http://meditation.sirimangalo.org/reset.php?username='.$_POST['username'].'&reset_key='.$resetKey.'

If you did not request this reset, please disregard this email. 

Thank you for participating in our meditation group.

Sincerely, 

Sirimangalo Intl Team')) {
				echo $sendConfirm;
			}
			else {
			error_log('sending reset email failed');
				echo $errorDiv;
				echo $sendForm;
			}
		}
		else {
			error_log('inserting reset key failed');
			echo $errorDiv;
			echo $sendForm;
		}
	}
	else if(isset($_POST['submit']) && $_POST['submit'] == 'Reset') {
		if(isset($_POST['newpass']) && strlen($_POST['newpass']) >= 6 && strlen($_POST['newpass']) <= 20) {
			$sql = "UPDATE users, reset SET password = '".hashPassword($_POST['newpass'], SALT1, SALT2)."' WHERE users.uid=reset.uid AND username = '".mysqli_real_escape_string($con,$_POST['username'])."' AND reset_key = '".mysqli_real_escape_string($con,$_POST['reset_key'])."';";
			
			$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 

			if(mysqli_affected_rows($con) > 0) {
				$sql = "DELETE FROM reset WHERE uid IN (SELECT uid FROM users WHERE username = '".mysqli_real_escape_string($con,$_POST['username'])."') AND reset_key = '".mysqli_real_escape_string($con,$_POST['reset_key'])."';";
				
				$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 

				echo $resetConfirm;
			}
			else {
				error_log('error updating database');
				echo $errorDiv;
				echo $resetForm;
			}
		}
		else {
			error_log('password invalid');
			echo $errorDiv;
			echo $resetForm;
		}
	}
	else if(isset($_GET['username']) && isset($_GET['reset_key'])) {
		echo $resetForm;
	}
	else {
		echo $sendForm;
	}
?>

		</div>
	</div>
<?php
require('bar.php');

echo $header_bar;

?>	
</body>
</html>
