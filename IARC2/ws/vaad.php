<?
include ("db_logbook.inc");
include('error.inc');
ini_set('display_errors',1);
error_reporting(E_ALL);

//header("Content-type: application/json; charset=utf-8");
header('Content-type: application/json');
$vaad=array('4Z1AB','4Z1VC','4X1JT','4X6HP','4Z1IW','4Z5SL','4Z4KX','4Z1WS'); 
$vaad_bikoret=array('4X1TI','4X1FG'); 
$vaad_haverim=array('4Z1PF','4Z5OK','4X4PA'); 

$vaad_in = "'" . implode("','",$vaad) . "'";
$vaad_bikoret_in = "'" . implode("','",$vaad_bikoret) . "'";
$vaad_haverim_in = "'" . implode("','",$vaad_haverim) . "'";

echo '{"aguda":';
echo "<br>";

$result = mysql_query("select `call`, name_heb, family_heb, cel, email from members WHERE `call` IN ($vaad_in)");
while($obj = mysql_fetch_object($result)) {
$json_vaad[] = $obj;
}
echo '{"vaad":'.json_encode($json_vaad, JSON_UNESCAPED_UNICODE).'}';
echo "<br>";

$result = mysql_query("select `call`, name_heb, family_heb, cel, email from members WHERE `call` IN ($vaad_bikoret_in)");
while($obj = mysql_fetch_object($result)) {
$json_vaad_bikoret[] = $obj;
}
echo '{"vaad_bikoret":'.json_encode($json_vaad_bikoret, JSON_UNESCAPED_UNICODE).'}';
echo "<br>";

$result = mysql_query("select `call`, name_heb, family_heb, cel, email from members WHERE `call` IN ($vaad_haverim_in)");
while($obj = mysql_fetch_object($result)) {
$json_vaad_haverim[] = $obj;
}
echo '{"vaad_haverim":'.json_encode($json_vaad_haverim, JSON_UNESCAPED_UNICODE).'}';
echo "<br>";

echo "}";
/////////////////////////////////////////////////

?>