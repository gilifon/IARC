<?php 
include_once "../connect_db.php";

if (include '../isauthorized.php')
{
    $newitem = $_POST["newlink"];
    header('Content-type: application/json');

    $temp = mysqli_query($link, "SELECT MAX(`order`) as mo FROM `links` ");
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

    $sql="INSERT INTO `links` (`url`, `caption`, `order`) VALUES ('$newitem[t]','$newitem[d]',$result[mo]+1)";
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
    $headers .= "Content-Type: text/html\r\n";
    //$headers .= 'Bcc: gilifon@gmail.com' . "\r\n";
    $body = 'A link has been added to the online course website (NOT attached here):<br/>'.$newitem['d'].'<br/> Please visite the online course<br/> http://iarc.org/lessons/#home';
    mail($to,'A link has been added',$body,$headers);
    ###########################################################################################################
    
    $sql="INSERT INTO `audit` (`username`, `tab`, `operation`) VALUES ('$name','link','add')";
    mysqli_query($link, $sql);
    mysqli_close($link);
    echo json_encode('The new link has been added. Good job!');

}
else
{
    header('HTTP/1.1 401 Unauthorized', true, 401);
        $res = array('isAuthorized'=>false, 'error'=>'you are not authorized');
        echo json_encode($res);
    mysqli_close($link);
}
?> 
