<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="UTF-8">
<title>שליחה</title>
</head>
    <body>
    <font face="Arial">
<?php
ini_set('display_errors',1);
error_reporting(E_ALL);

/* 
// array with filenames to be sent as attachment
$files = array("file_1.ext","file_2.ext","file_3.ext",......);
 
// email fields: to, from, subject, and so on
$to = "mail@mail.com";
$from = "mail@mail.com"; 
$subject ="My subject"; 
$message = "My message";
$headers = "From: $from";
 */
 
 $timestamp = time();
 $ID = "316937416";
 $firstname = "יולי";
 $lastname = "קפלן";
 

/*************************** Generate new CSV file *******************/
//setlocale(LC_ALL, 'he_IL');
$upload_dir_csv = __DIR__.'/../members/test/';
$csvString = $firstname.",".$lastname.",".$ID; // Set the csv as a string
$isEncoding = mb_detect_encoding($csvString);
echo "ENCODING: ".$isEncoding;
//$csvString = iconv($isEncoding, "Windows-1255//IGNORE", $csvString);
//$csvString = mb_convert_encoding($csvString, 'ISO-8859-8', 'UTF-8');

$csv_handler = fopen ($upload_dir_csv.$timestamp.'.csv','w');
fwrite ($csv_handler,$csvString);
fclose ($csv_handler);
/**************************/

$file_csv = __DIR__.'/../members/test/'.$timestamp.'.csv';
$file_pdf = __DIR__.'/../members/applications/1410381989.pdf';
$file_img = __DIR__.'/../members/images/1410381989.jpg';
$file_rcp = __DIR__.'/../members/payments/1410381989.jpg';

//$to = "4x6hp@iarc.org; 4z5sl@iarc.org; 4z5sm@iarc.org; gill@shamir.co.il; yulik@ifn-solutions.com";
$to = "4x6hp@iarc.org;yulik@ifn-solutions.com";
$from = "info@iarc.org"; 
$subject ="TEST TEST TEST בקשת הצטרפות עבור: $firstname $lastname, $ID TEST TEST TEST"; 
//$subject = '=?UTF-8?B?'.base64_encode($subject).'?=';
$message = "דני, האם יש עברית בכל מקום?";
$headers = "From: $from";

$files = array($file_pdf, $file_csv, $file_img, $file_rcp);
$files_names = array($ID."_טופס".".pdf", $ID."_מיפתוח".".csv", $ID."_תמונה".".jpg", $ID."_קבלה".".jpg");

// boundary 
$semi_rand = md5(time()); 
$mime_boundary = "==Multipart_Boundary_x{$semi_rand}x"; 
 
// headers for attachment 
$headers .= "\nMIME-Version: 1.0\n" . "Content-Type: multipart/mixed;\n" . " boundary=\"{$mime_boundary}\""; 
 
// multipart boundary 
$message = "This is a multi-part message in MIME format.\n\n" . "--{$mime_boundary}\n" . "Content-Type: text/html; charset=UTF-8"."\r\n" . $message . "\n\n"; 
$message .= "--{$mime_boundary}\n";
 
// preparing attachments
for($x=0;$x<count($files);$x++){
    $file = fopen($files[$x],"rb");
    $data = fread($file,filesize($files[$x]));
    fclose($file);
    $data = chunk_split(base64_encode($data));
    $message .= "Content-Type: {\"application/octet-stream\"};\n" . " name=\"$files[$x]\"\n" . 
    "Content-Disposition: attachment;\n" . " filename=\"$files_names[$x]\"\n" . 
    "Content-Transfer-Encoding: base64\n\n" . $data . "\n\n";
    $message .= "--{$mime_boundary}\n";
}
 
// send
 
$ok = @mail($to, $subject, $message, $headers); 
if ($ok) { 
    echo "<p>mail sent to $to!</p>"; 
} else { 
    echo "<p>mail could not be sent!</p>"; 
} 
 
?>
</body>
</html>