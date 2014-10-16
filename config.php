<?php 

session_start(); 
require('../meditation_config.php');

/*

Below is a sample of our ../meditation_config.php file
(we put it outside of our document root for security):

<?php
$username="<database_user>";
$password="<database_password>";
$database="<database_name>";
$host="localhost";

$admin = ["<name_of_admin_user>","<name_of_another_admin_user>"];

// random salts for password hash
 
define('SALT1', 'AS(YHF(*ghfAS*(-'); 
define('SALT2', '(@&FH_SAI(*&@$'); 

*/
 

$con = mysqli_connect($host,$username,$password, $database);

if (mysqli_connect_errno())
	die("Failed to connect to MySQL: " . mysqli_connect_error());

if($con == null)
	die("Failed to connect to MySQL: " . mysqli_connect_error());

// require the function file 
require_once('functions.php'); 
