<?php

require_once('config.php');

$sError = ""; 
if (isset($_SESSION['error']) && strlen($_SESSION['error']) > 0) { 
	$sError = '<span id="error">' . $_SESSION['error'] . '</span><br />';
	$_SESSION['error'] = '';
} 
loggedIn();

mysqli_close($con);

$links = [];

$links[] = array(
	'link' => '/index.php',
	'title' => 'Home'
	);

$links[] = array(
	'link' => '/commit.php',
	'title' => 'Commit'
	);
$links[] = array(
	'link' => '/profile.php',
	'title' => 'Profile'
	);

$header_bar = '<div id="header-bar">
	<div id="header-user">
';

if(isset($_SESSION['loggedin']) && $_SESSION['loggedin']) {
	$header_bar .= '		<span class="header-text"><a href="profile.php" id="header-username">'.$_SESSION['username'].'</a>&nbsp;(<a id="header-logout" href="redirect.php?action=logout">Logout</a>)</span>
';
}
else {
	$header_bar .= '		<div id="header-login"><form name="login" method="post" action="redirect.php?action=login"><span class="header-text">Username:</span> <input id="header-username" type="text" name="username" /> <span class="header-text">Password:</span> <input id="header-password" type="password" name="password" /> <input type="submit" name="submit" value="Login" /> <input type="submit" name="submit" value="Register" /></form><div class="header-error">'.$sError.'</div></div>
';
}

$header_bar .= '	</div>
	<div id="header-links">
';

foreach($links as $l) {
	if($_SERVER['PHP_SELF'] == $l['link']) {
		$header_bar .= '		<span class="header-link green">'.$l['title'].'</span>
';	
	}
	else {
		$header_bar .= '		<span class="header-link"><a href="'.$l['link'].'">'.$l['title'].'</a></span>
';
	}
}

$header_bar .= '		<span class="header-image"><a title="Get our Android app on Google Play" href="https://play.google.com/store/apps/details?id=org.sirimangalo.meditationplus" target="_blank"><img src="https://ssl.gstatic.com/android/market_images/web/play_logo.png" height="16px"></a></span>
';

$header_bar .= '	</div>
';

$header_bar .= '
</div>';
