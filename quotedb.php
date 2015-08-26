<?php

require_once('config.php');

//quote of the day

date_default_timezone_set('America/Toronto');

$doy = date('z')+1;

$sql="SELECT * FROM quotes WHERE id=".$doy;
$query = mysqli_query($con, $sql) or trigger_error("Query Failed: " . mysqli_error($con)); 

$quote = mysqli_fetch_assoc($query);

$quoteString = '<div id="quote-quote">'.$quote['quote'].'</div>'.'<div id="quote-cite">-- <a href="'.$quote['link'].'" target="_blank">'.$quote['cite'].'</a> (<a href="http://www.buddhistelibrary.org/library/download.php?aipath=111">source</a>)</div>';

