<?
include ("db_web.inc");
include('error.inc');
ini_set('display_errors',1);
error_reporting(E_ALL);

//header("Content-type: application/json; charset=utf-8");
header('Content-type: application/json');

$result = mysqli_query($Link,"select `amount`, `don`, `mem`, `call` from SKF order by ID");
while($obj = mysqli_fetch_object($result)) {
$res[] = $obj;
}
//echo '{"skf":'.json_encode($res, JSON_UNESCAPED_UNICODE).'}';
header('Content-type: application/json');
echo json_encode($res);

?>