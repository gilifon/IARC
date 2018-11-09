<?
session_start();
include("db_logbook.inc");
include('error.inc');
ini_set('display_errors', 1);
header('Content-type: application/json');

if(isset($_GET['ws_l'])){$ws_l = $_GET['ws_l'];}else{$ws_l = '';}
if(isset($_GET['ws_p'])){$ws_p = $_GET['ws_p'];}else{$ws_p = '';}	
if(isset($_GET['q'])){$q = $_GET['q'];}else{$q = '';}
if(isset($_GET['action'])){$action = $_GET['action'];}else{$action = '';}

$year = date("Y");	
$username = mysqli_real_escape_string($GLOBALS["___mysqli_ston"], $ws_l);
$password = mysqli_real_escape_string($GLOBALS["___mysqli_ston"], $ws_p);

$sql = "SELECT uniq, `call` FROM mem_data WHERE `call` = '$username' and password = MD5('$password')";
$res = mysqli_query($GLOBALS["___mysqli_ston"], $sql);
$num_rows = mysqli_num_rows($res);
if ($num_rows == 1){
	while($obj = mysqli_fetch_array($res,  MYSQLI_ASSOC)) {
		$_SESSION['ws_login'] = $obj['call'];
		$_SESSION['ws_id'] = $obj['uniq'];
	}
		
	if ($action==1){	
		//$sql = "select uniq, `call`, name_heb, family_heb, name_eng, family_eng, pic, email, email_fwd, tel, cel, `$year` as year FROM members WHERE `call` = '$q'";
		$sql = "select uniq, `call` FROM mem_data WHERE `call` = '$q'";
		$result = mysqli_query($GLOBALS["___mysqli_ston"], $sql);
		if (mysqli_num_rows($result) == 1){
			while($obj = mysqli_fetch_assoc($result)) {
				$data[] = $obj;
			}
			echo json_encode($data);
			//echo print_r($data);
			exit;
		}
		else {
			echo '{"uniq":"no data"}';
			exit;
		}
	}
}
else {
	echo '{"uniq":"error"}';		
exit;
}
?>
