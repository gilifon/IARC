<?
include ("db_web.inc");
include('error.inc');
ini_set('display_errors',1);
error_reporting(E_ALL);

header('Content-type: application/json');
$info = $_POST["info"];
$sql="INSERT IGNORE INTO `event_registration` (`callsign`) VALUES ('$info[callsign]')";
if (!mysql_query($sql))
{
	echo json_encode('Error: Failed to register');
}
else
{
	echo json_encode('Thank you, 73!');
}
mysql_close($Link);

?>