﻿<?php
	function showerror()
	{
		die ("Error " . mysqli_errno($GLOBALS["___mysqli_ston"]) . " : " . mysqli_error($GLOBALS["___mysqli_ston"]));
	}
?>
