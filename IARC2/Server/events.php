<?
include ("db_web.inc");
include('error.inc');
ini_set('display_errors',1);
error_reporting(E_ALL);

header('Content-type: application/json');


$result = mysqli_query($Link,"SELECT * FROM `events` where `is_active` = true ORDER BY `id` DESC");
while($obj = mysqli_fetch_object($result)) {
$res[] = $obj;
}

header('Content-type: application/json');
echo json_encode($res);
?>