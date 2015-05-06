<?php 
$host = 'mysql10.000webhost.com'; 
$username = 'a8558290_root'; 
$password = 'Password1'; 
$db_name = 'a8558290_olrc'; 
$link = mysqli_connect($host,$username,$password,$db_name); 
if (!$link) { 
    die('Could not connect to MySQL: ' . mysqli_error($link)); 
}  
?>