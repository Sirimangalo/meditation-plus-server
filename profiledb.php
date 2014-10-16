<?php

if(isset($_POST['submit'])) {
	if(loggedIn()) {
		
		$name = mysqli_real_escape_string($con,$_POST['name']);
		$old_name = mysqli_real_escape_string($con,$_POST['old_name']);
		$desc = mysqli_real_escape_string($con,$_POST['desc']);
		$email = mysqli_real_escape_string($con,$_POST['email']);
		$website = mysqli_real_escape_string($con,$_POST['website']);
		$country = mysqli_real_escape_string($con,$_POST['country']);

		$uid =(int)$_POST['uid'];
		$show_email = (int)$_POST['show_email'];
		
		if($_SESSION['username'] == $old_name || in_array($_SESSION['username'],$admin)) {
			$sqla = "UPDATE users SET username='".$name."', description='".$desc."', email='".$email."', show_email=".(int)$show_email.", website='".$website."', country='".$country."' WHERE uid = ".$uid;
			$query = mysqli_query($con, $sqla) or trigger_error("Query Failed: " . mysqli_error($con)); 
		}
	}
}

$sql="SELECT uid, username, email, ".($edit?"show_email, ":"")."website, description, country FROM users WHERE username='".$profile."'";

$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 

$profilea = [];

$row = mysqli_fetch_assoc($query);

foreach($row as $key => $val)
	$profilea[$key] = $val;

