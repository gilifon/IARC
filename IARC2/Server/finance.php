<?
include ("db_web.inc");
include('error.inc');
ini_set('display_errors',1);
error_reporting(E_ALL);
$loc = setlocale(LC_ALL, 'he_IL.utf-8');

$res = array();

foreach (glob("C:\wamp64\www\iarc\Content\finance\*.pdf") as $filename) {	
	$shortname = basename($filename);
	$url = 'http://www.iarc.team/iarc/Content/finance/' . $shortname;
	$filename = basename($filename,".pdf");
	$y = substr($filename, 8, 4);
	//$m = substr($filename, 11, 2);
	//$vol = "$m/01/$y";	
	//$vol = strftime("%B %Y", strtotime($vol));
	//$res[] = array('url'=>$url,'date'=>$vol);
	$res[] = array('url'=>$url,'date'=>$y);
}
header('Content-type: application/json');
echo json_encode($res);

// echo '{"annual":[';
	// foreach (glob("C:\wamp64\www\iarc\Content\annual\*.pdf") as $filename) {	
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