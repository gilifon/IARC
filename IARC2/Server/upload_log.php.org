<?
include ("db_web.inc");
include ('error.inc');
// ini_set ( 'display_errors', 1 );
ini_set ( 'error_reporting', E_ALL );
include ('sqs.php');
set_error_handler ( "handleError" );
header ( 'Content-type: application/json' );
$isDebug = false; // Debug mode
                  
// get the POST variable
$info = $_POST ["info"];

$year = date ( "Y" );
$time_min = strtotime ( '04/01/' . $year . ' second Friday' );
$time_max = strtotime ( '05/30/' . $year );

if (! $isDebug) {
	if ($time_min <= time () && $time_max >= time ()) {
	} else {
		//die ( json_encode ( array (
		//		'success' => false,
		//		'msg' => 'The Holyland log upload, can be uploaded between <strong>' . date ( 'l jS F Y', $time_min ) . "</strong> and <strong>" . date ( 'l jS F Y', $time_max ) . '</strong>' 
		//) ) );
	}
}

// extract all the properties of the registration request
if (isset ( $info ['email'] )) {
	$email = $info ['email'];
} else {
	$email = '';
}
if (isset ( $info ['category'] )) {
	$category = $info ['category'];
} else {
	$category = '';
}
if (isset ( $info ['timestamp'] )) {
	$timestamp = $info ['timestamp'];
} else {
	$timestamp = '';
}
if (isset ( $info ['filename'] )) {
	$filename = $info ['filename'];
} else {
	$filename = '';
}

// RUN THE ALGORITHM
$log_data_qso = array ();
$uniqqso = array ();
$band = array ();
$mult = array ();
$multS = array ();
$multH = array ();
$modeUniq = array ();
$sqsValidation = array ();
$validQSO = array ();
$logHeader = array ();
$logCalculated = array ();
$invalidQSO = array ();
$hamqthdata = array ();
$pointsArr = array ();
$swl = false;

if (! ($f = fopen ( __DIR__ . "/../holylandLogs/" . $filename, "r" )))
	// die ( "Could not open the log file $filename" );
	die ( json_encode ( array (
			'success' => false,
			'msg' => 'Could not open the log file ' . $filename . ' Please contact info@iarc.org' 
	) ) );
$file = fread ( $f, filesize ( __DIR__ . "/../holylandLogs/" . $filename ) );
$file_content = addslashes ( $file );
$rows_log_data = explode ( "\r\n", $file );
$rows_log_data = preg_replace('!\s+!', ' ', $rows_log_data);
$rows_log_data = str_replace('NONE', '', $rows_log_data); //remove NONE column in the log

$logVer = trim ( stristr ( array_shift ( (preg_grep ( '/^START-OF-LOG:/', $rows_log_data, 0 )) ), ' ' ) );
if ($logVer == '2.0') {
	$logHeader [0] = $logVer;
	$logHeader [1] = trim ( stristr ( array_shift ( (preg_grep ( '/^CATEGORY:/', $rows_log_data, 0 )) ), ' ' ) );
	$logHeader [2] = trim ( stristr ( array_shift ( (preg_grep ( '/^CREATED-BY:/', $rows_log_data, 0 )) ), ' ' ) );
	$logHeader [3] = $category; // category
	$logHeader [7] = $timestamp; // timestamp
	$logHeader [8] = $email; // email
	if (strpos ( $logHeader [1], 'SWL' ) !== false) {
		$swl = true;
	}
}
if ($logVer == '3.0') {
	$logHeader [0] = $logVer;
	$cat1 = trim ( stristr ( array_shift ( (preg_grep ( '/^CATEGORY-OPERATOR:/', $rows_log_data, 0 )) ), ' ' ) );
	$cat2 = trim ( stristr ( array_shift ( (preg_grep ( '/^CATEGORY-BAND:/', $rows_log_data, 0 )) ), ' ' ) );
	$cat3 = trim ( stristr ( array_shift ( (preg_grep ( '/^CATEGORY-MODE:/', $rows_log_data, 0 )) ), ' ' ) );
	$cat4 = trim ( stristr ( array_shift ( (preg_grep ( '/^CATEGORY-POWER:/', $rows_log_data, 0 )) ), ' ' ) );
	$cat5 = trim ( stristr ( array_shift ( (preg_grep ( '/^CATEGORY-STATION:/', $rows_log_data, 0 )) ), ' ' ) );
	$cat6 = trim ( stristr ( array_shift ( (preg_grep ( '/^CATEGORY-ASSISTED:/', $rows_log_data, 0 )) ), ' ' ) );
	$cat7 = trim ( stristr ( array_shift ( (preg_grep ( '/^CATEGORY-TRANSMITTER:/', $rows_log_data, 0 )) ), ' ' ) );
	$logHeader [1] = $cat1 . " " . $cat2 . " " . $cat3 . " " . $cat4 . " " . $cat5 . " " . $cat6 . " " . $cat7;
	$logHeader [2] = trim ( stristr ( array_shift ( (preg_grep ( '/^CREATED-BY:/', $rows_log_data, 0 )) ), ' ' ) );
	$logHeader [3] = $category; // category
	$logHeader [7] = $timestamp; // timestamp
	$logHeader [8] = $email; // email
	if (strpos ( $logHeader [1], 'SWL' ) !== false) {
		$swl = true;
	}
}

$logHeader [5] = trim ( stristr ( array_shift ( (preg_grep ( '/^CALLSIGN:/', $rows_log_data, 0 )) ), ' ' ) );
if (empty ( $logHeader [5] )) {
	die ( json_encode ( array (
			'success' => false,
			'msg' => 'Error1. "CALLSIGN:" field in cabrillo header is emtpty' 
	) ) );
}
$logHeader [6] = trim ( strtoupper ( str_replace ( '-', ' ', stristr ( array_shift ( (preg_grep ( '/^CONTEST:/', $rows_log_data, 0 )) ), ' ' ) ) ) );
if (empty ( $logHeader [6] )) {
	die ( json_encode ( array (
			'success' => false,
			'msg' => 'Error3. "CONTEST:" field in cabrillo header is emtpty' 
	) ) );
}
if (strpos ( $logHeader [6], 'HOLYLAND' ) === false) {
	die ( json_encode ( array (
			'success' => false,
			'msg' => 'Error4. "CONTEST:" field is wrong in cabrillo header. Must to be "HOLYLAND"' 
	) ) );
}
// Get data from HAMQTH.com
$hamqthdata = getHamQth ( $logHeader [5] );

// Check if SWL or TRX and 4X
if ($swl) {
	// SWL
	// function calculateAll($fldDate, $fldBand, $fldMode, $fldArea, $logDataFile)
	$logCalculated = calculateAll ( 3, 1, 2, 7, $rows_log_data, $logHeader, $hamqthdata );
} else {
	if ($hamqthdata [2] != '336') {
		// WORLD
		// function calculateAll($fldDate, $fldBand, $fldMode, $fldArea, $logDataFile)
		$logCalculated = calculateAll ( 3, 1, 2, 10, $rows_log_data, $logHeader, $hamqthdata );
	}
	if ($hamqthdata [2] == '336') {
		// Israel
		// function calculateAll($fldDate, $fldBand, $fldMode, $fldArea, $logDataFile)
		$logCalculated = calculateAllIsrael ( 3, 1, 2, 10, $rows_log_data, $logHeader, $hamqthdata );
	}
}

if ($isDebug) {
	echo '<pre>';
	print_r ( $logCalculated );
	echo '</pre>';
	die ();
}

if (checkIfLogExist ( $logCalculated [5] [5], $logCalculated [4] )) {
	die ( json_encode ( array (
			'success' => false,
			'msg' => 'Error5. Log file for ' . $logCalculated [5] [5] . ' and ' . $logCalculated [4] . ' year already exist in DB. Please contact info@iarc.org' 
	) ) );
} else {
	if (! $isDebug) {
		if ($logCalculated [6] [2] != '336') {
			$mult = count ( array_unique ( $logCalculated [2] [0] ) );
			$square = null;
		}
		if ($logCalculated [6] [2] == '336') {
			$mult = count ( array_unique ( $logCalculated [2] [0] ) ) + count ( array_unique ( $logCalculated [2] [1] ) );
			$square = $logCalculated [5] [4];
		}
		$submitArr [0] = $logCalculated [5] [5]; // call
		$submitArr [1] = $logCalculated [4]; // year
		$submitArr [2] = count ( $logCalculated [1] ); // QSOs
		$submitArr [3] = $mult; // mults
		$submitArr [4] = $logCalculated [0] [0] * $submitArr [3]; // score
		$submitArr [5] = $logCalculated [0] [0]; // points
		$submitArr [6] = $logCalculated [6] [0]; // continent
		$submitArr [7] = $logCalculated [6] [1]; // dxcc
		$submitArr [8] = $square; // square
		$submitArr [9] = $logCalculated [5] [3]; // category
		$submitArr [10] = $logCalculated [5] [8]; // email
		$submitArr [11] = $logCalculated [5] [7]; // timestamp
		
		insertIntoDb ( $submitArr );
	} else {
		if ($logCalculated [6] [2] != '336') {
			$mult = count ( array_unique ( $logCalculated [2] [0] ) );
			$square = null;
		}
		if ($logCalculated [6] [2] == '336') {
			$mult = count ( array_unique ( $logCalculated [2] [0] ) ) + count ( array_unique ( $logCalculated [2] [1] ) );
			$square = $allFinalArr [5] [4];
		}
		$submitArr [0] = $logCalculated [5] [5]; // call
		$submitArr [1] = $logCalculated [4]; // year
		$submitArr [2] = count ( $logCalculated [1] ); // QSOs
		$submitArr [3] = $mult; // mults
		$submitArr [4] = $logCalculated [0] [0] * $submitArr [3]; // score
		$submitArr [5] = $logCalculated [0] [0]; // points
		$submitArr [6] = $logCalculated [6] [0]; // continent
		$submitArr [7] = $logCalculated [6] [1]; // dxcc
		$submitArr [8] = $square;
		$submitArr [9] = $logCalculated [5] [3]; // category
		$submitArr [10] = $logCalculated [5] [8]; // email
		$submitArr [11] = $logCalculated [5] [7]; // timestamp
		
		/*
		 * die ( json_encode ( array (
		 * 'success' => false,
		 * 'msg' => 'Error9. Log file" ' . $submitArr [0] . ' ' . $submitArr [1] . ' ' . $submitArr [2] . ' ' . $submitArr [3] . ' ' . $submitArr [4] . ' ' . $submitArr [5] . ' ' . $submitArr [6] . ' ' . $submitArr [7] . ' ' . $submitArr [8]
		 * ) ) );
		 * // $logCalculated [5] [5];//call
		 * // $logCalculated [4];//year
		 * // $logCalculated [6] [0];//continent
		 * // $logCalculated [6] [1];//dxcc
		 * // $logCalculated [6] [2];//adif
		 * // $logCalculated [1] ;//QSOs
		 * // $logCalculated [5] [4];//square
		 * // $logCalculated [0] [0];//points
		 * // $logCalculated [0] [1];//points H
		 * // $logCalculated [0] [2];//points L
		 */
	}
}

// finally, return a message to the user
// echo json_encode('Thanks for uploading your log. '. $email. "/" . $category. "/". $timestamp. "/" . $filename. "/" . $dx. "/" . $continent. "/" . $dxcc. "/" . $contest);
// echo json_encode(array('success' => true, 'msg' => 'Thanks for uploading your log. '. $email. "/" . $category. "/". $timestamp. "/" . $filename. "/" . $dx. "/" . $continent. "/" . $dxcc. "/" . $contest));
((is_null($___mysqli_res = mysqli_close( $Link ))) ? false : $___mysqli_res);
function calculateAll($fldDate, $fldBand, $fldMode, $fldArea, $logDataFile, $fldLogHeader, $dxccData) {
	require ('sqs.php');
	$invalidQSO = array ();
	$i = 0;
	$points = 0;
	$pH = 0;
	$pL = 0;
	foreach ( $logDataFile as $qso ) {
		if (stristr ( $qso, 'QSO:' )) {
			$log_data_qso [$i] = $qso;
			$log_data_qso_part [$i] = explode ( " ", $log_data_qso [$i] );
			$log_data_qso_part [$i] = array_values ( array_filter ( $log_data_qso_part [$i] ) );
			
			$uniqqso1 = trim ( substr ( $log_data_qso_part [$i] [$fldBand], 0, - 3 ) ); // BAND
			$uniqqso2 = trim ( $log_data_qso_part [$i] [$fldMode] ); // MODE
			$uniqqso3 = trim ( $log_data_qso_part [$i] [8] ); // DX callsign
			$uniqqso4 = isset ( $log_data_qso_part [$i] [$fldArea] ) ? trim ( strtoupper ( $log_data_qso_part [$i] [$fldArea] ) ) : null; // AREA
			
			if (in_array ( $uniqqso4, $sqs )) {
				if ($uniqqso1 <= '7') {
					$points = $points + 2;
					$pH = $pH + 2;
				}
				if ($uniqqso1 > '7') {
					$points = $points + 1;
					$pL = $pL + 1;
				}
				$multH [$i] = "$uniqqso1" . "$uniqqso4";
				$validQSO [$i] = $log_data_qso [$i];
			} else {
				$invalidQSO [$i] = $log_data_qso [$i];
			}
			// }
			$sqsValidation [$i] = "$uniqqso1" . "$uniqqso4";
			$i ++;
		}
	}
	$pointsArr [0] = $points;
	$pointsArr [1] = $pH;
	$pointsArr [2] = $pL;
	$multsArr [0] = $multH;
	$fldLogHeader [4] = null; // HL square
	
	$calculateAllReturn [0] = $pointsArr; // points
	$calculateAllReturn [1] = $validQSO; // Valid QSO list
	$calculateAllReturn [2] = $multsArr; // Valid mults list
	$calculateAllReturn [3] = $invalidQSO; // Invalid QSO list
	$calculateAllReturn [4] = substr ( trim ( $log_data_qso_part [0] [$fldDate] ), 0, 4 ); // YEAR
	$calculateAllReturn [5] = $fldLogHeader; // Log header. $fldLogHeader[5] - callsign
	$calculateAllReturn [6] = $dxccData; // DXCC data
	$calculateAllReturn [7] = $sqsValidation; // All QSO list
	return $calculateAllReturn;
}
function calculateAllIsrael($fldDate, $fldBand, $fldMode, $fldArea, $logDataFile, $fldLogHeader, $dxccData) {
	require ('sqs.php');
	$invalidQSO = array ();
	$multS = array ();
	$multH = array ();
	$i = 0;
	$points = 0;
	$pH = 0;
	$pL = 0;
	foreach ( $logDataFile as $qso ) {
		if (stristr ( $qso, 'QSO:' )) {
			$log_data_qso [$i] = $qso;
			$log_data_qso_part [$i] = explode ( " ", $log_data_qso [$i] );
			$log_data_qso_part [$i] = array_values ( array_filter ( $log_data_qso_part [$i] ) );
			
			$uniqqso1 = trim ( substr ( $log_data_qso_part [$i] [$fldBand], 0, - 3 ) ); // BAND
			$uniqqso2 = trim ( $log_data_qso_part [$i] [$fldMode] ); // MODE
			$uniqqso3 = trim ( $log_data_qso_part [$i] [8] ); // DX callsign
			$uniqqso4 = isset ( $log_data_qso_part [$i] [$fldArea] ) ? trim ( strtoupper ( $log_data_qso_part [$i] [$fldArea] ) ) : null; // AREA
			
			$dxcc = getDxccName ( $uniqqso3 ); // Get DXCC name
			$multS [$i] = "$uniqqso1" . "$dxcc"; // DXCC on band
			
			if (preg_match ( '/^[A-Z]/', $uniqqso4 )) {
				if (in_array ( $uniqqso4, $sqs )) {
					if ($uniqqso1 <= '7') {
						$points = $points + 2;
						$pH = $pH + 2;
					}
					if ($uniqqso1 > '7') {
						$points = $points + 1;
						$pL = $pL + 1;
					}
					$multH [$i] = "$uniqqso1" . "$uniqqso4";
					$validQSO [$i] = $log_data_qso [$i];
				} else {
					$invalidQSO [$i] = $log_data_qso [$i];
				}
			} elseif (is_numeric ( $uniqqso4 )) {
				if ($dxcc != 'false') {
					if ($uniqqso1 <= '7') {
						$points = $points + 2;
						$pH = $pH + 2;
					}
					if ($uniqqso1 > '7') {
						$points = $points + 1;
						$pL = $pL + 1;
					}
					$multS [$i] = "$uniqqso1" . "$dxcc";
					$validQSO [$i] = $log_data_qso [$i];
				}
			} else {
				$invalidQSO [$i] = $log_data_qso [$i];
			}
			
			$sqsValidation [$i] = "$uniqqso1" . "$uniqqso4";
			$i ++;
		}
	}
	$pointsArr [0] = $points;
	$pointsArr [1] = $pH;
	$pointsArr [2] = $pL;
	$multsArr [0] = $multH;
	$multsArr [1] = $multS;
	$fldLogHeader [4] = trim ( $log_data_qso_part [0] [7] ); // Square
	
	$calculateAllReturn [0] = $pointsArr; // points
	$calculateAllReturn [1] = $validQSO; // Valid QSO list
	$calculateAllReturn [2] = $multsArr; // Valid mults list
	$calculateAllReturn [3] = $invalidQSO; // Invalid QSO list
	$calculateAllReturn [4] = substr ( trim ( $log_data_qso_part [0] [$fldDate] ), 0, 4 ); // YEAR
	$calculateAllReturn [5] = $fldLogHeader; // Log header
	$calculateAllReturn [6] = $dxccData; // DXCC data
	$calculateAllReturn [7] = $sqsValidation; // All QSO list
	return $calculateAllReturn;
}
function handleError($errno, $errstr, $error_file, $error_line, $error_context) {
	$errorString = '<b>Error:</b> [' . $errno . '] ' . $errstr . ' - ' . $error_file . ' : ' . $error_line;
	sendArrayToEmail ( $error_context, $error_line, $errstr, $errorString );
	
	die ( json_encode ( array (
			'success' => false,
			// 'msg' => '<b>Error:</b> [' . $errno . '] ' . $errstr . ' - ' . $error_file . ':' . $error_line . '<strong>Please check your Cabrilo log file, or contact info@iarc.org</strong>'
			'msg' => '<b>Error:</b> [' . $errno . '] : ' . $error_line . '<strong> Please check your Cabrilo log file or send your file to info@iarc.org</strong>' 
	) ) );
}
function checkIfLogExist($dx, $year_log) {
	$sql = "SELECT id FROM hlwtest WHERE `call` = '$dx' and `year` = '$year_log' LIMIT 1";
	$result = mysqli_query($GLOBALS["___mysqli_ston"],  $sql ) or die ( json_encode ( array (
			'success' => false,
			'msg' => 'Error. ' . mysqli_error($GLOBALS["___mysqli_ston"]) 
	) ) );
	if (mysqli_num_rows( $result ) > 0) {
		return true;
	} else {
		return false;
	}
}
function getHamQth($dx) {
	$xml = simplexml_load_file ( "http://www.hamqth.com/dxcc.php?callsign=" . "$dx" );
	$data [0] = $xml->dxcc->continent;
	$data [1] = $xml->dxcc->name;
	$data [2] = $xml->dxcc->adif;
	return $data;
}
function getDxccName($a) {
	$sql = "SELECT name FROM dxcc WHERE prefix = SUBSTRING('" . $a . "', 1, LENGTH(prefix)) ORDER BY LENGTH(prefix) DESC LIMIT 1";
	$result = mysqli_query($GLOBALS["___mysqli_ston"],  $sql );
	while ( $row = mysqli_fetch_array( $result,  MYSQLI_ASSOC ) ) {
		$name = $row ['name'];
	}
	if (mysqli_num_rows( $result ) > 0) {
		return $name;
	} else {
		return 'false';
	}
}
function sendMail($array) {
	$email = $array [0];
	$dx = $array [1];
	$year = $array [2];
	$dxcc = $array [3];
	$category = $array [4];
	$qso = $array [5];
	$timestamp = $array [6];
	
	$to = $email . ";4x6hp@iarc.org;4z4kx@iarc.org";
	// $to = $email . ";4x6hp@iarc.org";
	$from = "info@iarc.org";
	$subject = "Holyland Contest " . $year . " Log " . $dx;
	$headers = 'From: ' . $from . "\r\n";
	$headers .= 'MIME-Version: 1.0' . "\r\n";
	$headers .= 'Content-type: text/html; charset=utf-8' . "\r\n";
	$message = '<p>Dear ' . $dx . ',</p>
	<p>We just got Your HC-' . $year . ' log.<br>
	Thank You very much for Your participation in the Holyland Contest-' . $year . '!
	</p>
	<p>
	<ul>
	<li>Call: <strong>' . $dx . '</strong></li>
	<li>DXCC: <strong>' . $dxcc . '</strong></li>
	<li>Category: <strong>' . $category . '</strong></li>
	<li>QSO: <strong>' . $qso . '</strong></li>
	<li>uniq: <strong>' . $timestamp . '</strong></li>
	</ul>
	</p>
	<p>
	Uploaded logs, you can check here: http://iarc.org/iarc/#HolylandLogs
	</p>
	73! MARK 4Z4KX<br>
	IARC Contest Manager<br>
	==============================================================================<br>
	Mark Stern 4Z4KX; Contest call 4Z0X,  SKYPE: kxmark<br>
	IARC Contest & Award  Manager, 7.080 Traffic Manager since 1990!<br>
	A1-OP, FOC-1782, HSC-1781, CWops-368, 5BDXCC, HONOR ROLL #1';
	$ok = mail ( $to, $subject, $message, $headers );
	if ($ok) {
		return true;
	} else {
		return false;
	}
}
function insertIntoDb($array) {
	$dx = $array [0]; // call
	$year = $array [1]; // year
	$qso = $array [2]; // QSOs
	$mults = $array [3]; // mults
	$score = $array [4]; // score
	$points = $array [5]; // points
	$continent = $array [6]; // continent
	$dxcc = $array [7]; // dxcc
	$square = $array [8]; // square
	$category = $array [9]; // category
	$email = $array [10]; // email
	$timestamp = $array [11]; // timestamp
	$ip = $_SERVER ['REMOTE_ADDR'];
	
	$query = "INSERT INTO hlwtest (`active`, `year`, `call`, `dxcc`, `uniq_timestamp`, `continent`, `category`, `qso`, `points`, `mults`, `score`, `ip`, `date_added`)
	VALUES (0, '$year', '$dx','$dxcc', '$timestamp', '$continent', '$category', '$qso', '$points', '$mults', '$score', '$ip', now())";
	$result = mysqli_query($GLOBALS["___mysqli_ston"],  $query );
	if ($result) {
		$array [0] = $email;
		$array [1] = $dx;
		$array [2] = $year;
		$array [3] = $dxcc;
		$array [4] = $category;
		$array [5] = $qso;
		$array [6] = $timestamp;
		
		if (sendMail ( $array )) {
			echo json_encode ( array (
					'success' => true,
					'msg' => 'Thanks for uploading your log. ' . $email . "/" . $qso . "/" . $category . "/" . $timestamp . "/" . $dxcc . "/" . $dx . "/" . $continent . ' Mail has been sent' 
			) );
		} else {
			echo json_encode ( array (
					'success' => true,
					'msg' => 'Thanks for uploading your log. ' . $email . "/" . $qso . "/" . $category . "/" . $timestamp . "/" . $dxcc . "/" . $dx . "/" . $continent . ' Mail has NOT been sent to you' 
			) );
		}
	} else {
		die ( json_encode ( array (
				'success' => false,
				'msg' => 'Error insert log into DB. ' . $query 
		) ) );
	}
}
function sendArrayToEmail($array, $errorLine, $errorStr, $errorString) {
	$to = '4x6hp@iarc.org';
	$from = "info@iarc.org";
	$subject = "Holyland Contest Log. Error: " . $errorLine . " " . $errorStr;
	$headers = 'From: ' . $from . "\r\n";
	$headers .= 'MIME-Version: 1.0' . "\r\n";
	$headers .= 'Content-type: text/html; charset=utf-8' . "\r\n";
	$message = '
			<p>' . $errorString . '</p>
			<pre>
			' . print_r ( $array, true ) . '
			</pre>
			';
	$ok = mail ( $to, $subject, $message, $headers );
	if ($ok) {
		return true;
	} else {
		return false;
	}
}
?>