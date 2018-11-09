<?
ini_set('session.save_path','//home1/iarcorg/public_html/ws/sess');
$sess_id = session_id();
if(!isset ($ses_id)) {
//auth
echo "NOT AUTH<br>.$sess_id"; 
}
else {
//auth is ok
echo "AUTH<br>.$sess_id";
}
?>