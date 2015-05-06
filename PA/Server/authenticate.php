<?php
/******************************************* Declare Functions *************************************/
///
///Parse the request headers
///
function request_headers()
{
    if(function_exists("apache_request_headers")) // If apache_request_headers() exists...
    {
        if($_headers = apache_request_headers()) // And works...
        {
            return $_headers; // Use it
        }
    }

    $_headers = array();

    foreach(array_keys($_SERVER) as $skey)
    {
        $_headers[$skey] = $_SERVER[$skey];
    }

    return $_headers;
}

///
///Check the database for the credentials
///
function isAuthorized()
{
    $headers = request_headers();
    $authorization = '';

    foreach ($headers as $header => $value) 
    {
        if (strtolower($header) == 'authorization' || strtolower($header) == 'http_authorization')
        {
        $authorization = base64_decode($value);
        }
    }
    if ($authorization != '')
    {
        $userpass = explode(":", $authorization);
        $name = $userpass[0];
        $pass = $userpass[1];
    
        $md5password = md5(preg_replace("[^A-Za-z0-9]", "", $pass));

        $sql = mysqli_query($link, "SELECT * FROM members WHERE username='$name' AND password='$md5password' AND isactive='1'"); 
        $login_check = mysqli_num_rows($sql);
        if($login_check > 0)
        {
            return true;
        }
        return false;
    }
    return false;
}
/********************************************************************************************/



/******************* Connect to the DB *****************/
$host = 'localhost'; 
$username = 'root'; 
$password = ''; 
$db_name = 'olrc'; 
$link = mysqli_connect($host,$username,$password,$db_name); 
if (!$link) { 
    die('Could not connect to MySQL: ' . mysqli_error($link)); 
}
/********************************************************/



//return the user info
if (isAuthorized())
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
?> 