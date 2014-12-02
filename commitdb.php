<?php

require_once('config.php');

function checkCommitment($c) {

	global $con;

	if($c['period'] == 'daily') {
		if($c['time'] == 'any') // any time
			$sql = "SELECT UNIX_TIMESTAMP(start) AS start, walking, sitting, UNIX_TIMESTAMP(end) AS end FROM sessions WHERE uid = ".$c['uid']." AND start > '".gmdate('Y-m-d H:i:s',strtotime('1 day ago'))."' AND end < '".gmdate('Y-m-d H:i:s')."'";
		else {
			$start = explode(':',$c['time']);
			
			$sh = (int) $start[0];
			$sm = (int) $start[1];
			
			$now = time();
			
			$nh = (int) date('H',$now);
			$nm = (int) date('i',$now);
			
			// if now after start, use today's start, else use yesterday's start
			if($sh < $nh || ($sh == $nh && $sm < $nm))
				$date = date_create('today midnight');
			else
				$date = date_create('yesterday midnight');
			
			$date = date_modify($date,'+'.$sh.' hours');
			$date = date_modify($date,'+'.$sm.' minutes');
			$date = date_modify($date,'-5 minutes'); // allow for starting before
			
			$sdate = date_format($date,'Y-m-d H:i:s');

			$edate = date_modify($date,'+1 hour');
			$edate = date_format($edate,'Y-m-d H:i:s');
			
			$sql = "SELECT UNIX_TIMESTAMP(start) AS start, walking, sitting, UNIX_TIMESTAMP(end) AS end FROM sessions WHERE uid = ".$c['uid']." AND start > '".$sdate."' AND start < '".$edate."'"; // starts after time and starts before one hour after time
		}
		$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 
		
		if(strpos($c['length'],':') === false) { // total length
			$total = 0;
			while ($row = mysqli_fetch_assoc($query)) {
				$total += $row['end'] - $row['start'];
			}
			if($total >= $c['length']*60)
				return 100;
			
			return round($total*100/($c['length']*60));
		}
		else { // specify number of minutes walking/sitting
			$tw = 0;
			$ts = 0;
			while ($row = mysqli_fetch_assoc($query)) {
				$tw += $row['walking'];
				$ts += $row['sitting'];
			}
			$length = explode(':',$c['length']);
			$walk = (int)$length[0];
			$sit = (int)$length[1];
			
			if($tw >= $walk && $ts >= $sit)
				return 100;
			
			$walkp = $walk > 0 ? ($tw*100/$walk) : 0;
			$sitp = $sit > 0 ? ($ts*100/$sit) : 0;
			
			return round(($walkp+$sitp)/2); // average percent between the two
		}
		
	}
	else if($c['period'] == 'weekly') {
		if($c['time'] == 'any') // per week total
			$sql = "SELECT UNIX_TIMESTAMP(start) AS start, walking, sitting, UNIX_TIMESTAMP(end) AS end FROM sessions WHERE uid = ".$c['uid']." AND start > '".gmdate('Y-m-d H:i:s',strtotime('1 week ago'))."' AND end < '".gmdate('Y-m-d H:i:s')."'";
		else {

			$dow = array('Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday');

			$day = $c['day'];
			
			$start = explode(':',$c['time']);
			
			$sh = (int) $start[0];
			$sm = (int) $start[1];

			$now = time();
			
			$nw = (int) date('w',$now);
			
			$today = false;
			
			// if is that day of the week, check time
			if($day == $nw) {
				$nh = (int) date('H',$now);
				$nm = (int) date('i',$now);
				
				// if now after start, use today's start
				if($sh < $nh || ($sh == $nh && $sm < $nm))
					$today = true;
			}
			if($today) {
				$date = date_create('today midnight');
			}
			else
				$date = date_create('last '.$dow[$day].' midnight');
			
			$date = date_modify($date,'+'.$sh.' hours');
			$date = date_modify($date,'+'.$sm.' minutes');
			$date = date_modify($date,'-5 minutes'); // allow for starting before
			
			$sdate = date_format($date,'Y-m-d H:i:s');

			$edate = date_modify($date,'+1 hour');
			$edate = date_format($edate,'Y-m-d H:i:s');
			
			$sql = "SELECT UNIX_TIMESTAMP(start) AS start, walking, sitting, UNIX_TIMESTAMP(end) AS end FROM sessions WHERE uid = ".$c['uid']." AND start > '".$sdate."' AND start < '".$edate."'"; // starts after time and ends before now and starts before one hour after time
		}
		$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 
		
		if(strpos($c['length'],':') === false) { // total length
			$total = 0;
			while ($row = mysqli_fetch_assoc($query)) {
				$total += $row['end'] - $row['start'];
			}
			if($total >= $c['length']*60)
				return 100;
			
			return round($total*100/($c['length']*60));
		}
		else { // specify number of minutes walking/sitting
			$tw = 0;
			$ts = 0;
			while ($row = mysqli_fetch_assoc($query)) {
				$tw += $row['walking'];
				$ts += $row['sitting'];
			}
			$length = explode(':',$c['length']);
			$walk = (int)$length[0];
			$sit = (int)$length[1];
			
			if($tw >= $walk && $ts >= $sit)
				return 100;
			
			return round((($tw*100/$walk)+($ts*100/$sit))/2); // average percent between the two
		}
	}
	else if($c['period'] == 'monthly') {
		if($c['time'] == 'any') // per month total
			$sql = "SELECT UNIX_TIMESTAMP(start) AS start, walking, sitting, UNIX_TIMESTAMP(end) AS end FROM sessions WHERE uid = ".$c['uid']." AND start > '".gmdate('Y-m-d H:i:s',strtotime('1 month ago'))."' AND end < '".gmdate('Y-m-d H:i:s')."'";
		else {

			$monthNames = array("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December");

			$now = time();
			$dom = (int)date('d',$now);
			$mo = (int)date('m',$now);
			$ye = (int)date('Y',$now);
			$day = $c['day'];
			
			if($dom < $day)
				$date = date_create($ye.'/'.($mo-1).'/'.$day.' midnight');
			else
				$date = date_create($ye.'/'.$mo.'/'.$day.' midnight');

			//error_log('time: '.$day.' '.strtotime($ye.'/'.$mo.'/'.$day.' midnight'));

			$start = explode(':',$c['time']);
			$sh = (int) $start[0];
			$sm = (int) $start[1];
			$date = date_modify($date,'+'.$sh.' hours');
			$date = date_modify($date,'+'.$sm.' minutes');
			$date = date_modify($date,'-5 minutes'); // allow for starting before
			
			$sdate = date_format($date,'Y-m-d H:i:s');

			$edate = date_modify($date,'+1 hour');
			$edate = date_format($edate,'Y-m-d H:i:s');
			
			$sql = "SELECT UNIX_TIMESTAMP(start) AS start, walking, sitting, UNIX_TIMESTAMP(end) AS end FROM sessions WHERE uid = ".$c['uid']." AND start > '".$sdate."' AND start < '".$edate."'"; // starts after time and ends before now and starts before one hour after time
		}
		
		$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 
		
		if(strpos($c['length'],':') === false) { // total length
			$total = 0;
			while ($row = mysqli_fetch_assoc($query)) {
				$total += $row['end'] - $row['start'];
			}
			if($total >= $c['length']*60)
				return 100;
			
			return round($total*100/($c['length']*60));
		}
		else { // specify number of minutes walking/sitting
			$tw = 0;
			$ts = 0;
			while ($row = mysqli_fetch_assoc($query)) {
				$tw += $row['walking'];
				$ts += $row['sitting'];
			}
			$length = explode(':',$c['length']);
			$walk = (int)$length[0];
			$sit = (int)$length[1];
			
			if($tw >= $walk && $ts >= $sit)
				return 100;
			
			return round((($tw*100/$walk)+($ts*100/$sit))/2); // average percent between the two
		}
	}
	
	
	return -1;
}

if(isset($_POST['form_id'])) {
	if(loggedIn()) {
		
		error_log($_POST['form_id']);
		
		if($_POST['form_id'] == 'newcommit') {
			
			$edit = isset($_POST['edit-com']) && strlen($_POST['edit-com']) > 0;
			
			$title = mysqli_real_escape_string($con,$_POST['title']);
			$desc = mysqli_real_escape_string($con,$_POST['desc']);
			$creator = mysqli_real_escape_string($con,$_SESSION['username']);
			$period = mysqli_real_escape_string($con,$_POST['period']);

			$dow = $_POST['dow'];
			$dom = $_POST['dom'];
			$doy = $_POST['doy'];
			$type = $_POST['type'];
			
			$day = -1;
			
			if($type == 'repeat') {
				if($period == 'weekly')
						$day = $dow;
				if($period == 'monthly')
						$day = $dom;
				if($period == 'yearly')
						$day = $doy;
			}
			
			$specTime = isset($_POST['spec-time']) && $type == 'repeat';
			
			$hour = $_POST['hour'];
			$min = $_POST['min'];
			
			if($specTime) {
				$time = mysqli_real_escape_string($con,$hour.':'.$min);
			}
			else
				$time = 'any';

			$walking = $_POST['walking'];
			$sitting = $_POST['sitting'];
			$length = $_POST['length'];


			if($type == 'repeat')
				$length = mysqli_real_escape_string($con,$walking.':'.$sitting);
			else
				$length = mysqli_real_escape_string($con,$length);

			// checks
			
			if(
				strlen($title) == 0 || strlen($title) > 20 || 
				($type == 'repeat' && 
					(preg_match("/[^0-9]/",$walking) || preg_match("/[^0-9]/",$sitting) || strlen($walking) == 0 || strlen($walking) > 2 || strlen($sitting) == 0 || strlen($sitting) > 2 || 
						($period == 'monthly'  && (preg_match("/[^0-9]/",$dom) || strlen($dom) == 0 || strlen($dom) > 2)) || 
						($period == 'yearly' && (preg_match("/[^0-9]/",$doy) || strlen($doy) == 0 || strlen($doy) > 3))
					)
				) || 
				($specTime && 
					(preg_match("/[^0-9]/",$hour) || preg_match("/[^0-9]/",$min) || strlen($hour) == 0 || strlen($hour) > 2 || strlen($min) == 0 || strlen($min) > 2)
				)
			) {
				$_SESSION['error'] = 'invalid commitment data';
				
			}
			else {

				if($edit) {
					$sqla = "UPDATE commitments SET title='".$title."', description='".$desc."', period='".$period."', day=".(int)$day.", time='".$time."', length='".$length."' WHERE cid = ".(int)$_POST['edit-com'];
					$query = mysqli_query($con, $sqla) or trigger_error("Query Failed: " . mysqli_error($con)); 
				}
				else {
					$sqla = "INSERT INTO commitments (title, description, creatorid, period, day, time, length) SELECT '".$title."', '".$desc."', uid, '".$period."', ".(int)$day.", '".$time."', '".$length."' FROM users WHERE username = '".$creator."'";
					$query = mysqli_query($con, $sqla) or trigger_error("Query Failed: " . mysqli_error($con)); 
					
					$sql = "INSERT INTO user_commitments (cid,uid) SELECT ".mysqli_insert_id($con).", uid FROM users WHERE username = '".$creator."'";
					$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 
				}
			}
		}
		else if(strpos($_POST['form_id'],'commitform_') === 0) {
			$username = mysqli_real_escape_string($con,$_SESSION['username']);
			$cid = (int) substr($_POST['form_id'],11);
			
			$sql = "INSERT INTO user_commitments (cid,uid) SELECT ".$cid.", uid FROM users WHERE username = '".$username."';";
			
			//error_log($sql);
			
			$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 
		}
		else if(strpos($_POST['form_id'],'uncommitform_') === 0) {
			$username = mysqli_real_escape_string($con,$_SESSION['username']);
			$cid = (int) substr($_POST['form_id'],13);
			
			$sql = "DELETE FROM user_commitments WHERE cid = ".$cid." AND uid IN (SELECT uid FROM users WHERE username = '".$username."')";
			
			//error_log($sql);
			
			$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 
		}
		else if(strpos($_POST['form_id'],'delcommitform_') === 0) {
			$username = mysqli_real_escape_string($con,$_SESSION['username']);
			$cid = (int) substr($_POST['form_id'],14);
			
			$sql = "DELETE FROM commitments WHERE cid = ".$cid." AND creatorid IN (SELECT uid FROM users WHERE username = '".$username."');";
			
			//error_log($sql);
			
			$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 
		}
	}
}

$sql="SELECT commitments.cid AS cid, title, commitments.description AS description, creatorid, period, day, time, length, CASE WHEN `length` LIKE '[0-9]*' THEN 'total' ELSE 'repeat' END AS type, users.uid AS uid, users.username AS username, creators.username AS creator FROM commitments LEFT JOIN users AS creators ON creators.uid = commitments.creatorid LEFT JOIN user_commitments ON user_commitments.cid = commitments.cid LEFT JOIN users ON users.uid = user_commitments.uid ORDER BY type, period, time, day, title";

$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 

$commitments = [];

while($row = mysqli_fetch_assoc($query)) {
	if(!isset($commitments[$row['cid']]))
		$commitments[$row['cid']] = $row;

	if(@$row['username'] == "")
		$row['username'] = 'none';
	if(isset($row['uid']))
		$commitments[$row['cid']]['users'][$row['username']] = checkCommitment($row);
}

$comm = [];
foreach ($commitments as $i => $c) {
	$comm[] = $c;
}
	
$commit_data = array(
	'commitments' => $comm,
);

echo json_encode($commit_data);
