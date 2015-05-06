<?php 

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

?> 
