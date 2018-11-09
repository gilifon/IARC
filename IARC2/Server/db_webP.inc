<? 
  //mysql DATA
  $DBHost = "localhost";
  $DBUser = "root";
  $DBPassword = "";
  $DBName = "iarcorg_webdb";
  $Link = ($GLOBALS["___mysqli_ston"] = mysqli_connect($DBHost, $DBUser, $DBPassword)) or die('Error: ' . ((is_object($GLOBALS["___mysqli_ston"])) ? mysqli_error($GLOBALS["___mysqli_ston"]) : (($___mysqli_res = mysqli_connect_error()) ? $___mysqli_res : false)));
  ((bool)mysqli_query($Link, "USE " . $DBName));
  mysqli_query( $Link, "SET SESSION time_zone = 'Asia/Jerusalem'");

  //mysql_set_charset('hebrew',$Link);

  ((bool)mysqli_set_charset($Link, "utf8"));
  mysqli_query($GLOBALS["___mysqli_ston"], "SET NAMES 'utf8'");
?>