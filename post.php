<?php

if($_POST['submit'] == 'Login') {
	require('config.php');
	error_log('login');
	
	if(loggedIn()){ // login token valid
			$data = array(
				'login_token' => $_SESSION['login_token'],
			);
			$json = json_encode($data);
			echo $json;
	}
	else if (isset($_POST['username']) && isset($_POST['password'])) { 
		// We have both variables. Pass them to our validation function 
		if (!validateUser($_POST['username'], $_POST['password'])) { 
			error_log('error logging in '.$_POST['username']);
		} 
		else {
			$data = array(
				'login_token' => $_SESSION['login_token'],
			);
			$json = json_encode($data);
			echo $json;
			error_log('logged in '.$_POST['username']);
		}
	}else { 
		error_log("Username and Password not found"); 
	}
}
else if($_POST['submit'] == 'Register') {
	require('config.php');
	error_log('register');
	// If the form was submitted lets try to create the account. 
	if (isset($_POST['username']) && isset($_POST['password'])) { 
		if (createAccount($_POST['username'], $_POST['password'])) { 
			if (!validateUser($_POST['username'], $_POST['password'])) { 
				unset($_GET['action']); 
			} 
			else {
				$data = array(
					'login_token' => $_SESSION['login_token'],
				);
				$json = json_encode($data);
				echo $json;
				$_SESSION['error'] = ""; 
			}
		}else { 
			unset($_GET['action']); 
		}         
	}else { 
		$_SESSION['error'] = "Username and or Password was not supplied."; 
		unset($_GET['action']); 
	} 
}
else if($_POST['submit'] == 'Refresh') {
	require('db.php');
}

if(isset($con))
	mysqli_close($con);
