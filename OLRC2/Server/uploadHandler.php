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
// files
else if ($dir === "files")
{
	$upload_dir = '././Content/files/';
	//$valid_extensions = array('adi', 'txt', 'cabrillo.txt', 'log', 'cbr');
}
// not files
else 
{
	echo json_encode(array('success' => false, 'msg' => $Upload->getErrorMsg()));
	return;
}

$Upload = new FileUpload('uploadfile');
$ext = $Upload->getExtension(); // Get the extension of the uploaded file
$time = time();
$Upload->newFileName = $time.'.'.$ext;
//$result = $Upload->handleUpload($upload_dir, $valid_extensions);
$result = $Upload->handleUpload($upload_dir);

if (!$result) {
    echo json_encode(array('success' => false, 'msg' => $Upload->getErrorMsg()));   
} else {
    echo json_encode(array('success' => true, 'file' => $Upload->getFileName(), 'timestamp' => $time));
}
?>