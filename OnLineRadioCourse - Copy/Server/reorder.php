<?php 
include_once "connect_db.php";
include_once "isauthorized.php";

header('Content-type: application/json');

$list = $_POST["list"];
$table = $_POST["table"];
$sql="";
$i = 1;

foreach ($list as $id)
{
    $sql ="UPDATE `$table` SET `order`= $i where `id` = $id";
    mysqli_query($link, $sql);
    $i++;
}
$sql="INSERT INTO `audit` (`username`, `tab`, `operation`) VALUES ('$name','$table','reorder')";
mysqli_query($link, $sql);
mysqli_close($link);
echo json_encode('reorder done!');
?> 
