<?php

require_once('config.php');


if(isset($_POST['form_id'])	&& loggedIn() && in_array($_SESSION['username'],$admin)) {
		if($_POST['form_id'] == 'schedule_create') {

			$time = mysqli_real_escape_string($con,$_POST['time']);
			$title = mysqli_real_escape_string($con,$_POST['title']);
			$desc = mysqli_real_escape_string($con,$_POST['desc']);
			
			// only add if valid
			if(strlen($time) > 3 && strlen($time) < 6 && strlen($title) > 0 && strlen($title) < 32 && strlen($desc) < 255) {
				$sql = "INSERT INTO schedule (time,title,description) VALUES('".$time."', '".$title."', '".$desc."')";
					
				$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 

				$success = 1;
				
			}
		}
		else if($_POST['form_id'] == 'schedule_edit') {

			$time = mysqli_real_escape_string($con,$_POST['time']);
			$title = mysqli_real_escape_string($con,$_POST['title']);
			$desc = mysqli_real_escape_string($con,$_POST['desc']);
			$sid = (int) $_POST['sid'];
			
			// only add if valid
			if(strlen($time) > 3 && strlen($time) < 6 && strlen($title) > 0 && strlen($title) < 32 && strlen($desc) < 255 && $sid < 65355 ) {
				$sql = "UPDATE schedule SET `time`='".$time."', `title`='".$title."', `description`='".$desc."' WHERE id=".$sid;
					
				$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 

				$success = 1;
				
			}
		}
		else if(strpos($_POST['form_id'],'schedule_delete') === 0 && in_array($user,$admin)) {
			// del chat form
			
			$sid = (int)$_POST['sid'];
			
			$sql = "DELETE FROM schedule WHERE id = ".$sid;
			
			$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 
			
		}
}

$sql="SELECT * FROM schedule ORDER BY time";

$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 

$schedule = [];
while($row = mysqli_fetch_assoc($query)) {
	$schedule[] = $row;
}

$data = array(
	'schedule' => $schedule,
);

echo json_encode($data);
