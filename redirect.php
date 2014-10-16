<?php

require('config.php');

// If the user is logging in or out 
// then lets execute the proper functions 
if (isset($_GET['action'])) { 
	error_log('get action');
	switch (strtolower($_GET['action'])) { 
		case 'login':
			if($_POST['submit'] == 'Login') {
				error_log('login');
				if (isset($_POST['username']) && isset($_POST['password'])) { 
					// We have both variables. Pass them to our validation function 
					if (!validateUser($_POST['username'], $_POST['password'])) { 
						// Well there was an error. Set the message and unset 
						// the action so the normal form appears. 
						$_SESSION['error'] = "Login error: ".$_SESSION['error']; 
						unset($_GET['action']);
					} 
					else
						$_SESSION['error'] = ""; 
				}else { 
					$_SESSION['error'] = "Username and Password are required to login."; 
					unset($_GET['action']); 
				}
			}
			else if($_POST['submit'] == 'Register') {
				error_log('register');
				// If the form was submitted lets try to create the account. 
				if (isset($_POST['username']) && isset($_POST['password'])) { 
					if (createAccount($_POST['username'], $_POST['password'])) { 
						if (!validateUser($_POST['username'], $_POST['password'])) { 
							// Well there was an error. Set the message and unset 
							// the action so the normal form appears. 
							$_SESSION['error'] = "Login error: ".$_SESSION['error']; 
							unset($_GET['action']); 
						} 
						else
							$_SESSION['error'] = ""; 
					}else { 
						$_SESSION['error'] = "Registration error: ".$_SESSION['error']; 
						// unset the action to display the registration form. 
						unset($_GET['action']); 
					}         
				}else { 
					$_SESSION['error'] = "Username and or Password was not supplied."; 
					unset($_GET['action']); 
				} 
			}
		break; 
		case 'logout': 
			error_log('logout');
			// If they are logged in log them out. 
			// If they are not logged in, well nothing needs to be done. 
			if (loggedIn()) { 
				logoutUser(); 
			}else { 
				// unset the action to display the login form. 
				unset($_GET['action']); 
			} 
			$_SESSION['error'] = ""; 
		break; 
	} 
} 
mysqli_close($con);
header('location: /');
exit();
