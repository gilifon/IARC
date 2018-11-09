<?
include ("db_web.inc");
include('error.inc');
ini_set('display_errors',1);
error_reporting(E_ALL);

header('Content-type: application/json');

//$sql = "select t1.uniq, t1.`call`, t1.type, t1.`text`, t1.price, t1.date_added, t2.`call`, t2.name_heb, t2.family_heb, t2.cel, t2.email FROM iarcorg_webdb.markolit t1 INNER JOIN iarcorg_members.members t2 where t1.`call` = t2.`call` and t1.active = '1' order by uniq DESC";
$sql = "SELECT
		iarcorg_webdb.markolit.uniq,
		iarcorg_members.mem_data.`call`,
		iarcorg_webdb.markolit.type,
		iarcorg_webdb.markolit.text,
		iarcorg_webdb.markolit.price,
		iarcorg_webdb.markolit.date_added,
		iarcorg_members.mem_data.name_heb,
		iarcorg_members.mem_data.family_heb,
		iarcorg_members.mem_data.cel,
		iarcorg_members.mem_data.email
	FROM
		iarcorg_webdb.markolit
	INNER JOIN iarcorg_members.mem_data ON iarcorg_webdb.markolit.uniq_mem = iarcorg_members.mem_data.uniq
	WHERE
		iarcorg_webdb.markolit.active = 1";

$result = mysqli_query($Link, $sql) or die(mysqli_error($Link));
$num_rows = mysqli_num_rows($result);
if ($num_rows > 0){
while($obj = mysqli_fetch_object($result)) {
$res[] = $obj;
}
}
else {
$res = array();
}

header('Content-type: application/json');
echo json_encode($res);
?>