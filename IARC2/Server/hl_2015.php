<?
include ("db_web.inc");
include('error.inc');
ini_set('display_errors',1);
error_reporting(E_ALL);

//header("Content-type: application/json; charset=utf-8");
header('Content-type: application/json');
$year = date("Y");
//$result = mysql_query("select `call`, `continent`, `category`, `qso`, `points`, `mults`, `score`, `operator` from hlwtest where active = 0 and `year` = '2015' order by `call` DESC");
$result = mysqli_query($Link, "select `call`, `dxcc`, `continent`, `category` from hlwtest where active = 0 and `year` = '$year' order by `call` ASC");
while($obj = mysqli_fetch_object($result)) {
$res[] = $obj;
}
//echo '{"hlworld":'.json_encode($res, JSON_UNESCAPED_UNICODE).'}';
header('Content-type: application/json');
echo json_encode($res);

?>