<?
include ("db_holylanddb.inc");
include ('error.inc');
// ini_set ( 'display_errors', 1 );
ini_set ( 'error_reporting', E_ALL ^ E_NOTICE);
//include ('sqs.php');
//set_error_handler ( "handleError" );
header ( 'Content-type: application/json' );
$isDebug = false; // Debug mode
                  
// get the POST variable
$info = $_POST ["info"];

$year = date ( "Y" );

// extract all the properties of the registration request
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
$logVer = '';
$category_operator = '';
$category_mode = '';
$category_power = '';
$callsign = '';
$email = '';
$name = '';
$contest = '';

// load the file
if (! ($f = fopen ( __DIR__ . "/log_uploads/" . $filename, "r" )))
{
	die ( json_encode ( array (
			'success' => false,
			'msg' => 'Could not open the log file ' . $filename . ' Please contact the contest manager' 
	) ) );
}
$file = fread ( $f, filesize ( __DIR__ . "/log_uploads/" . $filename ) );
$file_content = addslashes ( $file );
$rows_log_data = explode ( "\r\n", $file );
$rows_log_data = preg_replace('!\s+!', ' ', $rows_log_data);
$rows_log_data = str_replace('NONE', '', $rows_log_data); //remove NONE column in the log

//Parse the file
$logVer = dataExtractor('/^START-OF-LOG:/', $rows_log_data);//
$rows_log_data = str_replace('CATEGORY OPERATOR:','CATEGORY-OPERATOR:',$rows_log_data);
$rows_log_data = str_replace('CATEGORY MODE:','CATEGORY-MODE:',$rows_log_data);
$rows_log_data = str_replace('CATEGORY POWER:','CATEGORY-POWER:',$rows_log_data);
//*********************************** Version Dependened Data ********************************//
if ($logVer == '3.0') {
	$category_operator = trim(strtoupper(dataExtractor('/^CATEGORY-OPERATOR:/', $rows_log_data)));
	$category_mode = trim(strtoupper(dataExtractor('/^CATEGORY-MODE:/', $rows_log_data)));
	$category_power = trim(strtoupper(dataExtractor('/^CATEGORY-POWER:/', $rows_log_data)));
}
else if ($logVer == '2.0') {
	//CATEGORY: SINGLE-OP ALL HIGH CW
	$category = trim(strtoupper(dataExtractor('/^CATEGORY:/', $rows_log_data)));
	list($category_operator, $category_band, $category_power, $category_mode) = explode(" ", $category);
	if (strtoupper($category_operator) == 'CHECKLOG'){
		$category_band= "ALL"; 
		$category_power="HIGH";
		$category_mode="MIXED";
	}
}
$category_operator = str_replace("-NON-ASSISTED","",$category_operator);
$category_operator = str_replace("-ASSISTED","",$category_operator);
//*******************************************************************************************//

if (strtoupper($category_operator) != 'SINGLE-OP' && strtoupper($category_operator) != 'MULTI-OP' && strtoupper($category_operator) != 'SWL' && strtoupper($category_operator) != 'CHECKLOG') {
	die ( json_encode ( array (
			'success' => false,
			'msg' => 'CATEGORY-OPERATOR Valid values are: SINGLE-OP, MULTI-OP, SWL, CHECKLOG' 
	) ) );
}
if (strtoupper($category_mode) != 'SSB' && strtoupper($category_mode) != 'CW' && strtoupper($category_mode) != 'DIGI' && strtoupper($category_mode) != 'MIXED' && strtoupper($category_mode) != 'MIX' && strtoupper($category_mode) != 'FT8' && strtoupper($category_mode) != 'SOB' && strtoupper($category_mode) != 'M5' && strtoupper($category_mode) != 'M10' && strtoupper($category_mode) != 'POR' && strtoupper($category_mode) != 'MOP' && strtoupper($category_mode) != 'MM' && strtoupper($category_mode) != 'MMP' && strtoupper($category_mode) != '4Z9' && strtoupper($category_mode) != 'SHA' && strtoupper($category_mode) != 'SWL' && strtoupper($category_mode) != 'NEW') {
	die ( json_encode ( array (
			'success' => false,
			'msg' => 'CATEGORY-MODE Valid values are: SSB, CW, DIGI, MIXED, FT8, QRP, SOB, M5, M10, POR, MOP, MM, MMP, 4Z9, SHA, SWL, NEW' 
	) ) );
}	
if (strtoupper($category_power) != 'HIGH' && strtoupper($category_power) != 'LOW' && strtoupper($category_power) != 'QRP') {
	die ( json_encode ( array (
			'success' => false,
			'msg' => 'CATEGORY-POWER Valid values are: HIGH, LOW, QRP' 
	) ) );
}

$callsign = trim(strtoupper(dataExtractor('/^CALLSIGN:/', $rows_log_data)));
if (empty ( $callsign)) {
	die ( json_encode ( array (
			'success' => false,
			'msg' => 'CALLSIGN can not be emtpty' 
	) ) );
}
$email = dataExtractor('/^EMAIL:/', $rows_log_data);
// if (empty ( $email)) {
	// $email = dataExtractor('/^E-MAIL:/', $rows_log_data);
	// if (empty ( $email)) {
		// die ( json_encode ( array (
				// 'success' => false,
				// 'msg' => 'E-MAIL can not be emtpty' 
		// ) ) );
	// }
// }
$name = mysqli_real_escape_string($Link, dataExtractor('/^NAME:/', $rows_log_data));
if (empty ( $name)) {
	die ( json_encode ( array (
			'success' => false,
			'msg' => 'NAME can not be emtpty' 
	) ) );
}
$contest = trim ( strtoupper ( str_replace ( '-', ' ', dataExtractor('/^CONTEST:/', $rows_log_data) ) ) );
if (empty ( $contest )) {
	die ( json_encode ( array (
			'success' => false,
			'msg' => 'CONTEST can not be emtpty (must be HOLYLAND)' 
	) ) );
}
if (strpos ( $contest, 'HOLYLAND' ) === false) {
	die ( json_encode ( array (
			'success' => false,
			'msg' => 'CONTEST must be HOLYLAND' 
	) ) );
}
// Get data from HAMQTH.com
$country = getHamQth ($callsign);

//analyze and insert to DB
$isValid = true;
$i = 0;
$log_data_qso = [];
$log_data_qso_part = [];
foreach ( $rows_log_data as $qso ) {
	if (stristr ( $qso, 'QSO:' )) {
		$log_data_qso [$i] = $qso;
		$log_data_qso_part [$i] = explode ( " ", $log_data_qso [$i] );
		$log_data_qso_part [$i] = array_values ( array_filter ( $log_data_qso_part [$i] ) );
		if (count($log_data_qso_part[$i]) != 11)
			$isValid = false;
		$i++;
	}
}
if ($isValid === false) {
	die ( json_encode ( array (
		 'success' => false,
		 'msg' => 'Log structure is invalid'
		 ) ) );
}
$i = 0;
foreach ( $log_data_qso as $qso ) {
	
	$freq = $log_data_qso_part[$i][1];
	$mode = $log_data_qso_part[$i][2];
	$date = str_replace("-","",$log_data_qso_part[$i][3]);
	$time = $log_data_qso_part[$i][4];
	$my_call = $log_data_qso_part[$i][5];
	$rst_sent = $log_data_qso_part[$i][6];
	$square = $log_data_qso_part[$i][7];
	$dx_call = $log_data_qso_part[$i][8];
	$rst_rcvd = $log_data_qso_part[$i][9];
	$exchange = $log_data_qso_part[$i][10];
	$i++;
	
	$query = "INSERT IGNORE INTO `holyland_log` (`my_call`, `my_square`, `mode`, `frequency`, `band`, `callsign`, `timestamp`, `rst_sent`, `rst_rcvd`, `exchange`, `comment`, `name`, `country`) VALUES ('$my_call', '$square', '$mode', '$freq', '', '$dx_call', '$date $time', '$rst_sent', '$rst_rcvd', '$exchange', '', '', '')";
	$result = mysqli_query($GLOBALS["___mysqli_ston"],  $query );
	if (!$result)
	{
		die ( json_encode ( array (
			'success' => false,
			'msg' => 'Failed to save log.' 
		) ) );
	}
}
$now = strtotime("now");
$now = date("Y-m-d H:i:s", $now);
$query = "INSERT INTO 
`iarcorg_holylanddb`.`participants` 
(`callsign`, `category_op`, `category_mode`, `category_power`, `email`, `name`, `country`, `year`, `qsos`, `points`, `timestamp`, `is_manual`) 
VALUES 
('$callsign', '$category_operator', '$category_mode', '$category_power', '$email', '$name', '$country[1]', '$year', '$i', '0', '$now', '0') 
ON DUPLICATE KEY UPDATE 
`category_op` = '$category_operator',
`category_mode` = '$category_mode',
`category_power` = '$category_power',
`email` = '$email',
`name` = '$name',
`country` =  '$country[1]',
`year` = '$year',
`timestamp` = '$now',
`qsos` = '$i'";
$result = mysqli_query($GLOBALS["___mysqli_ston"],  $query );
if (!$result)
{
	die ( json_encode ( array (
		'success' => false,
		'msg' => 'Failed to add participant.' . mysqli_error($Link)
	) ) );
}
sendMail($email, $callsign, $year, $category_mode, $category_operator, $category_power, $i);


echo json_encode ( array (
				'success' => true,
				'msg' => 'Thank you for uploading the log.'
	) );


// finally, return a message to the user
// echo json_encode('Thanks for uploading your log. '. $email. "/" . $category. "/". $timestamp. "/" . $filename. "/" . $dx. "/" . $continent. "/" . $dxcc. "/" . $contest);
// echo json_encode(array('success' => true, 'msg' => 'Thanks for uploading your log. '. $email. "/" . $category. "/". $timestamp. "/" . $filename. "/" . $dx. "/" . $continent. "/" . $dxcc. "/" . $contest));
((is_null($___mysqli_res = mysqli_close( $Link ))) ? false : $___mysqli_res);
return;




function getHamQth($dx) {
	$xml = simplexml_load_file ( "http://www.hamqth.com/dxcc.php?callsign=" . "$dx" );
	$data [0] = $xml->dxcc->continent;
	$data [1] = $xml->dxcc->name;
	$data [2] = $xml->dxcc->adif;
	return $data;
}

function sendMail($email, $callsign, $year, $category_mode, $category_operator, $category_power, $qso_count) {
	$to = $email . ",gilifon@gmail.com";
	$from = "holyland@iarc.org";
	
	$subject = "Holyland Contest " . $year . " Log (".$callsign.")";
	
	$headers = 'From: ' . $from . "\r\n";
	$headers .= 'MIME-Version: 1.0' . "\r\n";
	$headers .= 'Content-type: text/html; charset=utf-8' . "\r\n";
	$message = '<p>Dear ' . $callsign . ',</p>
	<p>Thank you very much for your participation and for sending the log.</p>
	<p>
		<ul>
			<li>Call: <strong>' . $callsign . '</strong></li>
			<li>Mode: <strong>' . $category_mode . '</strong></li>
			<li>Operator: <strong>' . $category_operator . '</strong></li>
			<li>Power: <strong>' . $category_power . '</strong></li>
			<li># of QSOs: <strong>' . $qso_count . '</strong></li>
		</ul>
	</p>
	<p>
		Log list: https://iarc.org/iarc/#HolylandLogs <br/>
		Results (not before May 31th): https://www.iarc.org/iarc/#HolylandResults
	</p>
	73! MARK 4Z4KX<br>
	IARC Contest Manager<br>
	==============================================================================<br>';
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
	
	$query = "INSERT INTO hlwtest (`active`, `year`, `callsign`, `dxcc`, `uniq_timestamp`, `continent`, `category`, `qso`, `points`, `mults`, `score`, `ip`, `date_added`)
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
function dataExtractor($field, $data)
{
	$temp = preg_grep ( $field, $data, 0 );//'/^START-OF-LOG:/'
	$temp = array_shift ($temp);
	$temp = stristr ( $temp, ' ');
	$temp = trim ($temp);
	return $temp;
}
function sendArrayToEmail($array, $errorLine, $errorStr, $errorString) {
	$to = 'gilifon@gmail.com';
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