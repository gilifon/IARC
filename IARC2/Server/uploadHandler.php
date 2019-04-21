<?php
require('Uploader.php');
//try to get the directory from the request
$dir = htmlspecialchars($_GET["dir"]);
//if it is null
if($dir === null || $dir==="") 
{
	echo json_encode(array('success' => false, 'msg' => $Upload->getErrorMsg()));
	return;
}
// log
else if ($dir === "log")
{
	$upload_dir = './log_uploads/';
	$valid_extensions = array('txt', 'cabrillo.txt', 'log', 'cbr');
}
// img
else if ($dir === "img")
{
	$upload_dir = '../../members/images/';
	$valid_extensions = array('gif', 'png', 'jpeg', 'jpg');
}
else if ($dir === "payment")
{
	$upload_dir = '../../members/payments/';
	$valid_extensions = array('gif', 'png', 'jpeg', 'jpg');
}
// not log or img -> error
else 
{
	echo json_encode(array('success' => false, 'msg' => $Upload->getErrorMsg()));
	return;
}

$Upload = new FileUpload('uploadfile');
$ext = $Upload->getExtension(); // Get the extension of the uploaded file
$time = time();
$Upload->newFileName = $time.'.'.$ext;
$result = $Upload->handleUpload($upload_dir, $valid_extensions);

if (!$result) {
    echo json_encode(array('success' => false, 'msg' => $Upload->getErrorMsg()));   
} else {
    echo json_encode(array('success' => true, 'file' => $Upload->getFileName(), 'timestamp' => $time));
}
?>