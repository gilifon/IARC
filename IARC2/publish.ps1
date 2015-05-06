cls

# Set Constant paths
$ProjectFolder = "C:\Users\gill\Documents\Visual Studio 2012\Projects\IARC\IARC2\"
$TargetFolder = "C:\wamp\www\iarc2\"

Write-Host "Press any key to continue ..."
$x = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Run Weyland Build - it creates a file called main-build.js in "\App"
echo "Running the optimizer..."
cd "$ProjectFolder"

Write-Host "Press any key to continue ..."
$x = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

& $(".\weyland.exe") | out-null 
echo "Done!"

Write-Host "Press any key to continue ..."
$x = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Move the main-build file and rename it
echo "Copying the new build file..."
copy-item $("$ProjectFolder"+"App\main-build.js") $("$TargetFolder" + "App\") -force -recurse | out-null 
echo "Done!"

cd "$ProjectFolder"