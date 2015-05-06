<?php 
include_once "../connect_db.php";


$audit = array();

if (include '../isauthorized.php')
{
    $sql = mysqli_query($link, "SELECT * FROM audit order by `timestamp` desc"); 
    $count_check = mysqli_num_rows($sql);
    if($count_check > 0)
    {
        while($row = mysqli_fetch_array($sql))
        {
            $id = $row["id"];
            $username = $row["username"];
            $tab = $row["tab"];
            $operation = $row["operation"];
            $timestamp = $row["timestamp"];
            $audit[] = array('id'=>$id, 'username'=>$username, 'tab'=>$tab, 'operation'=>$operation, 'timestamp'=>$timestamp);
        }
    }      

mysqli_close($link);
header('Content-type: application/json');
echo json_encode($audit);

}
else
{
    header('HTTP/1.1 401 Unauthorized', true, 401);
        $res = array('isAuthorized'=>false, 'error'=>'you are not authorized');
        echo json_encode($res);
    mysqli_close($link);
}
?> 
