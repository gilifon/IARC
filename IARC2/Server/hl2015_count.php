<?
include ("db_web.inc");
include('error.inc');
ini_set('display_errors',1);
error_reporting(E_ALL);

$year = date("Y");
$result = mysqli_query($Link, "SELECT count(*) from hlwtest where `year` = '$year'");
echo mysqli_result($result,  0);
?>