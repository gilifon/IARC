<?
include ("db_logbook.inc");
include('error.inc');
ini_set('display_errors',1);
error_reporting(E_ALL);
$loc = setlocale(LC_ALL, 'he_IL.utf-8');

$res = array();

foreach (glob("/home1/iarcorg/public_html/site/Content/annual/*.pdf") as $filename) {	
	$shortname = basename($filename);
	$url = 'http://iarc.org/site/Content/annual/' . $shortname;
	$filename = basename($filename,".pdf");
	$y = substr($filename, 7, 4);
	//$m = substr($filename, 11, 2);
	//$vol = "$m/01/$y";	
	//$vol = strftime("%B %Y", strtotime($vol));
	//$res[] = array('url'=>$url,'date'=>$vol);
	$res[] = array('url'=>$url,'date'=>$y);
}
header('Content-type: application/json');
echo json_encode($res);

// echo '{"annual":[';
	// foreach (glob("/home1/iarcorg/public_html/site/downloads/annual/*.pdf") as $filename) {	
    // $shortname = basename($filename);
	// $filename = basename($filename,".pdf");
	// $y = substr($filename, 7, 4);
	// $m = substr($filename, 11, 2);
	// $vol = "$m/01/$y";	
	// $vol = strftime("%B %Y", strtotime($vol));
	// echo '{"url":"http://iarc.org/site/downloads/annual/' . $shortname . '","date":"' . $vol . '"}';
	// echo ',';
	// }	
// echo ']}';		
?>