<?
include ("db_web.inc");
include('error.inc');
ini_set('display_errors',1);
error_reporting(E_ALL);

//header("Content-type: application/json; charset=utf-8");
header('Content-type: application/json');

$result = mysql_query("select year, `call`, `continent`, `category`, `qso`, `points`, `mults`, `score`, `operator` from hlwtest where active = 1  and `dxcc` = 'Israel'  order by year, `category` DESC, `score` DESC") or die('Error: ' . mysql_error());
while($obj = mysql_fetch_object($result)) {
$res[] = $obj;
}
//echo '{"hlworld":'.json_encode($res, JSON_UNESCAPED_UNICODE).'}';
header('Content-type: application/json');
echo json_encode($res);

?>