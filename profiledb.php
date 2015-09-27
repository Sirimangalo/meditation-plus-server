<?php

if(isset($_POST['form_id']) && $_POST['form_id'] == 'profile') {
	if(loggedIn()) {
		$name = mysqli_real_escape_string($con,$_POST['name']);
		$old_name = mysqli_real_escape_string($con,$_POST['old_name']);
		$desc = mysqli_real_escape_string($con,$_POST['desc']);
		$email = mysqli_real_escape_string($con,$_POST['email']);
		$website = mysqli_real_escape_string($con,$_POST['website']);
		$country = mysqli_real_escape_string($con,$_POST['country']);
		$img = mysqli_real_escape_string($con,$_POST['img']);
		$pass = $_POST['newpass'];

		$uid =(int)$_POST['uid'];
		$show_email = (int)$_POST['show_email'];
		
		if(($_SESSION['username'] == $old_name || in_array($_SESSION['username'],$admin))
		&& strlen($name) <= 20
		&& (strlen($pass) === 0 || (strlen($pass) >= 6 && strlen($pass) <= 20))
		&& strlen($email) <= 50
		&& strlen($website) <= 50
		&& strlen($desc) <= 255
		&& strlen($country) == 2
		&& strlen($img) <= 255
		) {
			$sqla = "UPDATE users SET username='".$name."', ".($pass && $pass != ""?"password='".hashPassword($pass, SALT1, SALT2)."', ":'')."description='".$desc."', email='".$email."', show_email=".(int)$show_email.", website='".$website."', country='".$country."', img='".$img."' WHERE username = '".$old_name."' AND uid = ".$uid;
			$query = mysqli_query($con, $sqla) or trigger_error("Query Failed: " . mysqli_error($con)); 
			if(!isset($profilePage))
				die('{"success":1}');
		}
	}
}

$can_edit =  $can_edit || loggedIn() && ($_SESSION['username'] == $_POST['profile'] || in_array($_SESSION['username'],$admin));

$sql="SELECT u.uid, u.username, u.show_email, u.website, u.description, u.country, u.img, e.email, UNIX_TIMESTAMP(start) AS start, walking, sitting, UNIX_TIMESTAMP(end) AS end FROM users AS u LEFT JOIN users AS e ON u.uid = e.uid AND ".($can_edit ? "1" : "u.show_email=1")." LEFT JOIN sessions ON u.uid = sessions.uid AND start > '".gmdate('Y-m-d H:i:s',strtotime('1 week ago'))."' WHERE u.username='".(isset($profile)?$profile:$_POST['profile'])."'";

$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 

$profilea = [];

$hours = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

$sid = 0;
while($row = mysqli_fetch_assoc($query)) {
	$sid++;
	if(empty($profilea))
		foreach($row as $key => $val)
			if(!in_array($key, array('start','walking','sitting','end')))
				$profilea[$key] = $val;
	
	if(isset($row['start']) && $row['start'] != null) {
		$hs = (int)date('G',$row['start']);
		$he = (int)date('G',$row['end']);
		
		if($hs == $he) {
			$time = (int)$row['walking']+(int)$row['sitting'];
			$hours[$hs] += $time;
		}
		else {
			$ho = $hs+1;
			$time = 60-(int)date('i',$row['start']);
			$hours[$hs] += $time;
			while ($ho < $he) {
				$hours[$ho++] += 60;
			}
			$time = (int)date('i',$row['end']);
			$hours[$he] += $time;
		}
	}
}

$profilea['hours'] = $hours;

$profilea['can_edit'] = $edit ? 'true' : 'false';

if(!isset($profilePage))
	echo json_encode($profilea);
