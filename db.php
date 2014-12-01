<?php

require_once('config.php');

function getNewList() {
	
	global $con;
	
	$lista = [];
	$sql="SELECT sid, sessions.uid AS uid, username, country, img, email, UNIX_TIMESTAMP(start) AS start, walking, sitting, UNIX_TIMESTAMP(end) AS end, type, (SELECT COUNT(*) FROM anumodana WHERE sessions.sid=anumodana.sid) AS anumodana FROM sessions, users WHERE sessions.end > '".gmdate('Y-m-d H:i:s',strtotime('1 hour ago'))."' AND users.uid=sessions.uid ORDER BY start DESC;";
	$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 
	while($row = mysqli_fetch_assoc($query)) {
		$email = $row['email'];
		
		if($row['img'] && $row['img'] != '') {
			$row['avatar'] = $row['img'];
		}
		else if($email && $email != "") {
			$hash = md5( strtolower( trim( $email ) ) );
			$row['avatar'] = 'http://www.gravatar.com/avatar/'.$hash.'?d=wavatar&s=140';
		}
		else {
			$row['avatar'] = 'http://www.gravatar.com/avatar/00000000000000000000000000000000?d=mm&f=y&s=140';
		}

		unset($row['email']);
		unset($row['img']);
		
		$lista[] = $row;
	}
	
	return $lista;
}
function getNewChats($last = 0) {

	global $con;
	
	$chata = [];
	
	$sql="(SELECT cid, chats.uid AS uid, username, country, UNIX_TIMESTAMP(time) as time, message FROM chats, users WHERE chats.uid=users.uid".($last != 0?" AND time > '".gmdate('Y-m-d H:i:s',$last)."'":"")." ORDER BY time DESC LIMIT 50) ORDER BY time ASC;";
	
	$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 
	
	while($row = mysqli_fetch_assoc($query)) {
		$chata[] = $row;
	}
	return $chata;
}

function getHoursList() {

	global $con;
	
	$hours = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
	$sql="SELECT UNIX_TIMESTAMP(start) AS start, walking, sitting, UNIX_TIMESTAMP(end) AS end FROM sessions WHERE sessions.end > '".gmdate('Y-m-d H:i:s',strtotime('1 week ago'))."'";
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
				$hours[$ho++] += 60;
			}
			$time = (int)date('i',$row['end']);
			$hours[$he] += $time;
		}
	}
	return $hours;
}

$alert = '';

$user = '';

if(isset($_POST['username']) && !isset($_SESSION['username'])) // claiming to be logged in, not verified
	if(!loggedIn()) {
		$data = array(
			'success' => -1,
			'error' => "Login error: ".$_SESSION['error'],
		);
		die(json_encode($data));
	}

if(isset($_SESSION['username']))
	$user = preg_replace('/[^-0-9A-Za-z _]/','',$_SESSION['username']);

$loginToken = @$_SESSION['login_token'];

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
	error_log('new list '.($user!=''?$user:'').' '.$_SERVER['REMOTE_ADDR']);
	$newList = true;
	$lista = getNewList();
	$total_hours = getHoursList();
}

$chata = [];

$newChat = true;
$chata = getNewChats(isset($_POST['last_chat'])?$_POST['last_chat']:0);

$success = 0;

// deal with members

if(isset($_POST['form_id']) && $_POST['form_id'] != "") {

	if(loggedIn()) {
		$user = $_SESSION['username'];
		error_log('submitting form_id: '.$_POST['form_id'].' user: '.$user);
		
		if($_POST['form_id'] == 'cancelform') {

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
				$chata = getNewChats(isset($_POST['last_chat'])?$_POST['last_chat']:0);

				$success = 1;
				file_put_contents('chatv',++$chatVersion);
			}
		}
		else if($_POST['form_id'] == 'timeform') {
			// time form

			$start = time();
			$walking = $_POST['walking'];
			$sitting = $_POST['sitting'];
			
			// only add member if valid
			if(strlen($user) > 0 && strlen($user) < 20 && preg_match('/[A-Za-z]/',$user) && !preg_match('/[^-0-9A-Za-z _]/',$user) && !preg_match('/[^0-9]/',$walking) && !preg_match('/[^0-9]/',$sitting) && $walking <= 60 && $sitting <= 60 && $walking >= 0 && $sitting >= 0) {
				if(empty($lista))
		                        $lista = getNewList();
				
				// check for same user
				$duplicate = false;
				foreach($lista as $idx => $val) {
					if($val['username'] == $user && $val['end'] > time()) { // currently meditating, replace
						$sql = "UPDATE sessions SET `start`='".gmdate('Y-m-d H:i:s', $start)."', `walking`=".$walking.", `sitting`=".$sitting.", `end`='".gmdate('Y-m-d H:i:s', $start+($walking*60)+($sitting*60))."' WHERE sid = '".$val['sid']."'"; 
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
		else if($_POST['form_id'] == 'change_type') {
			$type = mysqli_real_escape_string($con,$_POST['type']);
			if(!preg_match('/[^-0-9A-Za-z_]/',$type)) {
				$sql = "UPDATE sessions SET `type`='".$type."' WHERE uid=(SELECT uid FROM users WHERE username='".$user."') AND end < NOW() AND end > '".gmdate('Y-m-d H:i:s',strtotime('1 hour ago'))."'";
				$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con));
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
			
			$sql = "DELETE FROM chats WHERE cid = ".$cid;
			
			$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 
			
			$newChat = true;
			$chata = getNewChats(isset($_POST['last_chat'])?$_POST['last_chat']:0);
			$success = 1;
			file_put_contents('chatv',++$chatVersion);
		}
		else if(strpos($_POST['form_id'],'anumed_') === 0) {
			// anumodana chat form
			
			$sid = (int)substr($_POST['form_id'],7);
			
			error_log($sid);
			
			$sql = "INSERT INTO anumodana (sid, uid) VALUES(".$sid.", (SELECT uid FROM users WHERE username = '".mysqli_real_escape_string($con,$user)."'))";
			
			$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 
			
			$newList = true;
			$lista = getNewList();
			$total_hours = getHoursList();

			$success = 1;

			file_put_contents('listv',++$listVersion);
		}
	}
	else {
		$data = array(
			'success' => -1,
		);
		die(json_encode($data));
	}
}

$listn = '';

$chatcount = 0;
$chats = [];

foreach($lista as $idx => $member) {
	
	$mUser = $member['username'];
	$mAvatar = $member['avatar'];
	$mStart = $member['start'];
	$mEnd = $member['end'];
	$mWalk = $member['walking'];
	$mSit = $member['sitting'];
	$mCountry = $member['country'];
	$mType = @$member['type'];
	$mSid = @$member['sid'];
	$mAnumodana = @$member['anumodana'];

	if($cancelmed && $mUser == $user) {
		continue;
	}
		
	$list[] = array(
		'username' => $mUser,
		'avatar' => $mAvatar,
		'start' => $mStart,
		'end' => $mEnd,
		'walking' => $mWalk,
		'sitting' => $mSit,
		'country' => $mCountry,
		'type' => $mType,
		'sid' => $mSid,
		'anumodana' => $mAnumodana,
		'can_edit' => $mUser == $user || in_array($user,$admin) ? 'true':'false',
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
	$achat['can_edit'] = $achat['username'] == $user || in_array($user,$admin) ? 'true':'false';

	$chatj[] = $achat;
}

// check and add/remove loggedin

$loggeds = file_get_contents('loggedin');

$loggeda = explode("\n",$loggeds);

$dataLogged = [];
$dataLoggedOld = []; // legacy

$newloggeda = [];
$now = time();
foreach($loggeda as $alog) {
	$aloga = explode('^',$alog);
	if(strlen($user) > 0 && $aloga[0] == $user) {
		continue;
	}
	if($now - $aloga[1] > 60) // greater than one minute
		continue;
	$newloggeda[$aloga[0]] = $aloga[1].(isset($aloga[2])?'^'.$aloga[2]:'');
}
if(strlen($user) > 0) {
	$newloggeda[$user] = $now.(isset($_POST['source'])?'^'.$_POST['source']:'');
	//error_log($user." ".$_SERVER['REMOTE_ADDR']);
}

$newloggedf = [];
foreach($newloggeda as $key => $val) {
	$newloggedf[] = $key.'^'.$val;
	$dataLoggedOld[] = $key;
	$dataLogged[] = array(
		'username' => $key,
		'source' => explode('^',$val)[1],
	);
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
$live_url = 'http://sirimangalo.org:8000/live';
$live_headers = @get_headers($live_url);
$live = strpos($live_headers[0], ' 404 ') == false;

$data = array(
	'list' => $newList ? $list:'-1',
	'chat' => $newChat ? $chatj:'-1',
	'commit' => $commita,
	'hours' => $total_hours,
	'logged' => $dataLoggedOld,
	'loggedin' => $dataLogged,
	'success' => $success,
	'list_version' => $listVersion,
	'chat_version' => $chatVersion,
	'login_token' => $loginToken,
	'alert' => $alert,
	'refresh' => $refresh,
	'live' => !$live ? 'false' : $live_url,
	'admin' => in_array($user,$admin)?'true':'false',
);


$json = json_encode($data);

echo $json;

