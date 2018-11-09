<?
include ("db_logbook.inc");
include('error.inc');
ini_set('display_errors',1);
error_reporting(E_ALL);

$result = mysql_query("SELECT sum(amount) from SKF;");
echo mysql_result($result, 0);
?>