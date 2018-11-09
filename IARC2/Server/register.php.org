<?php 
include ("db_web.inc");
include('error.inc');
ini_set('display_errors',1);
error_reporting(E_ALL);
header('Content-type: application/json');

//get the POST variable
$info = $_POST["info"];

//extract all the properties of the registration request
if(isset($info['firstname'])){$firstname = $info['firstname'];}else{$firstname = '';}
if(isset($info['lastname'])){$lastname = $info['lastname'];}else{$lastname = '';}
if(isset($info['efirstname'])){$efirstname = $info['efirstname'];}else{$efirstname = '';}
if(isset($info['elastname'])){$elastname = $info['elastname'];}else{$elastname = '';}
if(isset($info['email'])){$email = $info['email'];}else{$email = '';}
if(isset($info['licensenum'])){$licensenum = $info['licensenum'];}else{$licensenum = '';}
if(isset($info['callsign'])){$callsign = $info['callsign'];}else{$callsign = '';}
if(isset($info['birthdate'])){$birthdate = $info['birthdate'];}else{$birthdate = '';}
if(isset($info['id'])){$id = $info['id'];}else{$id = '';}
if(isset($info['country'])){$country = $info['country'];}else{$country = '';}
if(isset($info['gender'])){$gender = $info['gender'];}else{$gender = '';}
if(isset($info['city'])){$city = $info['city'];}else{$city = '';}
if(isset($info['address'])){$address = $info['address'];}else{$address = '';}
if(isset($info['house'])){$house = $info['house'];}else{$house = '';}
if(isset($info['zip'])){$zip = $info['zip'];}else{$zip = '';}
if(isset($info['phone'])){$phone = $info['phone'];}else{$phone = '';}
if(isset($info['mobile'])){$mobile = $info['mobile'];}else{$mobile = '';}
if(isset($info['reason'])){$reason = $info['reason'];}else{$reason = '';}
if(isset($info['cv'])){$cv = $info['cv'];}else{$cv = '';}
if(isset($info['timestamp'])){$timestamp = $info['timestamp'];}else{$timestamp = '';}

//Here you should create the pdf file
//and insert the data into the DB

//finally, return a message to the user
echo json_encode('Your request has been successfuly processed');
?> 