<?php 
include_once "../connect_db.php";
$users = array();

if (include '../isauthorized.php')
{   
    $sql = mysqli_query($link, "SELECT * FROM `members` order by `lastlogin` desc"); 
    //$sql = mysqli_query($link, "SELECT * FROM `members` order by `firstname`");
    $count_check = mysqli_num_rows($sql);
    if($count_check > 0)
    {
        while($row = mysqli_fetch_array($sql))
        {
            $id = $row["id"];
            $username = $row["username"];
            $isactive = $row["isactive"];
            $email = $row["email"];
            $signupdate = $row["signupdate"];
            $lastlogin = $row["lastlogin"];
            $firstname = $row["firstname"];
            $lastname = $row["lastname"];
            $course = $row["course"];
            $isadmin = $row["isadmin"];
            
            $users[] = array('id'=>$id, 'username'=>$username, 'isactive'=>$isactive, 'email'=>$email, 'signupdate'=>$signupdate, 'lastlogin'=>$lastlogin, 'firstname'=>$firstname, 'lastname'=>$lastname, 'isadmin'=>$isadmin, 'course'=>$course);
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

