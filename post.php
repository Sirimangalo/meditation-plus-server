<?php

if($_POST['submit'] == 'Login') {
	require('config.php');
	error_log('login');

	$data = [];

	if(loggedIn()){ // login token valid
			$data['login_token'] = $_SESSION['login_token'];
			$_SESSION['error'] = ""; 
	}
	else if (isset($_POST['username']) && isset($_POST['password'])) { 
		// We have both variables. Pass them to our validation function 
		if (!validateUser($_POST['username'], $_POST['password'])) { 
			error_log('error logging in '.$_POST['username']);
			$data['error'] = "Login error: ".$_SESSION['error'];
		} 
		else {
			$data['login_token'] = $_SESSION['login_token'];
			$_SESSION['error'] = ""; 
			error_log('logged in '.$_POST['username']);
		}
	}else { 
		$data['error'] = "Username and or Password was not supplied."; 
		error_log("Username and Password not found"); 
	}
	$json = json_encode($data);
	echo $json;

}
else if($_POST['submit'] == 'Register') {
	require('config.php');
	error_log('register');

	$data = [];

	// If the form was submitted lets try to create the account. 
	if (isset($_POST['username']) && isset($_POST['password'])) { 
		if (createAccount($_POST['username'], $_POST['password'])) { 
			if (!validateUser($_POST['username'], $_POST['password'])) { 
				unset($_GET['action']); 
				$data['error'] = "Login error: ".$_SESSION['error'];
			} 
			else {
				$data['login_token'] = $_SESSION['login_token'];
			}
		}else { 
			"Registration error: ".$_SESSION['error']; 
			unset($_GET['action']); 
		}         
	}else { 
		$_SESSION['error'] = "Username and or Password was not supplied."; 
		unset($_GET['action']); 
	} 
	$json = json_encode($data);
	echo $json;	
}
else if($_POST['submit'] == 'Refresh') {
	require('db.php');
}
else if($_POST['submit'] == 'Profile') {
	require_once('config.php');
	require('profiledb.php');
}

if(isset($con))
	mysqli_close($con);
