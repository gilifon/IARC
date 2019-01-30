<? 

  //mysql DATA

  $DBHost = "localhost";
  $DBUser = "root";
  $DBPassword = "";
  $DBName = "iarcorg_members";

  $Link = ($GLOBALS["___mysqli_ston"] = mysqli_connect($DBHost, $DBUser, $DBPassword));

  mysqli_select_db($Link, $DBName);

  

  //mysql_set_charset('hebrew',$Link);

  

  ((bool)mysqli_set_charset($Link, "utf8"));

  mysqli_query($GLOBALS["___mysqli_ston"], "SET NAMES 'utf8'");

?>