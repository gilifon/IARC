<?
include ("db_web.inc");
include('error.inc');
ini_set('display_errors',1);
error_reporting(E_ALL);

$result = mysqli_query($Link,"SELECT sum(amount) s from SKF;");
echo $result->fetch_assoc()['s'];
?>