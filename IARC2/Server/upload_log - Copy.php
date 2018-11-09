<?
include ("db_web.inc");
include('error.inc');
ini_set('display_errors',1);
error_reporting(E_ALL);
header('Content-type: application/json');
$isDebug = false;

//get the POST variable
$info = $_POST["info"];

$year = date("Y");
$time_min = strtotime('04/01/'.$year.' third Friday');
$time_max = strtotime('05/31/'.$year);
if ($time_min <= time() && $time_max >= time()){
	
} 
else {
die(json_encode(array('success' => false, 'msg' => 'The Holyland log upload, can be uploaded between <strong>'.date('l jS F Y', $time_min)."</strong> and <strong>".date('l jS F Y', $time_max).'</strong>')));
}

//extract all the properties of the registration request
if(isset($info['email'])){$email = $info['email'];}else{$email = '';}
if(isset($info['category'])){$category = $info['category'];}else{$category = '';}
if(isset($info['timestamp'])){$timestamp = $info['timestamp'];}else{$timestamp = '';}
if(isset($info['filename'])){$filename = $info['filename'];}else{$filename = '';}

//RUN THE ALGORITHM
$ip = $_SERVER['REMOTE_ADDR'];
$log_data_qso = array();
$uniqqso = array();
$band = array();
$mult = array();
if (!($f = fopen (__DIR__."/../holylandLogs/".$filename, "r"))) die ("Could not open the log file $filename \n");
$file = fread($f, filesize(__DIR__."/../holylandLogs/".$filename));
$file_content = addslashes($file);
$rows_log_data = explode("\r\n", $file);	

$dx = trim(stristr(array_shift((preg_grep('/^CALLSIGN:/', $rows_log_data, 0))), ' '));
if (empty($dx)) {
	die(json_encode(array('success' => false, 'msg' => 'Error1. "CALLSIGN:" field in cabrillo header is emtpty')));
}
$name = mysqli_real_escape_string($GLOBALS["___mysqli_ston"], trim(stristr(array_shift((preg_grep('/^NAME:/', $rows_log_data, 0))), ' ')));
if (empty($name)) {
	die(json_encode(array('success' => false, 'msg' => 'Error2. "NAME:" field in cabrillo header is emtpty')));
}
$contest = strtoupper(str_replace('-', ' ', stristr(array_shift((preg_grep('/^CONTEST:/', $rows_log_data, 0))), ' ')));
if (empty($contest)) {
	die(json_encode(array('success' => false, 'msg' => 'Error3. "CONTEST:" field in cabrillo header is emtpty')));
	}
if (strpos($contest,'HOLYLAND') === false) {
	die(json_encode(array('success' => false, 'msg' => 'Error4. "CONTEST:" field is wrong in cabrillo header. Must to be "HOLYLAND"')));
}

$xml = simplexml_load_file("http://www.hamqth.com/dxcc.php?callsign="."$dx");
$continent = $xml->dxcc->continent;
$dxcc = $xml->dxcc->name;
$adif = $xml->dxcc->adif;		
$i = 0;
$points = 0;
$pH = 0;
$pL = 0;
$multS = array();
$multH = array();
	
if ($adif != '336'){
//WORLD
	foreach ($rows_log_data as $qso){
		if (stristr($qso, 'QSO:')){
			$log_data_qso[$i] = $qso;
			$log_data_qso_part[$i] = explode(" ", $log_data_qso[$i]);
			$log_data_qso_part[$i] = array_values(array_filter($log_data_qso_part[$i]));		
			$band[$i] = substr($log_data_qso_part[$i][1], 0, -3);			
			$mult1 = $log_data_qso_part[$i][10];
			$mult2= substr($log_data_qso_part[$i][1], 0, -3);
			$mult[$i] = "$mult1"."$mult2";
			$uniqqso1 = substr($log_data_qso_part[$i][1], 0, -3);
			$uniqqso2 = $log_data_qso_part[$i][2];
			$uniqqso3 = $log_data_qso_part[$i][8];
			$uniqqso4 = $log_data_qso_part[$i][10];
			//if (!in_array("$uniqqso1"."$uniqqso2"."$uniqqso3"."$uniqqso4", $uniqqso)) {
				//echo "da".$i."<br>";
				if ($band[$i] <= '7') {$points = $points + 2; $pH = $pH + 2; $pointqso = 2;}
				if ($band[$i] > '7') {$points = $points + 1; $pL = $pL + 1; $pointqso = 1;}				
			//}
			$multH[$i] = "$uniqqso1"."$uniqqso4";
			$i++;
		}
	}
} 
if ($adif == '336'){
//ISRAEL
//SELECT * FROM dxcc WHERE prefix = SUBSTRING('UA9CDC', 1, LENGTH(prefix)) ORDER BY LENGTH(prefix) DESC LIMIT 1 
//die(json_encode(array('success' => false, 'msg' => 'Israeli stations logs upload, still in development. Logs for Holyland contest, should be sent to contest manager')));
	foreach ($rows_log_data as $qso){
		if (stristr($qso, 'QSO:')){
			$log_data_qso[$i] = $qso;
			$log_data_qso_part[$i] = explode(" ", $log_data_qso[$i]);
			$log_data_qso_part[$i] = array_values(array_filter($log_data_qso_part[$i]));		
			$band[$i] = substr($log_data_qso_part[$i][1], 0, -3);		
			$mult1 = $log_data_qso_part[$i][10];
			$mult2= substr($log_data_qso_part[$i][1], 0, -3);
			if(preg_match('/^[A-Z]/', $mult1)){
				$multH[$i] = "$mult2"."$mult1";
			}
			$uniqqso1 = substr($log_data_qso_part[$i][1], 0, -3);
			$uniqqso2 = $log_data_qso_part[$i][2];
			$uniqqso3 = $log_data_qso_part[$i][8];
			$sql = "SELECT name FROM dxcc WHERE prefix = SUBSTRING('".$uniqqso3."', 1, LENGTH(prefix)) ORDER BY LENGTH(prefix) DESC LIMIT 1";
			$result = mysqli_query($GLOBALS["___mysqli_ston"], $sql);
			while ($row = mysqli_fetch_array($result,  MYSQLI_ASSOC)){
			$adifm = $row['name'];
			}
			if ($band[$i] <= '7') {$points = $points + 2; $pH = $pH + 2; $pointqso = 2;}
			if ($band[$i] > '7') {$points = $points + 1; $pL = $pL + 1; $pointqso = 1;}				
			$multS[$i] = "$mult2"."$adifm";
			$i++;
		}
	}
} 

$year = substr(trim($log_data_qso_part[0][3]), 0, 4);
$qso = count($log_data_qso);
$mults = count(array_unique($multS)) + count(array_unique($multH));
$score = $points * $mults;	

//echo json_encode(array('success' => true, 'msg' => $dx.' '.$year));

$query = mysqli_query($GLOBALS["___mysqli_ston"], "SELECT id FROM hlwtest WHERE `call` = '$dx' and `year` = '$year' LIMIT 1");
if (mysqli_num_rows($query) > 0){
	die(json_encode(array('success' => false, 'msg' => 'Error5. Log file for this callsign and this year already exist in DB. Please contact info@iarc.org')));
}
else {
		$logfile = mysqli_real_escape_string($GLOBALS["___mysqli_ston"], file_get_contents(__DIR__."/../holylandLogs/".$filename));
		$query="INSERT INTO hlwtest (`active`, `year`, `call`, `name`, `dxcc`, `continent`, `category`, `qso`, `points`, `mults`, `score`, `logfile`, `ip`, `date_added`) 
		VALUES (0, '$year', '$dx', '$name', '$dxcc', '$continent', '$category', '$qso', '$points', '$mults', '$score', '$logfile', '$ip', now())";
		$result = mysqli_query($GLOBALS["___mysqli_ston"], $query);		
		if($result){
			echo json_encode(array('success' => true, 'msg' => 'Thanks for uploading your log. '. $email. "/". $qso. "/" . $category. "/". $timestamp. "/" . $filename. "/".$dx."/".$name."/".$continent. "/" . $dxcc. "/" . $contest));
		} else {
			die(json_encode(array('success' => false, 'msg' => 'Error insert log into DB. '. mysqli_error($GLOBALS["___mysqli_ston"]))));
		}
		
		$to = $email.";4x6hp@iarc.org;4z4kx@iarc.org;gilifon@gmail.com";
		//$to = $email."4x6hp@iarc.org";
		$from = "info@iarc.org";
		$subject = "Holyland Contest Log ".$dx;
		$headers = 'From: '.$from. "\r\n";
		$headers .= 'MIME-Version: 1.0' . "\r\n";
		$headers .= 'Content-type: text/html; charset=utf-8' . "\r\n";
		$message = "<p>Dear $dx,</p> 
					<p>We just got Your HC-$year log.<br>
					Thank You very much for Your participation in the Holyland Contest-$year!
					</p>
					<p>
					<ul>
					<li>Call: <strong>$dx</strong></li>
					<li>DXCC: <strong>$dxcc</strong></li>
					<li>Category: <strong>$category</strong></li>
					<li>QSO: <strong>$qso</strong></li>
					<li>uniq: <strong>$timestamp</strong></li>
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
					A1-OP, FOC-1782, HSC-1781, CWops-368, 5BDXCC, HONOR ROLL #1";
		mail($to, $subject, $message, $headers);
	}

	
//finally, return a message to the user
//echo json_encode('Thanks for uploading your log. '. $email. "/" . $category. "/". $timestamp. "/" . $filename. "/" . $dx. "/" . $continent. "/" . $dxcc. "/" . $contest);
//echo json_encode(array('success' => true, 'msg' => 'Thanks for uploading your log. '. $email. "/" . $category. "/". $timestamp. "/" . $filename. "/" . $dx. "/" . $continent. "/" . $dxcc. "/" . $contest));
?>