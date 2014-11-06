<?php
require('bar.php');

?><!--
   test.php
   
   Copyright 2014 Yuttadhammo Bhikkhu <noah@XZR-581>
   
   This program is free software; you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation; either version 2 of the License, or
   (at your option) any later version.
   
   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.
   
   You should have received a copy of the GNU General Public License
   along with this program; if not, write to the Free Software
   Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston,
   MA 02110-1301, USA.
   
   
-->

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"
	"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">

<head>
	<title>Meditation+</title>
	<meta http-equiv="content-type" content="text/html;charset=utf-8" />
	<meta name="generator" content="Geany 0.21" />
	<link rel="stylesheet" type="text/css" href="styles.css?version=2">
	<link rel="image_src" href="http://static.sirimangalo.org/images/dhammawheelcommunity_t.png" />
	<link rel="Shortcut Icon" type="image/x-icon" href="http://www.sirimangalo.org/favicon.ico" />
	<script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/1.5.1/jquery.min.js"></script>
	<script>
	function transform() {
		$('#med-container').hide();
		var no = $('.rot').length;
		if(no == 0)
			return;
			
		var baseSize = 100/(no^2);
		var eachSize = 1.5*baseSize/no;
		$('#med-container').css({
			'padding':eachSize*0.7+'em',
			'width':baseSize+'em',
			'height':baseSize+'em',
		});
		$('.rot').each(
			function(i, el) {
				el.style.width = eachSize+'em';
				el.style.height = eachSize+'em';
				el.style.margin = (-eachSize/2)+'em';
				var angle = 360/no*(i+1);
				el.style.transform = 'rotate('+angle+'deg) translate('+(baseSize/2)+'em) rotate(-'+angle+'deg)';
			}
		);
		$('#med-container').fadeIn();
	}	
	</script>

</head>

<body onload="transform()">
<?php echo $header_bar; ?>
	<div id="med-container">
		<div class="rot"><img class="avatar" src="http://www.gravatar.com/avatar/717f508b3910467b3248d13310caef18?d=mm"><div class="med-info"><img src="http://meditation.sirimangalo.org/images/flags/16/ca.png">&nbsp;<b>Yuttadhammo</b><br/>15/30<br/>30/30</div></div>
		<div class="rot"><img class="avatar" src="http://www.gravatar.com/avatar/717f508b3910467b3248d13310caef18?d=mm"><div class="med-info"><img src="http://meditation.sirimangalo.org/images/flags/16/ca.png">&nbsp;<b>Yuttadhammo</b><br/>15/30<br/>30/30</div></div>
		<div class="rot"><img class="avatar" src="http://www.gravatar.com/avatar/717f508b3910467b3248d13310caef18?d=mm"><div class="med-info"><img src="http://meditation.sirimangalo.org/images/flags/16/ca.png">&nbsp;<b>Yuttadhammo</b><br/>15/30<br/>30/30</div></div>
	</div>
</body>

</html>
