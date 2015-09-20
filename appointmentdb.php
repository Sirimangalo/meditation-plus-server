<?php

require_once('config.php');


if(isset($_POST['form_id']) && loggedIn()) {
		
	error_log($_POST['form_id']);
	
	if($_POST['form_id'] == 'appoint' && (in_array($_SESSION['username'],$admin) || $_POST['username'] == $_SESSION['username'])) {
		
		$day = mysqli_real_escape_string($con,$_POST['day']);
		$time = mysqli_real_escape_string($con,$_POST['time']);
		$username = mysqli_real_escape_string($con,$_POST['username']);

		// try deleting if already set for this user at this date and time

		$sqla = "DELETE appointments FROM appointments INNER JOIN appointment_slots ON appointments.aid=appointment_slots.id INNER JOIN users ON appointments.uid=users.uid WHERE users.username='".$username."' AND appointment_slots.day=".$day." AND appointment_slots.time='".$time."'";
		$query = mysqli_query($con, $sqla) or trigger_error("Query Failed: " . mysqli_error($con)); 
		
		if(mysqli_affected_rows($con) == 0) { // doesn't exist, try creating instead, if not already set, or user doesn't already have set (using UNIQUE on aid and uid)
			$sqla = "INSERT IGNORE INTO appointments (uid, aid) VALUES((SELECT uid FROM users WHERE username = '".$username."' AND email IS NOT NULL),(SELECT id FROM appointment_slots WHERE time = '".$time."' AND day = '".$day."'))";
			$query = mysqli_query($con, $sqla) or trigger_error("Query Failed: " . mysqli_error($con)); 
		}
	}

}

$sql="SELECT appointments.id AS id, appointments.uid as uid, day, time, username FROM appointment_slots LEFT JOIN appointments ON appointments.aid = appointment_slots.id LEFT JOIN users ON users.uid = appointments.uid ORDER BY time, day";

$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 

$appointments = [];


while($row = mysqli_fetch_assoc($query)) {
			
	$appointments[] = $row;
}

$adata = [];
foreach ($appointments as $i => $c) {
	$adata[$c['time']][$c['day']] = $c;
	if(in_array($_SESSION['username'],$admin) || $adata[$c['time']][$c['day']]['username'] == $_SESSION['username'])
		$adata[$c['time']][$c['day']]['room'] = sha1(md5(SALT1 . $adata[$c['time']][$c['day']]['username'] . $c['time'] . $c['day'] . SALT2));
}
	
$data = array(
	'appointments' => $adata,
);

echo json_encode($data);
