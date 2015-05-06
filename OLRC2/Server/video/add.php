<?php 
include_once "../connect_db.php";

if (include "../isauthorized.php")
{
    $newvideo = $_POST["newvideo"];
    header('Content-type: application/json');

    $temp = mysqli_query($link, "SELECT MAX(`order`) as mo FROM `videos` ");
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

    $sql="INSERT INTO `videos` (`url`, `caption`, `order`) VALUES ('$newvideo[t]','$newvideo[d]',$result[mo]+1)";
    if (!mysqli_query($link, $sql))
    {
        echo json_encode('Error2: ' . mysqli_error($link));
        mysqli_close($link);
        return;
    }
    $sql="INSERT INTO `audit` (`username`, `tab`, `operation`) VALUES ('$name','video','add')";
    mysqli_query($link, $sql);
    mysqli_close($link);
    echo json_encode('The new file has been added. Good job!');
}
else
{
    header('HTTP/1.1 401 Unauthorized', true, 401);
    $res = array('isAuthorized'=>false, 'error'=>'you are not authorized');
    echo json_encode($res);
    mysqli_close($link);
}
?> 
