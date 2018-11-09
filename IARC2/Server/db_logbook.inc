<? 
  //MySQL DATA
  $DBHost = "localhost";
  $DBUser = "iarcorg_mem";
  $DBPassword = "Rw6Ach!@";
  $DBName = "iarcorg_members";
  $Link = mysql_connect($DBHost,$DBUser,$DBPassword);
  mysql_select_db($DBName,$Link);
  
  //mysql_set_charset('hebrew',$Link);
  
  mysql_set_charset('utf8',$Link);
  mysql_query("SET NAMES 'utf8'");
?>