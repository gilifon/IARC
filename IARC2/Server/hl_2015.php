<?
include ("db_holylanddb.inc");
include('error.inc');
ini_set('display_errors',1);
error_reporting(E_ALL);

//header("Content-type: application/json; charset=utf-8");
header('Content-type: application/json');
$year = date("Y");
//$result = mysql_query("select `call`, `continent`, `category`, `qso`, `points`, `mults`, `score`, `operator` from hlwtest where active = 0 and `year` = '2015' order by `call` DESC");
$res[] = "";
//$result = mysqli_query($Link, "select `callsign` as 'call', `dxcc`, `continent`, `category` from hlwtest where active = 0 and `year` = '$year' order by `call` ASC");
$result = mysqli_query($Link, "SELECT `callsign`,`category_op`,`category_mode`,`category_power`,`email`,`name`,`country`,`year`,`qsos`,`points`,`timestamp` FROM `participants` WHERE `year` = '$year' ORDER BY `callsign` ASC");

$res[] = [];
while($obj = mysqli_fetch_object($result)) {
$res[] = $obj;
}
//echo '{"hlworld":'.json_encode($res, JSON_UNESCAPED_UNICODE).'}';
header('Content-type: application/json');
echo json_encode($res);

?>