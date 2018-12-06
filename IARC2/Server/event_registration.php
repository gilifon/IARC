<?
include ("db_web.inc");
include('error.inc');
ini_set('display_errors',1);
error_reporting(E_ALL);

header('Content-type: application/json');
$info = $_POST["info"];
$sql="INSERT IGNORE INTO `event_registration` (`name`,`callsign`,`email`,`event_id`) VALUES ('$info[name]','$info[callsign]','$info[email]','$info[event_id]')";
if (!mysqli_query($Link, $sql))
{
	echo json_encode('Error: Failed to register');
}
else
{
	echo json_encode('Thank you, 73!');
}
mysqli_close($Link);

?>