<?
include ("db_web.inc");
include('error.inc');
ini_set('display_errors',1);
error_reporting(E_ALL);

header('Content-type: application/json');

$result = mysqli_query($GLOBALS["___mysqli_ston"], "select uniq, parit as name, description, price, image from shop");
while($obj = mysqli_fetch_object($result)) {
$res[] = $obj;
}

header('Content-type: application/json');
echo json_encode($res);
?>