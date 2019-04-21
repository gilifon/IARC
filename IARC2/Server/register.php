<?php 
include ("db_logbook.inc");
include('error.inc');
ini_set('display_errors',1);
error_reporting(E_ALL);
header('Content-type: application/json');

$isDebug = false;
$insertdb = "NOT OK";

//get the POST variable
$info = $_POST["info"];

//extract all the properties of the registration request
if(isset($info['firstname'])){$firstname = mysqli_real_escape_string($GLOBALS["___mysqli_ston"], $info['firstname']);}else{$firstname = '';}
if(isset($info['lastname'])){$lastname = mysqli_real_escape_string($GLOBALS["___mysqli_ston"], $info['lastname']);}else{$lastname = '';}
if(isset($info['efirstname'])){$efirstname = mysqli_real_escape_string($GLOBALS["___mysqli_ston"], ucwords($info['efirstname']));}else{$efirstname = '';}
if(isset($info['elastname'])){$elastname = mysqli_real_escape_string($GLOBALS["___mysqli_ston"], ucwords($info['elastname']));}else{$elastname = '';}
if(isset($info['email'])){$email = $info['email'];}else{$email = '';}
if(isset($info['licensenum'])){$licensenum = $info['licensenum'];}else{$licensenum = '';}
if(isset($info['callsign'])){$callsign = strtoupper($info['callsign']);}else{$callsign = '';}
if(isset($info['birthdate'])){$birthdate = $info['birthdate'];}else{$birthdate = '';}
if(isset($info['id'])){$id = $info['id'];}else{$id = '';}
if(isset($info['country'])){$country = $info['country'];}else{$country = '';}
if(isset($info['gender'])){$gender = $info['gender'];}else{$gender = '';}
if(isset($info['city'])){$city = $info['city'];}else{$city = '';}
if(isset($info['address'])){$address = $info['address'];}else{$address = '';}
if(isset($info['house'])){$house = $info['house'];}else{$house = '';}
if(isset($info['zip'])){$zip = $info['zip'];}else{$zip = '';}
if(isset($info['phone'])){$phone = $info['phone'];}else{$phone = '';}
if(isset($info['mobile'])){$mobile = $info['mobile'];}else{$mobile = '';}
if(isset($info['reason'])){$reason = mysqli_real_escape_string($GLOBALS["___mysqli_ston"], $info['reason']);}else{$reason = '';}
if(isset($info['cv'])){$cv = mysqli_real_escape_string($GLOBALS["___mysqli_ston"], $info['cv']);}else{$cv = '';}
if(isset($info['filename'])){$filename = $info['filename'];}else{$filename = '';}
if(isset($info['paymentfilename'])){$paymentfilename = $info['paymentfilename'];}else{$paymentfilename = '';}
if(isset($info['timestamp'])){$timestamp = $info['timestamp'];}else{$timestamp = '';}



//////////////////////////////////////////
//Create the pdf file and insert the data into the DB
$birthdate = strtotime($birthdate);
$birthdate = date('Y-m-d',$birthdate);
$ID_pdf = $timestamp.".pdf";
$today = date("j F Y");
$today = strftime("%e %B %Y", strtotime($today));
$ip = $_SERVER['REMOTE_ADDR'];
$process = $_SERVER['HTTP_USER_AGENT'];
$sendermail = "info@iarc.org";
$uniq = $timestamp;

if (!empty($filename))
{
	$upload_dir = '../../members/images/';
	$fp = fopen($upload_dir.$filename, "r") or die(json_encode("Couln't open file"));
	$imgData = addslashes (file_get_contents($upload_dir.$filename));
	//var_dump($imgData);
	fclose($fp);
}
else 
{
	$imgData = null;
}

if (!empty($house))
{
	$apart_pdf = "דירה $house";
}
else
{
	$apart_pdf = "";
}


/************************* Save to DB ***************************************/

if (!$isDebug)
{
	$sql = "INSERT INTO membership (timestamp, country, pic, pic_ext, pdf, name_heb, family_heb, name_eng, family_eng, `call`, moc_id, ID, dob, gender, city, address, apart, zipcode, tel, cel, email_fwd, date_added, reason, cv, ip, process) 
	VALUES ('$timestamp', '$country', '$imgData', '$filename',' ', '$firstname','$lastname', '$efirstname', '$elastname', '$callsign', '$licensenum', '$id', '$birthdate', '$gender', '$city', '$address', '$house', '$zip', '$phone', '$mobile', '$email', now(), '$reason', '$cv', '$ip', '$process')";
	$result = mysqli_query($GLOBALS["___mysqli_ston"], $sql);
	if ($result){$insertdb = "OK";} else {$insertdb = "NOT OK ".mysqli_error($GLOBALS["___mysqli_ston"]);}
}
/**************************************************************************/

/***************************** Generate PDF file ***************************************/
include ("vendor/autoload.php");

$html ='
<html>
<body>
<br/>
<br/>
<br/>
<br/>
<br/>
<br/>
<br/>
<br/>
<b>בקשה להתקבל כחבר</b><br>
(שאלון למועמד)
</p>
<div>אני הח"מ, <i>'.$firstname.' '.$lastname.'</i>, ת"ז <i>'.$id.'</i>, תאריך לידה <i>'.$birthdate.'</i><br>
כתובת: <i>'.$city.' '.$address.' '.$apart_pdf.'</i> מיקוד: <i>'.$zip.'</i><br>
טלפון: <i>'.$phone.'</i><br>
פלאפון: <i>'.$mobile.'</i><br>
אזרחות: <i>'.$country.'</i><br>
אות קריאה: <i><span dir="ltr">'.$callsign.'</span></i></div>
דואל: <i>'.$email.'</i><br>
<div><b>מבקש להתקבל כחבר באגודתכם</b></div>

<div><b>א. סיבות להגשת הבקשה:</b><br>
<i>'.$reason.'</i><br>
</div>
<div><b>ב. קורות חיים:</b><br>
<i>'.$cv.'</i>
</div>
<div><b>ד. תנאים והגבלות:</b><br>
1. בקשות של מועמדים יובאו בפני ועדת חברים של האגודה אשר תדון בבקשתם. הוועדה שומרת לעצמה 
את הזכות לזמן את המועמד לראיון אישי.<br>
2. אגודת חובבי הרדיו בישראל אינה מתחייבת לקבל את המועמד וכן שומרת לעצמה את הזכות שלא 
לפרט בפני המועמד את הסיבות לאי קבלתו כחבר באגודה.
</div>
<div><b>ה. הצהרת המועמד</b><br>
אני מצהיר בזאת שקראתי את סעיף ד תנאים והגבלות, הבנתי את תוכן הסעיפים השונים ואת 
כוונתם ואני מקבל ומסכים עם האמור.
</div>
<div>
<br>
<b>חתימת המועמד</b>.......................................<span align="center"><b>תאריך </b><i>'.$today.'</i></span>
</div>
<div>
מזהה בקשה: <i>'.$uniq.'</i><br>
סטאטוס: <i>'.$insertdb.'</i><br>

</div>
</body>
</html>
';

$mpdf = new \Mpdf\Mpdf(['mode' => 'utf-8','default_font_size' => 9, 'default_font' => 'dejavusans']);

$mpdf->SetImportUse();
$mpdf->AddPage();
$pagecount = $mpdf->SetSourceFile('template.pdf');
$tplId = $mpdf->ImportPage($pagecount);
if (!empty($filename)) $mpdf->SetWatermarkImage($upload_dir.$filename, 1, array(35,45), array(15,55));
$mpdf->showWatermarkImage = true;
$mpdf->UseTemplate($tplId);
$mpdf->SetDirectionality('rtl');
$mpdf->WriteHTML($html);
$mpdf->Output("../../members/applications/".$ID_pdf,"F");
/***************************************************************************/

/***************************** Generate new CSV file ***********************/
$upload_dir_csv = '../../members/csv/';
$csvString = $firstname.",".$efirstname.",".$lastname.",".$elastname.",".$id.",".$birthdate.",".$phone.",".$mobile.",".$email.",".$city.",".$address.",".$apart_pdf.",,".$zip; // Set the csv as a string
$csv_handler = fopen ($upload_dir_csv.$timestamp.'.csv','w');
fwrite ($csv_handler,$csvString);
fclose ($csv_handler);
/**************************************************************************/


/*****************  New send mail with all attachments  *******************/
$file_pdf = '../../members/applications/'.$ID_pdf;
$file_csv = '../../members/csv/'.$timestamp.'.csv';
$file_img = '../../members/images/'.$filename;
$file_rcp = '../../members/payments/'.$paymentfilename;

//$file_img_ext = substr($file_img, -3);
//$file_rcp_ext = substr($file_rcp, -3);

$to = "gilifon@gmail.com,4z5sl@iarc.org,".$email;
if ($isDebug) $to = "gilifon@gmail.com";

$files = array();
$files[0]= $file_csv;
$files[1]= $file_pdf;
$files[2]= $file_img;
$files[3]= $file_rcp;

// email fields: to, from, subject, and so on
$from = "IARC <".$sendermail.">"; 
$subject = "טפסי בקשה עבור: $id"; 
	
//$message = date("Y.m.d H:i:s")."\n".count($files)." בתהליך\n";
$headers = "From: $from";

// boundary 
	
$semi_rand = md5(time()); 
$mime_boundary = "==Multipart_Boundary_x{$semi_rand}x"; 

// headers for attachment 
$headers .= "\nMIME-Version: 1.0\n" . "Content-Type: multipart/mixed;\n" . " boundary=\"{$mime_boundary}\""; 

// multipart boundary 
$message = "--{$mime_boundary}\n" . "Content-Type: text/; charset=\"UTF-8\"\n" .
"Content-Transfer-Encoding: 8bit\n" . $csvString . "\n\n"; 
	
// preparing attachments
for($i=0;$i<count($files);$i++)
{
    if(is_file($files[$i]))
	{
        $message .= "--{$mime_boundary}\n";
        $fp = @fopen($files[$i],"rb");
		$data = @fread($fp,filesize($files[$i]));
		@fclose($fp);
        $data = chunk_split(base64_encode($data));
        $message .= "Content-Type: application/octet-stream; name=\"".basename($files[$i])."\"\n" . 
        "Content-Description: ".basename($files[$i])."\n" .
        "Content-Disposition: attachment;\n" . " filename=\"".basename($files[$i])."\"; size=".filesize($files[$i]).";\n" . 
        "Content-Transfer-Encoding: base64\n\n" . $data . "\n\n";
    }
}
$message .= "--{$mime_boundary}--";
$returnpath = "-f" . $sendermail;
	
$ok = @mail($to, $subject, $message, $headers, $returnpath); 

if ($isDebug)
{
	if ($ok) 
	{ 
		echo json_encode('Your request has been successfully sent'); 
	} 
	else 
	{ 
		echo json_encode('Your request has been not sent!!'); 
	}
	return;
}
/***********************************************************************/

//finally, return a message to the user
echo json_encode('Your request has been successfully processed');
return;
?> 