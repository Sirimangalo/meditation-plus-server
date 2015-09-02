<?php

require_once('config.php');

//quote of the day

date_default_timezone_set('America/Toronto');

$doy = date('z')+1;

$sql="SELECT * FROM quotes WHERE id=".$doy;
$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 

$quote = mysqli_fetch_assoc($query);

$data = array(
	'quote' => $quote['quote'],
	'cite' => $quote['cite']
);

echo json_encode($data);
