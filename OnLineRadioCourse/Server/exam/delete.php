<?php 
include_once "../connect_db.php";

if (include "../isauthorized.php")
{
    $exam = $_POST["exam"];
    header('Content-type: application/json');

    $sql="DELETE FROM `exams` WHERE `id`= $exam[id]";
    if (!mysqli_query($link, $sql))
    {
        echo json_encode('Error in delete: ' . mysqli_error($link));
        mysqli_close($link);
        return;
    }
    $sql="UPDATE `exams` SET `order`=`order`-1 where `id` > $exam[id]";
    if (!mysqli_query($link, $sql))
    {
        echo json_encode('Error in order update: ' . mysqli_error($link));
        mysqli_close($link);
        return;
    }
    $sql="INSERT INTO `audit` (`username`, `tab`, `operation`) VALUES ('$name','exam','delete')";
    mysqli_query($link, $sql);
    mysqli_close($link);
    echo json_encode('The exam has been deleted');
}
else
{
    header('HTTP/1.1 401 Unauthorized', true, 401);
    $res = array('isAuthorized'=>false, 'error'=>'you are not authorized');
    echo json_encode($res);
    mysqli_close($link);
}
?> 
