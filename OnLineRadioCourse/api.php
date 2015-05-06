<html> 
<head> 
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" /> 
</head> 
<body> 
<?php

//next example will recieve all messages for specific conversation
//$service_url = 'https://shamirprescriptor.com:8085/SparkWeb/api/spark/GetSparkMeasures?userAccountName=optik&country=Turkey';
$service_url = 'http://localhost/solsite/api/soldata/GetTracedShapes?catalogueId=1';
$curl = curl_init($service_url);
curl_setopt($curl, CURLOPT_HTTPHEADER, array('Content-Type: application/xml', null));
curl_setopt($curl, CURLOPT_HEADER, 1);
curl_setopt($curl, CURLOPT_USERPWD, "spark_admin" . ":" . "sp@rk!");
curl_setopt($curl, CURLOPT_TIMEOUT, 30);
curl_setopt($curl, CURLOPT_POST, 1);
curl_setopt($curl, CURLOPT_RETURNTRANSFER, TRUE);
$curl_response = curl_exec($curl);
if ($curl_response === false) {
    $info = curl_getinfo($curl);
    curl_close($curl);
    die('error occured during curl exec. Additioanl info: ' . var_export($info));
}
curl_close($curl);
$decoded = json_decode($curl_response);
if (isset($decoded->response->status) && $decoded->response->status == 'ERROR') {
    die('error occured: ' . $decoded->response->errormessage);
}
echo 'response ok!';

    
?>
</body> 
</html>