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

		$uid =(int)$_POST['uid'];
		$show_email = (int)$_POST['show_email'];
		
		if(($_SESSION['username'] == $old_name || in_array($_SESSION['username'],$admin))
		&& strlen($name) <= 20
		&& strlen($email) <= 50
		&& strlen($website) <= 50
		&& strlen($desc) <= 255
		&& strlen($country) == 2
		&& strlen($img) <= 255
		) {
			$sqla = "UPDATE users SET username='".$name."', description='".$desc."', email='".$email."', show_email=".(int)$show_email.", website='".$website."', country='".$country."', img='".$img."' WHERE username = '".$old_name."' AND uid = ".$uid;
			$query = mysqli_query($con, $sqla) or trigger_error("Query Failed: " . mysqli_error($con)); 
			if(!isset($profilePage))
				die('{"success":1}');
		}
	}
}

if(!isset($edit))
	$edit = loggedIn() && ($_SESSION['username'] == $_POST['profile'] || in_array($_SESSION['username'],$admin));

$sql="SELECT users.uid, username".($edit?", email":"").", show_email, website, description, country, img, UNIX_TIMESTAMP(start) AS start, walking, sitting, UNIX_TIMESTAMP(end) AS end FROM users LEFT JOIN sessions ON users.uid = sessions.uid WHERE username='".(isset($profilePage)?$profile:$_POST['profile'])."' AND start > '".gmdate('Y-m-d H:i:s',strtotime('1 week ago'))."'";

$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 

$profilea = [];

$hours = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

while($row = mysqli_fetch_assoc($query)) {
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
