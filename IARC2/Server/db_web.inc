<? 

  //mysql DATA
  //$DBHost = "127.0.0.1";
  //$DBUser = "sysadmin";
  //$DBPassword = "q1!w2@e3#r4$";
  //$DBName = "iarcorg_webdb";
  $DBHost = "localhost";
  $DBUser = "root";
  $DBPassword = "";
  $DBName = "iarcorg_webdb";
  
  $Link = new mysqli($DBHost, $DBUser, $DBPassword, $DBName);
  //mysql_set_charset('hebrew',$Link);
  mysqli_set_charset($Link,'utf8');
  mysqli_query($Link,"SET NAMES 'utf8'");

?>