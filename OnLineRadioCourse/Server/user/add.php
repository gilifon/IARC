<?php 
include_once "../connect_db.php";

if (include '../isauthorized.php')
{
    $newuser = $_POST["newuser"];
    header('Content-type: application/json');

    $md5password = md5(preg_replace("[^A-Za-z0-9]", "", $newuser['pw']));

    $sql="INSERT INTO `members`(`username`, `password`, `isactive`, `email`, `firstname`, `lastname`, `isadmin`, `role`, `course`) VALUES ('$newuser[un]','$md5password',1,'$newuser[em]','$newuser[fn]','$newuser[ln]',0,'$newuser[role]','$newuser[course]')";
    if (!mysqli_query($link, $sql))
    {
        $err = mysqli_error($link);
        if (strpos($err, 'Duplicate entry') !== FALSE)
            echo json_encode(array('status' => 2, 'msg' => 'The selected username already exist'));
        else
            echo json_encode(array('status' => 3, 'msg' => 'Error: ' . mysqli_error($link)));
            mysqli_close($link);
        return;
    }
    $sql="INSERT INTO `audit` (`username`, `tab`, `operation`) VALUES ('$name','user','add')";
    mysqli_query($link, $sql);
    mysqli_close($link);

    $to = $newuser[em];
    $subject = "קורס רדיו מקוון - אישור הרשמה";
    //$message = "שם המשתמש שלך הוא:$newuser[un] והסיסמה היא: $newuser[pw]";



    $message = '<html style="direction: rtl">';
     $message = '<head>';
    //$message = '<link href="//netdna.bootstrapcdn.com/bootstrap/3.0.0/css/bootstrap.min.css" rel="stylesheet">';
    $message = '<meta HTTP-EQUIV="content-type" CONTENT="text/html; charset=windows-1255" />';
    $message = "</head>";

    $message = "<body style='direction: rtl'>";
    $message .= '<table style="max-width: 100%; background-color: transparent; border-collapse: collapse; border-spacing: 0; margin-bottom: 20px; background-color: #cccccc;">';

    $message .= "<tr>";
    $message .= "<td style='-webkit-border-top-left-radius: 4px; border-top-left-radius: 4px; -moz-border-radius-topleft: 4px;'><strong>שם משתמש</strong> </td>";
    $message .= "<td style='-webkit-border-top-right-radius: 4px; border-top-right-radius: 4px; -moz-border-radius-topright: 4px;'>" . iconv('utf-8', 'windows-1255', $newuser[un]) . "</td>";
    $message .= "</tr>";

    $message .= "<tr><td><strong>סיסמה:</strong> </td><td>" . $newuser[pw] . "</td></tr>";

    $message .= "<tr>";
    $message .= "<td style='-webkit-border-bottom-left-radius: 4px; border-bottom-left-radius: 4px; -moz-border-radius-bottomleft: 4px;'><strong>לינק:</strong> </td>";
    $message .= "<td style='-webkit-border-bottom-right-radius: 4px; border-bottom-right-radius: 4px; -moz-border-radius-bottomright: 4px;'>http://www.iarc.org/lessons/</td>";
    $message .= "</tr>";
    $message .= "</table>";
    $message .= "</body>";
    $message .= "</html>";


    $from = "admin@iarc.org";
    $headers = "From:" . $from . "\r\n";
    $headers .= "Reply-To: admin@iarc.org\r\n"; 
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=ISO-8859-1\r\n";
    $headers .= 'Bcc: gilifon@gmail.com' . "\r\n";

    echo json_encode(array('status' => 0, 'msg' => 'The user has been added'));
    mail($to,$subject,$message,$headers);
    return;

}
else
{
    header('HTTP/1.1 401 Unauthorized', true, 401);
    $res = array('isAuthorized'=>false, 'error'=>'you are not authorized');
    echo json_encode($res);
    mysqli_close($link);
}
?> 
