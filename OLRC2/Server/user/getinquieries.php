<?php 
include_once "../connect_db.php";
$users = array();

if (include '../isauthorized.php')
{   
    $sql = mysqli_query($link, "SELECT * FROM `inquiries` order by `timestamp` desc"); 
    //$sql = mysqli_query($link, "SELECT * FROM `inquiries` order by `firstname`");
    $count_check = mysqli_num_rows($sql);
    if($count_check > 0)
    {
        while($row = mysqli_fetch_array($sql))
        {
            $id = $row["id"];
            $name = $row["name"];
            $phone = $row["phone"];
            $mail = $row["mail"];
            $timestamp = $row["timestamp"];
            
            $users[] = array('id'=>$id, 'name'=>$name, 'phone'=>$phone, 'mail'=>$mail, 'timestamp'=>$timestamp);
        }
    } 

    mysqli_close($link);
    header('Content-type: application/json');
    echo json_encode($users);
}
else
{
    header('HTTP/1.1 401 Unauthorized', true, 401);
    $res = array('isAuthorized'=>false, 'error'=>'you are not authorized');
    echo json_encode($res);
    mysqli_close($link);
}
?> 

