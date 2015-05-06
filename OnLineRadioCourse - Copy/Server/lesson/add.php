<?php 
include_once "../connect_db.php";

if (include "../isauthorized.php")
{
    $newlesson = $_POST["newlesson"];
    header('Content-type: application/json');

    $temp = mysqli_query($link, "SELECT MAX(`order`) as mo FROM `lessons` ");
    if (!$temp) {
        echo json_encode('Error0: ' . mysqli_error($link));
        mysqli_close($link);
        return;
    }

    $result = mysqli_fetch_assoc($temp);
    if (!$result) {
        echo json_encode('Error1: ' . mysqli_error($link));
        mysqli_close($link);
        return;
    }

    $sql="INSERT INTO `lessons` (`url`, `caption`, `order`,`section`) VALUES ('$newlesson[t]','$newlesson[d]',$result[mo]+1,'$newlesson[s]')";
    if (!mysqli_query($link, $sql))
    {
        echo json_encode('Error2: ' . mysqli_error($link));
        mysqli_close($link);
        return;
    }
       
    ######################### Sending Email upon addition (move to an external function) ####################
    $emails = array();
    $sql = mysqli_query($link, "SELECT * FROM `members` order by `firstname`");
    $count_check = mysqli_num_rows($sql);
    if($count_check > 0)
    {
        while($row = mysqli_fetch_array($sql))
        {
            if ($row["notify"] == 1)
            {
                array_push($emails,$row["email"]);
            }
        }
    } 
    $to = implode(',', $emails);
    
    $from = "admin@iarc.org";
    $headers = "From:" . $from . "\r\n";
    $headers .= "Reply-To: admin@iarc.org\r\n"; 
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=ISO-8859-1\r\n";
    //$headers .= 'Bcc: gilifon@gmail.com' . "\r\n";
    mail($to,'A Lesson has been added',$newlesson[t].' - '.$newlesson[d],$headers);
    ###########################################################################################################
    
    $sql="INSERT INTO `audit` (`username`, `tab`, `operation`) VALUES ('$name','lesson','add')";
    mysqli_query($link, $sql);
    mysqli_close($link);
    echo json_encode('The new lesson has been added. Good job! ');
}
else
{
    header('HTTP/1.1 401 Unauthorized', true, 401);
    $res = array('isAuthorized'=>false, 'error'=>'you are not authorized');
    echo json_encode($res);
    mysqli_close($link);
}
?> 