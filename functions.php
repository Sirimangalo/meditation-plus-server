<?php 
/***************************** 
	File: includes/functions.php 
	Written by: Frost of Slunked.com 
	Tutorial: User Registration and Login System 
******************************/ 
 
$NUM_TOKENS = 10;

/*********** 
	bool createAccount (string $pUsername, string $pPassword) 
		Attempt to create an account for the passed in  
		username and password. 
************/ 
function createAccount($pUsername, $pPassword) { 
	
	global $con;
	
	// First check we have data passed in. 
	if (!empty($pUsername) && !empty($pPassword)) { 
		$uLen = strlen($pUsername); 
		$pLen = strlen($pPassword); 
		 
		// escape the $pUsername to avoid SQL Injections 
		$eUsername = mysqli_real_escape_string($con, $pUsername); 
		$sql = "SELECT username FROM users WHERE username = '" . $eUsername . "' LIMIT 1"; 
 
		// Note the use of trigger_error instead of or die. 
		$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 
 
		// Error checks (Should be explained with the error) 
		if (preg_match("/[^-0-9A-Za-z _]/",$pUsername) > 0) { 
			$_SESSION['error'] = "Username may only contain alpha-numberical characters"; 
		}
		else if ($uLen <= 3 || $uLen >= 21) { 
			$_SESSION['error'] = "Username must be between 4 and 20 characters."; 
		}
		else if ($pLen < 6) { 
			$_SESSION['error'] = "Password must be longer then 5 characters."; 
		}
		else if (mysqli_num_rows($query) == 1) { 
			$_SESSION['error'] = "Username already exists."; 
		}
		else { 
			// All errors passed lets 
			// Create our insert SQL by hashing the password and using the escaped Username. 
			$sql = "INSERT INTO users (`username`, `password`) VALUES ('" . $eUsername . "', '" . hashPassword($pPassword, SALT1, SALT2) . "');"; 
			 
			$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 
			 
			if ($query) { 
				return true; 
			}   
		} 
	} 
	 
	return false; 
} 
 
/*********** 
	string hashPassword (string $pPassword, string $pSalt1, string $pSalt2) 
		This will create a SHA1 hash of the password 
		using 2 salts that the user specifies. 
************/ 
function hashPassword($pPassword, $pSalt1="2345#$%@3e", $pSalt2="taesa%#@2%^#") { 
	return sha1(md5($pSalt2 . $pPassword . $pSalt1)); 
} 
 
/*********** 
	bool loggedIn 
		verifies that session data is in tack 
		and the user is valid for this session. 
************/ 
function loggedIn() { 

	// check both loggedin and username to verify user. 
	if (isset($_SESSION['loggedin']) && isset($_SESSION['username'])) {
		error_log('in session');
		return true; 
	}

	// check for login token when not already logged in, validate token

	if(isset($_COOKIE['login-token'])) {
		error_log('checking token: '.$_COOKIE['login-token']);
		if(validateToken($_COOKIE['login-user'],$_COOKIE['login-token'])) {
			error_log('token good');
			return true;
		}
		else { // unset invalid cookie
			error_log('token bad');
			unset($_COOKIE['login-token']);
			setcookie('login-token', '', time() - 3600);
		}
			
	}
	if(isset($_POST['login_token'])) {
		error_log('checking token: '.$_POST['login_token']);
		if(validateToken($_POST['username'],$_POST['login_token'])) {
			error_log('token good');
			return true;
		}
		else { // unset invalid cookie
			error_log('token bad');
		}
			
	}

	return false; 
} 
 
/*********** 
	bool logoutUser  
		Log out a user by unsetting the session variable. 
************/ 
function logoutUser() { 
	// using unset will remove the variable 
	// and thus logging off the user. 
	unset($_SESSION['username']); 
	unset($_SESSION['username']); 
	unset($_SESSION['loggedin']);
	unset($_COOKIE['login-token']);
	setcookie('login-token', '', time() - 3600);
	return true; 
} 
 
/*********** 
	bool validateUser 
		Attempt to verify that a username / password 
		combination are valid. If they are it will set 
		cookies and session data then return true.  
		If they are not valid it simply returns false.  
************/ 
function validateUser($pUsername, $pPassword) { 

	global $con, $NUM_TOKENS;

	// See if the username and password are valid. 
	$sql = "SELECT username, uid FROM users WHERE username = '" . mysqli_real_escape_string($con, $pUsername) . "' AND password = '" . hashPassword($pPassword, SALT1, SALT2) . "' LIMIT 1"; 
	$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 
	
	// If one row was returned, the user was logged in! 
	if (mysqli_num_rows($query) == 1) {
		$row = mysqli_fetch_assoc($query); 
		$_SESSION['uid'] = $row['uid']; 
		$_SESSION['username'] = $row['username']; 
		$_SESSION['loggedin'] = true; 

		$tokenstring = '';

		// generate new token

		$loginToken = generateRandomString();
		$_SESSION['login_token'] = $loginToken; 

		// get existing tokens

		$sql = "SELECT token FROM logins WHERE uid = '" . $row['uid']."';"; 
		$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 

		if (mysqli_num_rows($query) == 1) { 

			$row = mysqli_fetch_array($query);
			$tokens = explode(',',$row['token']);
			
			// reuse old token
			
			if(isset($_COOKIE['login-token']) && isset($_COOKIE['login-user']) && $_COOKIE['login-user'] == $pUsername && in_array($_COOKIE['login-token'],$tokens)) {
				error_log('reusing old token');
				return true; 
			}
				
			// limit tokens to NUM_TOKENS
			
			$tl = count($tokens);
			
			if($tl >= $NUM_TOKENS)
				$tokens = array_slice($tokens,$tl-$NUM_TOKENS+1,$NUM_TOKENS-1); // leave NUM_TOKENS -1 
				
			$tokenstring = implode(',',$tokens).','.$loginToken;
			$sql = "UPDATE logins SET token='" . $tokenstring . "' WHERE uid=".$row['uid'].";"; 
		}
		else { 
			$tokenstring = $loginToken;
			$sql = "INSERT INTO logins (`token`) VALUES ('" . mysqli_real_escape_string($con,$pUsername) . "', '" . $loginToken . "');"; 
		}
		
		// save tokens
		
		$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 
		setcookie('login-token',$loginToken,time()+60*60*24*365*10);
		setcookie('login-user',$pUsername,time()+60*60*24*365*10);
		
		return true; 
	}
	else {
		$_SESSION['error'] = "Invalid username or password"; 
	} 
	 
	 
	return false; 
} 
 
/*********** 
	bool validateToken 
		Attempt to verify that a username / token 
		combination are valid. If they are it will set 
		cookies and session data then return true.  
		If they are not valid it simply returns false.  
************/ 
function validateToken($pUsername, $pToken) {

	global $con;

	if(strlen($pToken) != 128)
		return false;

	error_log('token right size');

	// See if the username and token are valid. 
	$sql = "SELECT users.username, logins.uid FROM logins,users WHERE logins.uid=users.uid AND users.username = '" . mysqli_real_escape_string($con,$pUsername) . "' AND token LIKE '%" . $pToken . "%'"; 
	$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 
	 
	// If one row was returned, the user was logged in! 
	if (mysqli_num_rows($query) == 1) { 
		$row = mysqli_fetch_assoc($query); 
		$_SESSION['username'] = $row['username']; 
		$_SESSION['uid'] = $row['uid']; 
		$_SESSION['loggedin'] = true; 
		$_SESSION['login_token'] = $pToken;
		return true; 
	} 
	 
	 
	return false; 
} 

function generateRandomString($length = 128) {
		$characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
		$randomString = '';
		for ($i = 0; $i < $length; $i++) {
				$randomString .= $characters[rand(0, strlen($characters) - 1)];
		}
		return $randomString;
}
