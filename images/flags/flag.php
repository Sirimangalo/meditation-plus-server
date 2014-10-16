<?php
 /**
 * handle ajax loading flags to override cache
 *
 * @package WorldFlags
 */

// ---------------------------------------- includes
require_once( '../../includes/config.php' );
require_once( '../../includes/functions.php' );
// ----------------------------------------

	Header( "content-type: text/plain; charset=utf-8" );
	Header('Cache-Control: no-cache');
	Header('Pragma: no-cache');

	if ( isset( $_POST['size'] ) && ( $_POST['size'] != '' ) ) {
		$cc = world_flags_ip2country( $_SERVER['REMOTE_ADDR'] );
		$code = $cc['code'];
		$country = $cc['country'];
		$size = intval( $_POST['size'] );
		$flag_src = world_flags_get_flag( $cc['code'], $size );
		
		$flag = array( 'country'=>$code, 'country'=>$country, 'size'=>$size, 'src'=>$flag_src );
		
		echo json_encode($flag);
	} else {
		wp_die( __( 'Invalid Country Code', 'world_flags' ) );
	}
	
?>