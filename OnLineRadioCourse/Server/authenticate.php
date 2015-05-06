<?php

include_once "connect_db.php";
if (include 'isauthorized.php')
{
    $sql = mysqli_query($link, "SELECT * FROM members WHERE username='$name' AND password='$md5password' AND isactive='1'"); 
    while($row = mysqli_fetch_array($sql))
    {
        $id = $row["id"];
        $username = $row["username"];
        $firstname = $row["firstname"];
        $lastname = $row["lastname"];
        $email = $row["email"];
        $isadmin = $row["isadmin"];
        $course = $row["course"];
        $role = $row["role"];
            
        mysqli_query($link, "UPDATE members SET lastlogin=now() WHERE id='$id'");
            
        header("Content-type: application/json");
        $res = array('isAuthorized'=>true, 'id'=>$id,'username'=>$username,'firstname'=>$firstname,'lastname'=>$lastname,'email'=>$email,'isadmin'=>$isadmin,'role'=>$role,'course'=>$course);
    }
}
else 
{
    header('HTTP/1.1 401 Unauthorized', true, 401);
    $res = array('isAuthorized'=>false, 'error'=>'login failed');
}
mysqli_close($link);
echo json_encode($res);
return;
?> 