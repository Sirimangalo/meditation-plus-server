<?php

require_once('config.php');

function getNewList() {
	
	global $con;
	
	$lista = [];
	$sql="SELECT sid, sessions.uid AS uid, username, country, UNIX_TIMESTAMP(start) AS start, walking, sitting, UNIX_TIMESTAMP(end) AS end FROM sessions, users WHERE sessions.end > '".gmdate('Y-m-d H:i:s')."' AND users.uid=sessions.uid;";
	$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 
	while($row = mysqli_fetch_assoc($query)) {
		$lista[] = $row;
	}
	
	return $lista;
}
function getNewChats() {

	global $con;
	
	$chata = [];
	$sql="SELECT cid, chats.uid AS uid, username, country, UNIX_TIMESTAMP(time) as time, message FROM chats, users WHERE chats.uid=users.uid;";
	$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 
	while($row = mysqli_fetch_assoc($query)) {
		$chata[] = $row;
	}
	return $chata;
}

function getHoursList() {

	global $con;
	
	$hours = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
	$sql="SELECT UNIX_TIMESTAMP(start) AS start, walking, sitting, UNIX_TIMESTAMP(end) AS end FROM sessions WHERE sessions.end > '".gmdate('Y-m-d H:i:s',strtotime('one month ago'))."'";
	$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 
	while($row = mysqli_fetch_assoc($query)) {
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
				$hours[$ho] += 60;
			}
			$time = (int)date('i',$row['end']);
			$hours[$he] += $time;
		}
	}
	return $hours;
}

$alert = '';

$user = '';

if(isset($_SESSION['username']))
	$user = preg_replace('/[^-0-9A-Za-z _]/','',$_SESSION['username']);

$chatlimit = 50;
$clearchat = false;
$cancelmed = false;

$list = [];
$chat = [];

$listVersion = (int)file_get_contents('listv');
$chatVersion = (int)file_get_contents('chatv');
$hoursVersion = (int)file_get_contents('hoursv');

if(!$listVersion)
	$listVersion = 1;
if(!$chatVersion)
	$chatVersion = 1;
if(!$hoursVersion)
	$hoursVersion = 1;

$lista = [];
$total_hours = -1;
$newList = false;

if(isset($_POST['list_version']) && (int)$_POST['list_version'] < $listVersion) {
	error_log('new list '.($user!=''?$user:$_SERVER['REMOTE_ADDR']));
	$newList = true;
	$lista = getNewList();
	$total_hours = getHoursList();
}

$chata = [];
$newChat = false;

if(isset($_POST['chat_version']) && (int)$_POST['chat_version'] < $chatVersion) {
	error_log('new chat '.($user!=''?$user:$_SERVER['REMOTE_ADDR']));
	$newChat = true;
	$chata = getNewChats();
}

$success = 0;

// deal with members

if(isset($_POST['form_id'])) {

	if(loggedIn()) {
		$user = $_SESSION['username'];
		error_log('submitting form_id: '.$_POST['form_id'].' user: '.$user);
		
		if($_POST['form_id'] == 'cancelform') {
			error_log('cancelform');

			$sql = "DELETE FROM sessions WHERE uid = (SELECT uid FROM users WHERE username = '".mysqli_real_escape_string($con,$user)."') AND end > '".gmdate('Y-m-d H:i:s')."'"; 
			
			$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 

			$success = 1;

			// update list
			$newList = true;
			$lista = getNewList();
			$total_hours = getHoursList();				
			file_put_contents('listv',++$listVersion);
		}
		else if($_POST['form_id'] == 'chatform') {
			error_log('chatform');
			$message = str_replace('^','',$_POST['message']);
			
			if(in_array($user,$admin) && $message == '/clear') {
				$clearchat = true;
				$success = 1;
				file_put_contents('chatv',++$chatVersion);
			}
			else if(strlen($user) > 0 && strlen($user) < 64 && strlen($message) > 0 && strlen($message) < 140) {
				$time = time();

				$sql = "INSERT INTO chats (`uid`, `time`, `message`) SELECT uid, '".gmdate('Y-m-d H:i:s', $time)."', '".mysqli_real_escape_string($con,htmlspecialchars($message))."' FROM users WHERE username = '".mysqli_real_escape_string($con,$user)."'"; 
				$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 

				$newChat = true;
				$chata = getNewChats();

				$success = 1;
				file_put_contents('chatv',++$chatVersion);
			}
		}
		else if($_POST['form_id'] == 'timeform') {
			error_log('timeform');
			// time form

			$start = time();
			$walking = $_POST['walking'];
			$sitting = $_POST['sitting'];
			
			// only add member if valid
			if(strlen($user) > 0 && strlen($user) < 20 && preg_match('/[A-Za-z]/',$user) && !preg_match('/[^-0-9A-Za-z _]/',$user) && !preg_match('/[^0-9]/',$walking) && !preg_match('/[^0-9]/',$sitting) && $walking < 60 && $sitting < 60 && $walking >= 0 && $sitting >= 0) {
				
				// check for same user
				$duplicate = false;
				foreach($lista as $idx => $val) {
					if($val['username'] == $user) { // currently meditating, replace
						$sql = "UPDATE sessions SET `start`=".gmdate('Y-m-d H:i:s', $start).", `walking`=".$walking.", `sitting`=".$sitting.", `end`=".gmdate('Y-m-d H:i:s', $start+($walking*60)+($sitting*60))."' WHERE sid = '".$val['sid']."'"; 
						$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 
						
						$duplicate = true;
						break;
					}
				}
				if(!$duplicate) {
					$sql = "INSERT INTO sessions (`uid`, `start`, `walking`, `sitting`, `end`) SELECT uid, '".gmdate('Y-m-d H:i:s', $start)."', ".$walking.", ".$sitting.", '".gmdate('Y-m-d H:i:s', $start+($walking*60)+($sitting*60))."' FROM users WHERE username = '".mysqli_real_escape_string($con,$user)."'"; 
					
					$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 
				}

				// update list
				$newList = true;
				$lista = getNewList();
				$total_hours = getHoursList();

				$success = 1;
				
				file_put_contents('listv',++$listVersion);
			}
		}
		else if(strpos($_POST['form_id'],'delchat_') === 0 && in_array($user,$admin)) {
			// del chat form
			
			$cid = (int)substr($_POST['form_id'],8);
			error_log('deleting chat: '+$cid);
			
			$sql = "DELETE FROM chats WHERE cid = ".$cid;
			
			$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 
			
			$newChat = true;
			$chata = getNewChats();
			$success = 1;
			file_put_contents('chatv',++$chatVersion);
		}
	}
	else {
		$success = -1; // not logged in, failed
	}
}

$listn = '';

$chatcount = 0;
$chats = [];

foreach($lista as $idx => $member) {
	
	$mUser = $member['username'];
	$mStart = $member['start'];
	$mWalk = $member['walking'];
	$mSit = $member['sitting'];
	$mCountry = $member['country'];

	if($cancelmed && $mUser == $user) {
		continue;
	}
		
	$list[] = array(
		'username' => $mUser,
		'start' => $mStart,
		'walking' => $mWalk,
		'sitting' => $mSit,
		'country' => $mCountry,
		'me' => strlen($user) > 0 && $mUser == $user ? 'true':'false',
	);
}


// check and remove old chats

$oldchat = (count($chata) - $chatlimit);

if($oldchat > 0)
	$chata = array_slice($chata,$oldchat);

$chatn = '';

$chatj = [];

foreach($chata as $achat) {
	if($clearchat)
		break;

	$achat['me'] = $achat['username'] == $user ? 'true':'false';

	$chatj[] = $achat;
}

// check and add/remove loggedin

$loggeds = file_get_contents('loggedin');

$loggeda = explode("\n",$loggeds);

$dataLogged = [];
$newloggeda = [];
$now = time();
foreach($loggeda as $alog) {
	$aloga = explode('^',$alog);
	if(count($aloga) != 2)
		continue;
	if(strlen($user) > 0 && $aloga[1] == $user) {
		continue;
	}
	if($now - $aloga[1] > 60) // greater than one minute
		continue;
	$newloggeda[$aloga[0]] = $aloga[1];
}
if(strlen($user) > 0)
		$newloggeda[$user] = $now;

$newloggedf = [];
foreach($newloggeda as $key => $val) {
	$newloggedf[] = $key.'^'.$val;
	$dataLogged[] = $key;
}
$newloggeds = implode("\n",$newloggedf);	

if($newloggeds != $loggeds)
	file_put_contents('loggedin',$newloggeds);

$refresh = 'false';

$commits = '';
$commita = -1;
if(isset($_POST['submit']) && $_POST['submit'] == 'Refresh' && isset($_POST['full_update']) && $_POST['full_update'] == 'true') { // coming from Android
	ob_start();
	
	include('commitdb.php');
	
	$commits = ob_get_contents();
	ob_end_clean();

	$commita = json_decode($commits);
}

$data = array(
	'list' => $newList ? $list:'-1',
	'chat' => $newChat ? $chatj:'-1',
	'commit' => $commita,
	'hours' => $total_hours,
	'logged' => $dataLogged,
	'success' => $success,
	'list_version' => $listVersion,
	'chat_version' => $chatVersion,
	'alert' => $alert,
	'refresh' => $refresh,
	'admin' => in_array($user,$admin)?'true':'false',
);
//error_log($listVersion.' '.$chatVersion);

/*
// reget list
$listfo = file_get_contents('meds');
// if list is different, overwrite
if($listn != $listfo) {
	error_log('med list changed');
	file_put_contents('meds',$listn);
}
*/

$json = json_encode($data);

echo $json;

