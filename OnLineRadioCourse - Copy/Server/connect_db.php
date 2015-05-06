<?php
$host = 'localhost'; 
$username = 'root'; 
$password = ''; 
$db_name = 'olrc'; 
$link = mysqli_connect($host,$username,$password,$db_name); 
if (!$link) { 
    die('Could not connect to MySQL: ' . mysqli_error($link)); 
}
?>