<?php

/******************* Connect to the DB *****************/
include ("db_web.inc");
include('error.inc');
ini_set('display_errors',1);
error_reporting(E_ALL);
/********************************************************/

$call = '';
$pass = '';
$md5password = '';
header('Content-type: application/json');
$res = array('isAuthorized'=>false, 'error'=>'did not try to login');
/******************************************* Declare Functions *************************************/
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
        $call = $userpass[0];
        $pass = $userpass[1];
    
        //$md5password = md5(preg_replace("[^A-Za-z0-9]", "", $pass));
		$md5password = md5($pass);

        $sql = mysqli_query($GLOBALS["___mysqli_ston"], "SELECT `call`, password FROM iarcorg_members.members WHERE `call`='$call' AND password='$md5password'"); 
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






//return the user info
if (isAuthorized())
{
    // $sql = mysql_query("SELECT * FROM iarcorg_members.members WHERE `call`='$call' AND password='$md5password'"); 
    // while($row = mysql_fetch_array($sql))
    // {
        // $id = $row["id"];
        // $call = $row["call"];
        // $name_heb = $row["name_heb"];
        // $family_heb = $row["family_heb"];
        // $email_fwd = $row["email_fwd"];
        // $name_eng = $row["name_eng"];		
        // $family_eng = $row["family_eng"];
	
            
        // //mysqli_query($link, "UPDATE members SET lastlogin=now() WHERE id='$id'");
            
        // header("Content-type: application/json");
        // $res = array('isAuthorized'=>true, 'id'=>$id,'call'=>$call,'name_heb'=>$name_heb,'family_heb'=>$family_heb,'name_eng'=>$name_eng,'family_eng'=>$family_eng,'email_fwd'=>$email);
    // }
	$res = array('isAuthorized'=>true, 'error'=>'');
}
else 
{
    header('HTTP/1.1 401 Unauthorized', true, 401);
    $res = array('isAuthorized'=>false, 'error'=>'login failed');
}
echo json_encode($res);
?> 