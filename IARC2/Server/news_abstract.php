<?
include ("db_web.inc");
include('error.inc');
ini_set('display_errors',1);
error_reporting(E_ALL);

header('Content-type: application/json');

$result = mysql_query("SELECT * FROM `news` where `is_active` = true and `is_abstract` = true and `abstract` != '' ORDER BY `id` DESC LIMIT 0 , 2");
while($obj = mysql_fetch_object($result)) {
$res[] = $obj;
}

header('Content-type: application/json');
echo json_encode($res);
?>