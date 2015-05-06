<?php 

    $request = $_POST["request"];
    header('Content-type: application/json');
    
    ######################### Sending Email upon addition (move to an external function) ####################
	$to = 'dkatzman@shamir.co.il,gilifon@gmail.com,gill@shamir.co.il';
    #$to = 'gilifon@gmail.com';
    $from = "admin@iarc.org";
    $headers = "From:" . $from . "\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html;\r\n";
    mail($to,'IARC - Information request from '.$request[n],'<table><tr><td>'.$request[n].'</td><td>'.$request[p].'</td><td>'.$request[e].'</td></tr></table>',$headers);
    ###########################################################################################################

    echo json_encode('Your message has been successfuly sent');
?> 

