<?php
require('bar.php');

?><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml">
<head>
	<title>Meditation+</title>
	<meta http-equiv="content-type" content="text/html;charset=utf-8" />
	<meta name="generator" content="Geany 0.21" />
	<link rel="stylesheet" type="text/css" href="styles.css">
	<link rel="image_src" href="http://static.sirimangalo.org/images/dhammawheelcommunity_t.png" />
	<link rel="Shortcut Icon" type="image/x-icon" href="http://www.sirimangalo.org/favicon.ico" />
	<script src="//ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js"></script>
	<script src="smilies.js"></script>
	<script src="tz.js"></script>
	<script src="countries.js"></script>
	<script src="//ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js"></script>
	<script type="text/javascript" src="//s7.addthis.com/js/300/addthis_widget.js#pubid=ra-4e4e0d1400cea51f" async></script>
	<script>

<?php
	
	echo '
		var G_static = '.(isset($_GET['static'])?'true':'false')+';';
		
	if(isset($_SESSION['loggedin']) && $_SESSION['loggedin']) {
		echo '
		var logged_user = \''.$_SESSION['username'].'\';';
	}
	else
		echo '
		var logged_user = \'\';';
?>
	</script>
	<script src="index.js?ver=6"></script>
</head>

<body onload="loaded()">
<?php echo $header_bar; ?>
	<div id="content">
		<div id="header">
			<div class="heading">Welcome&nbsp;to&nbsp;our online&nbsp;meditation&nbsp;page!</div>
			<div class="p">  The meditation we practice is based on the teachings found in <a href="http://htm.sirimangalo.org/">this booklet</a>.</div>
			<div class="p">Please let us know you are here by submitting your intended time spent walking and sitting.</div>
			<div class="p">We normally do walking first, then sitting.</div>
		</div>
		<table width="100%">
			<tr>
				<td align="center">
					<div id="live"></div>
				</td>
			</tr>
			<tr>
				<td align="center">
					<div id="log-frame">
						<div id="hours-header">Total minutes of meditation per hour (UTC) of day (past month):</div>
						<div id="hours-container"></div>
					</div>
				</td>
			</tr>
			<tr>
				<td align="center">
					<div id="chatframe">
						<div id="chatheader">Meditator Shoutbox</div>
						<div id="chats">
						</div>
						<div id="chat-form-frame">
							<pform id="chatform">
								<input name="message" id="message"><input id="chat-button" type="button" onclick="submitData(true,'chatform')" value="Send"><input id="smilie-button" type="button" onclick="openSmilies()" value=":)">
							</pform>
							<div id="smilie-box"></div>
						</div>
					</div>
				</td>
			</tr>
			<tr>
				<td>
					<div id="logged-users-shell">
					</div>
				</td>
			</tr>
			<tr>
				<td align="center">
					<h2>Meditator List</h2>
					<div id="list"></div>
					<div id="timeform-frame">
						<pform id="timeform">
							<table id="newt">
								<tr>
									<td class="thead" colspan="4">Submit new meditator information:</td>
								</tr>
								<tr>
									<td>Walking (min):</td>
									<td>Sitting (min):</td>
								</tr>
								<tr>
									<td><input name="walking" id="walking"></td>
									<td><input name="sitting" id="sitting"></td>
									<td>
										<input type="button" value="Start" onclick="submitData(true,'timeform')"> <input type="button" value="Cancel" onclick="submitData(true,'cancelform')">
									</td>
								</tr>
							</table>
						</pform>
					</div>
					<div id="audio-shell">
						<span id="timer-label">Timer Sound:</span> 
						<select id="audio-select" onchange="loadAudio(true)">
							<option value="none">None</option>
							<option value="bell">Burmese Bells</option>
							<option value="bell1">Tibetan Bell</option>
							<option value="birds">Bird Song</option>
							<option value="bowl">Singing Bowl</option>
							<option value="gong">Zen Gong</option>
						</select>
						<audio id="audio-bell" preload="none">
						  <source src="audio/bell.ogg" type="audio/ogg">
						  <source src="audio/bell.mp3" type="audio/mpeg">
						</audio>
						<audio id="audio-bell1" preload="none">
						  <source src="audio/bell1.ogg" type="audio/ogg">
						  <source src="audio/bell1.mp3" type="audio/mpeg">
						</audio>
						<audio id="audio-birds" preload="none">
						  <source src="audio/birds.ogg" type="audio/ogg">
						  <source src="audio/birds.mp3" type="audio/mpeg">
						</audio>
						<audio id="audio-bowl" preload="none">
						  <source src="audio/bowl.ogg" type="audio/ogg">
						  <source src="audio/bowl.mp3" type="audio/mpeg">
						</audio>
						<audio id="audio-gong" preload="none">
						  <source src="audio/gong.ogg" type="audio/ogg">
						  <source src="audio/gong.mp3" type="audio/mpeg">
						</audio>
						<input type="button" value="test" onclick="ringTimer()"> 
						<input type="button" value="stop" onclick="stopTimer()">
					</div>
				</td>
			</tr>
		</table>
		<div id="addthis-shell">
			<div id="share-title">Share&nbsp;this&nbsp;page&nbsp;and&nbsp;help our&nbsp;community&nbsp;grow:</div>
			<div class="addthis_sharing_toolbox"></div>
		</div>
	</div>
</body>
</html>
