<?
include ("db_web.inc");
include('error.inc');
ini_set('display_errors',1);
error_reporting(E_ALL);

header('Content-type: application/json');
$result = mysqli_query($Link,"select * from event_registration where `event_id` = 1 order by id");
while($obj = mysqli_fetch_object($result)) {
$res[] = $obj;
}
echo json_encode($res);
?>