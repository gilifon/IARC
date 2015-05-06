cls

# Set Constant paths
$ProjectFolder = "C:\Users\gill\Documents\Visual Studio 2012\Projects\IARC\OnLineRadioCourse\"
$TargetFolder = "C:\wamp\www\lessons\"

# Set the new file name
$destination = "$ProjectFolder"+"Scripts\"
$fileName = "olrc"
$version = random
$extension = ".js"
$newFileName = "$destination$fileName$version$extension"

# Run the Optimizer - it creates a file called main-build.js in "App\durandal\amd"
echo "Running the optimizer..."
cd $("$ProjectFolder"+"App\durandal\amd")
& $(".\optimizer.exe") | out-null 
echo "Done!"

# Move the main-build file and rename it
echo "Moving the new build file..."
cd $("$ProjectFolder"+"App")
del $("$ProjectFolder"+"Scripts\"+"$fileName"+"*.*")
move "main-built.js" "$newFileName"
echo "Done!"

# Delete the current files in the destination folder
echo "Deleting old files in the server..."
#move "$TargetFolder"+"phpbb3" "c:\temp"
rd $("$TargetFolder" + "Content\") -force -recurse
rd $("$TargetFolder" + "Scripts\") -force -recurse
rd $("$TargetFolder" + "Server\") -force -recurse
del $("$TargetFolder" + "index.html")
del $("$TargetFolder" + "api.php")
echo "Done!"

# Create the correct folders tree
echo "Create the correct folders tree..."
#if (!(Test-Path -path $("$TargetFolder" + "App\"))) { New-Item $("$TargetFolder" + "App\") -itemtype directory -force | out-null } 
if (!(Test-Path -path $("$TargetFolder" + "Content\"))) { New-Item $("$TargetFolder" + "Content\") -itemtype directory -force | out-null } 
if (!(Test-Path -path $("$TargetFolder" + "Scripts\"))) { New-Item $("$TargetFolder" + "Scripts\") -itemtype directory -force | out-null } 
if (!(Test-Path -path $("$TargetFolder" + "Server\"))) { New-Item $("$TargetFolder" + "Server\") -itemtype directory -force | out-null } 
echo "Done!"

# Copy the source files to the server
echo "Copying the files to the server..."
#copy-item $("$ProjectFolder"+"App\*") $("$TargetFolder" + "App\") -force -recurse  | out-null 
copy-item $("$ProjectFolder"+"Content\*") $("$TargetFolder" + "Content\") -force -recurse | out-null 
copy-item $("$ProjectFolder"+"Scripts\*") $("$TargetFolder" + "Scripts\") -force -recurse  | out-null 
copy-item $("$ProjectFolder"+"Server\*") $("$TargetFolder" + "Server\") -force -recurse  | out-null 
copy-item $("$ProjectFolder"+"index.html") "$TargetFolder" -force -recurse  | out-null 
copy-item $("$ProjectFolder"+"api.php") "$TargetFolder" -force -recurse  | out-null 
echo "Done!"

# Search and replace the old script reference in 'index.html'
# read the file content
echo "Replacing the old reference in index.html..."
$index_html = Get-Content $("$TargetFolder" + "index.html")
# prepare the match (string to find)
$myMatch = "<script type=`"text/javascript`" src=`"Scripts/$fileName(.*)$extension`"></script>"
# replace
$new_index_html = $index_html -replace $myMatch,"<script type=`"text/javascript`" src=`"Scripts/$fileName$version$extension`"></script>"

# These line do the same as the above replace only it preserves the file structure (adds new line at the end of each line)
<#$new_index_html = @()
foreach ($Line in $index_html) {
	if ($Line -match $myMatch) {
		$new_index_html += "<script type=`"text/javascript`" src=`"Scripts/$fileName$version$extension`"></script>" + "`r`n"
	}
	else {
		$new_index_html += $Line + "`r`n"
	}
}#>

# save
Set-Content $("$TargetFolder" + "index.html") "$new_index_html"
echo "Done!"
cd "$ProjectFolder"