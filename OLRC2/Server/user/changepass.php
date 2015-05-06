<?php 
include_once "../connect_db.php";

if (include '../isauthorized.php')
{
    header('Content-type: application/json');

    //get the encoded value
     $authorization = base64_decode($_POST["authorization"]);
     $userpass = explode(":", $authorization);
 
    $username = $userpass[0];
    $md5oldpw = md5(preg_replace("[^A-Za-z0-9]", "", $userpass[1]));
    $md5newpw = md5(preg_replace("[^A-Za-z0-9]", "", $userpass[2]));
 
 
 
    //$username = $_POST["username"];
    //$md5oldpw = md5(preg_replace("[^A-Za-z0-9]", "", $_POST['oldpw']));
    //$md5newpw = md5(preg_replace("[^A-Za-z0-9]", "", $_POST['newpw']));

    $sql="UPDATE `members` SET `password`='$md5newpw' WHERE `username`='$username' and `password` = '$md5oldpw'";
    if (!mysqli_query($link, $sql))
    {
        $err = mysqli_error($link);
        if (strpos($err, 'Duplicate entry') !== FALSE)
            echo json_encode(array('status' => 2, 'msg' => 'The selected username already exist'));
        else
            echo json_encode(array('status' => 2, 'msg' => 'Error: ' . mysqli_error($link)));
            mysqli_close($link);
        return;
    }
    $sql="INSERT INTO `audit` (`username`, `tab`, `operation`) VALUES ('$name','user','changepass')";
    mysqli_query($link, $sql);
    mysqli_close($link);
    echo json_encode(array('status' => 0, 'msg' => 'The password has been updated'));
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
