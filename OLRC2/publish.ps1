cls

# Set Constant paths
$ProjectFolder = "C:\Users\gill\Documents\Visual Studio 2012\Projects\IARC\OLRC2\"
$TargetFolder = "C:\wamp\www\lessons2\"

# Run Weyland Build - it creates a file called main-build.js in "\App"
echo "Running the optimizer..."
cd "$ProjectFolder"
& $(".\weyland.exe")
echo "Done!"
# Copy the main-build file
echo "Copying the new build file..."
copy-item $("$ProjectFolder"+"App\main-build.js") $("$TargetFolder" + "App\") -force -recurse | out-null 
echo "Done!"

cd "$ProjectFolder"