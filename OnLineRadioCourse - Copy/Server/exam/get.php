<?php 
include_once "../connect_db.php";


$exams = array();

if (include '../isauthorized.php')
{
    $sql = mysqli_query($link, "SELECT * FROM exams order by `order`"); 
    $count_check = mysqli_num_rows($sql);
    if($count_check > 0)
    {
        while($row = mysqli_fetch_array($sql))
        {
            $id = $row["id"];
            $url = $row["url"];
            $caption = $row["caption"];
            $order = $row["order"];
            $exams[] = array('id'=>$id, 'd'=>$caption, 't'=>$url,'i'=>$order);
        }
    }      

mysqli_close($link);
header('Content-type: application/json');
echo json_encode($exams);

}
else
{
    header('HTTP/1.1 401 Unauthorized', true, 401);
        $res = array('isAuthorized'=>false, 'error'=>'you are not authorized');
        echo json_encode($res);
    mysqli_close($link);
}
?> 
