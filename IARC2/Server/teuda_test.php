<?php
include ("db_web.inc");
include ('error.inc');
ini_set ( 'display_errors', 1 );
error_reporting ( E_ALL );

$isDebug = false;
?>
<!DOCTYPE html>
<html dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link href="favicon.ico" rel="shortcut icon">
<link rel="stylesheet" href="css/style.css">
<title>דיפלומה</title>
</head>

<body>
<?php
// get the POST variable
// $info = $_POST["info"];

// extract all the properties of the registration request
// if(isset($info['callsign'])){$callsign = $info['callsign'];}else{$callsign = '';}
// if(isset($info['year'])){$year = $info['year'];}else{$year = '';}

if (! isset ( $_POST ['submit'] )) {
	?>
<article class="article clearfix">
		<div class="col_25">
			<fieldset>
				<div style="text-align: center">
					<p>Enter your callsign</p>
					<form method="post" action="<?php echo $_SERVER['PHP_SELF']; ?>">
						Call: <input type="text" name="callsign"
							style="text-transform: uppercase" autofocus required> <br> Year:
						<input type="text" name="year" required> <br> Name: <input
							type="text" name="name" required> <br> <input type="submit"
							name="submit" value="Search"> <br>
					</form>
				</div>
			</fieldset>
		</div>
	</article>
<?
}
if (isset ( $_POST ['submit'] )) {
	if (isset ( $_POST ['callsign'] )) {
		$callsign = trim ( $_POST ['callsign'] );
	} else {
		$callsign = '';
	}
	if (isset ( $_POST ['year'] )) {
		$year = trim ( $_POST ['year'] );
	} else {
		$year = '';
	}
	if (isset ( $_POST ['name'] )) {
		$name = trim ( $_POST ['name'] );
	} else {
		$name = '';
	}
	// echo 'Call: '. $callsign . ' Year: ' . $year;
	
	$sql = "select * from hlwtest where `call` = '$callsign' and `year`='$year'";
	$result = mysqli_query($GLOBALS["___mysqli_ston"],  $sql ) or die ( mysqli_error($GLOBALS["___mysqli_ston"]) );
	if (mysqli_num_rows( $result ) > 0) {
		while ( $row = mysqli_fetch_array( $result,  MYSQLI_ASSOC ) ) {
			$score = $row ['score'];
			$callsign = $row ['call'];
			$dxcc = $row ['dxcc'];
			$category = $row ['category'];
			$continent = $row ['continent'];
		}
	} else {
		echo 'NOT FOUND for Call: ' . $callsign . ' Year: ' . $year;
		die ();
	}
	
	// check place
	if (strpos ( $callsign, '4X' ) !== false || strpos ( $callsign, '4Z' ) !== false) {
		$sql = "SELECT `call` from hlwtest WHERE `year`='$year' and category='$category' and dxcc = 'Israel' ORDER BY score DESC";
	} else {
		if ($category != 'SWL') {
			$sql = "SELECT `call` from hlwtest WHERE `year`='$year' and category='$category' and category!='SWL' and dxcc != 'Israel' ORDER BY score DESC";
		} else {
			$sql = "SELECT `call` from hlwtest WHERE `year`='$year' and category='$category' and dxcc != 'Israel' ORDER BY score DESC";
		}
	}
	$result = mysqli_query($GLOBALS["___mysqli_ston"],  $sql ) or die ( mysqli_error($GLOBALS["___mysqli_ston"]) );
	while ( $row = mysqli_fetch_array( $result,  MYSQLI_ASSOC ) ) {
		$resultSet [] = $row ['call'];
	}
	$place = array_search ( $callsign, $resultSet ) + 1;
	
	// check continental place
	if (strpos ( $callsign, '4X' ) !== false || strpos ( $callsign, '4Z' ) !== false) {
	} else {
		if ($category != 'SWL') {
			$sql = "SELECT `call` from hlwtest WHERE `year`='$year' AND continent='$continent' and category!='SWL' and dxcc != 'Israel' ORDER BY score DESC";
		} else {
			$sql = "SELECT `call` from hlwtest WHERE `year`='$year' AND continent='$continent' and category='SWL' and dxcc != 'Israel' ORDER BY score DESC";
		}
		$result = mysqli_query($GLOBALS["___mysqli_ston"],  $sql ) or die ( mysqli_error($GLOBALS["___mysqli_ston"]) );
		while ( $row = mysqli_fetch_array( $result,  MYSQLI_ASSOC ) ) {
			$resultSetCont [] = $row ['call'];
		}
		$placeCont = array_search ( $callsign, $resultSetCont ) + 1;
		// echo 'Place Cont: ' . $placeCont;
	}
	
	// check country place
	if (strpos ( $callsign, '4X' ) !== false || strpos ( $callsign, '4Z' ) !== false) {
	} else {
		if ($category != 'SWL') {
			$sql = "SELECT `call` from hlwtest WHERE `year`='$year' AND category='$category' and category!='SWL' and dxcc='$dxcc' and dxcc != 'Israel' ORDER BY score DESC";
		} else {
			$sql = "SELECT `call` from hlwtest WHERE `year`='$year' AND category='$category' and dxcc='$dxcc' and dxcc != 'Israel' ORDER BY score DESC";
		}
		
		$result = mysqli_query($GLOBALS["___mysqli_ston"],  $sql ) or die ( mysqli_error($GLOBALS["___mysqli_ston"]) );
		while ( $row = mysqli_fetch_array( $result,  MYSQLI_ASSOC ) ) {
			$resultSetDxcc [] = $row ['call'];
		}
		$placeDxcc = array_search ( $callsign, $resultSetDxcc ) + 1;
		// echo 'Place Cont: ' . $placeCont;
	}
	
	// die ();
	/**
	 * *************************** Get data from hlwtest **************************************
	 */
	
	// ////////////////////////////////////////
	// Here you should create the pdf file
	// and insert the data into the DB
	// PDF and insert into DB routine
	/**
	 * *************************** Generate PDF file **************************************
	 */
	$stylesheet = file_get_contents ( 'css_teuda.css' );
	include ("mpdf/mpdf.php");
	$mpdf = new mPDF ( '', 'A4-L', '16', 'Times', 60, 15, 155, 16, 9, 9 );
	$mpdf->SetImportUse ();
	$mpdf->AddPage ();
	$pagecount = $mpdf->SetSourceFile ( 'hl_cert.pdf' );
	$tplId = $mpdf->ImportPage ( $pagecount );
	$mpdf->UseTemplate ( $tplId );
	
	// $mpdf->SetDirectionality('ltr');
	// $mpdf->SetAutoFont();
	// $mpdf->WriteText ( 69, 158, $callsign );
	// $mpdf->WriteText ( 120, 158, $name );
	// $mpdf->WriteText ( 250, 158, $place . '-' . $category );
	// $mpdf->WriteText ( 155, 167, $dxcc );
	// $mpdf->WriteText ( 130, 185, 'December ' . $year );
	
	// if ($place == 1) {
	// $mpdf->WriteText ( 215, 165, '1st in the World' );
	// }
	$html = '<div id="call">' . $callsign . '</div>
			<div id="name">' . $name . '</div>
			<div id="dxcc">' . $dxcc . '</div>
			<div id="year">December ' . $year . '</div>';
	if ($category == 'CHECKLOG') {
		// $html .= '<div id="world">Log thanks</div>';
		$html .= '<div id="place">' . $category . '</div>';
	}  // elseif ($category == 'SWL') {
	  
	// }
	else {
		if ($dxcc != 'Israel') {
			if ($place == 1) {
				$html .= '<div id="world">1st in the World</div>';
				// $html .= '<div id="place">' . $place . '-' . $category . '</div>';
			} elseif ($place == 2) {
				$html .= '<div id="world">2nd in the World</div>';
				// $html .= '<div id="place">' . $place . '-' . $category . '</div>';
			} elseif ($place == 3) {
				$html .= '<div id="world">3rd in the World</div>';
				// $html .= '<div id="place">' . $place . '-' . $category . '</div>';
			} elseif ($placeCont == 1) {
				$html .= '<div id="cont">' . $continent . ' - Winnner</div>';
				// $html .= '<div id="place">' . $placeDxcc . '-' . $category . '</div>';
			} elseif ($placeDxcc == 1) {
				$html .= '<div id="cont">' . $dxcc . ' - Winnner</div>';
				// $html .= '<div id="place">' . $placeDxcc . '-' . $category . '</div>';
			}
			$html .= '<div id="place">' . $placeDxcc . '-' . $category . '</div>';
		}
	}
	
	$mpdf->WriteHTML ( $stylesheet, 1 );
	$mpdf->WriteHTML ( $html, 2 );
	
	$mpdf->Output ( $callsign . ".pdf", "I" );
}
/**
 * *********************************************************************************************
 */
?> 
	</body>
</html>