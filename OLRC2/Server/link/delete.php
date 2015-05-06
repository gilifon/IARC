<?php 
include_once "../connect_db.php";

if (include '../isauthorized.php')
{
    $item = $_POST["link"];
    header('Content-type: application/json');

    $sql="DELETE FROM `links` WHERE `id`= $item[id]";
    if (!mysqli_query($link, $sql))
    {
        echo json_encode('Error in delete: ' . mysqli_error($link));
        mysqli_close($link);
        return;
    }
    $sql="UPDATE `links` SET `order`=`order`-1 where `id` > $item[id]";
    if (!mysqli_query($link, $sql))
    {
        echo json_encode('Error in order update: ' . mysqli_error($link));
        mysqli_close($link);
        return;
    }
    $sql="INSERT INTO `audit` (`username`, `tab`, `operation`) VALUES ('$name','link','delete')";
    mysqli_query($link, $sql);
    mysqli_close($link);
    echo json_encode('The link has been deleted');

}
else
{
    header('HTTP/1.1 401 Unauthorized', true, 401);
        $res = array('isAuthorized'=>false, 'error'=>'you are not authorized');
        echo json_encode($res);
    mysqli_close($link);
}
?> 
