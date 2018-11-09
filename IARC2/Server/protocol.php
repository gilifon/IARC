<?
include ("db_logbook.inc");
include('error.inc');
ini_set('display_errors',1);
error_reporting(E_ALL);
$loc = setlocale(LC_ALL, 'he_IL.utf-8');

$res = array();

foreach (glob("/home1/iarcorg/public_html/site/Content/protocols/*.pdf") as $filename) {	
	$shortname = basename($filename);
	$url = 'http://iarc.org/site/Content/protocols/' . $shortname;
	$filename = basename($filename,".pdf");
	$y = substr($filename, 9, 4);
	$m = substr($filename, 13, 2);
	$vol = "$m/01/$y";	
	$vol = strftime("%B %Y", strtotime($vol));
	$res[] = array('url'=>$url,'date'=>$vol);
}
header('Content-type: application/json');
echo json_encode($res);

// echo '{"protocol":[';
	// foreach (glob("/home1/iarcorg/public_html/site/downloads/protocols/*.pdf") as $filename) {	
    // $shortname = basename($filename);
	// $filename = basename($filename,".pdf");
	// $y = substr($filename, 9, 4);
	// $m = substr($filename, 13, 2);
	// $vol = "$m/01/$y";	
	// $vol = strftime("%B %Y", strtotime($vol));
	// echo '{"url":"http://iarc.org/site/downloads/protocols/' . $shortname . '","date":"' . $vol . '"}';
	// echo ',';
	// }	
// echo ']}';
?>