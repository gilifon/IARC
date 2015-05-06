<?php
include_once "extensions.php";

$host = 'localhost'; 
$username = 'iarcorg_less'; 
$password = 'Ahgur12'; 
$db_name = 'iarcorg_less'; 
$link = mysqli_connect($host,$username,$password,$db_name); 
if (!$link) { 
    die('Could not connect to MySQL: ' . mysqli_error($link)); 
}
?>

