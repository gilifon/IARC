<?php 
include_once "../connect_db.php";

$videos = array();

if (include '../isauthorized.php')
{
    $sql = mysqli_query($link, "SELECT * FROM `videos` order by `order`"); 
    $count_check = mysqli_num_rows($sql);
    if($count_check > 0)
    {
        while($row = mysqli_fetch_array($sql))
        {
            $id = $row["id"];
            $url = $row["url"];
            $caption = $row["caption"];
            $section = $row["section"];
            $order = $row["order"];
            $videos[] = array('id'=>$id, 'd'=>$caption, 't'=>$url, 's'=>$section, 'i'=>$order);
        }
    }
    
    header('Content-type: application/json');
    echo json_encode($videos);
    mysqli_close($link);
}
else
{
    header('HTTP/1.1 401 Unauthorized', true, 401);
    $res = array('isAuthorized'=>false, 'error'=>'you are not authorized');
    echo json_encode($res);
    mysqli_close($link);
}

?> 
