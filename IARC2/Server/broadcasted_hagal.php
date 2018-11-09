<?
include ("db_web.inc");
include('error.inc');
ini_set('display_errors',1);
error_reporting(E_ALL);
$loc = setlocale(LC_ALL, 'he_IL.utf-8');

$res = array();

foreach (glob("C:\wamp64\www\iarc\Content\broadcasted_hagal\*.mp3") as $filename) {	
	$shortname = basename($filename);
	$url = 'http://www.iarc.team/iarc/Content/broadcasted_hagal/' . $shortname;
	$filename = basename($filename,".mp3");
	$y = substr($filename, 4, 4);
	$m = substr($filename, 2, 2);
	$d = substr($filename, 0, 2);
	$vol = "$m/$d/$y";	
	$vol = strftime("%B %d %Y", strtotime($vol));
	$res[] = array('url'=>$url,'date'=>$vol);
}
header('Content-type: application/json');
echo json_encode($res);

// echo '{"hagal":[';
	// foreach (glob("/home1/iarcorg/public_html/site/downloads/hagal/*.pdf") as $filename) {	
    // $shortname = basename($filename);
	// $filename = basename($filename,".pdf");
	// $y = substr($filename, 5, 4);
	// $m = substr($filename, 9, 2);
	// $vol = "$m/01/$y";	
	// $vol = strftime("%B %Y", strtotime($vol));
	// echo '{"url":"http://iarc.org/site/downloads/hagal/' . $shortname . '","date":"' . $vol . '"}';
	// echo ',';
	// }
// echo ']}';	
?>