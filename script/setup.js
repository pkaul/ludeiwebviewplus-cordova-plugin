module.exports = function(context) {

    var log = function(message) {
        console.info("[webview-cordova-plugin] "+message);
    };

    /**
     * Adds a library reference to a "library project"
     * @param libraryPath path The location of the project
     * @param referencePaths The relative locations of the references
     */
    var addLibraryReference = function(libraryPath, referencePaths) {

        var projectProperties = libraryPath+"/project.properties";
        var data = fs.readFileSync(projectProperties, 'utf8');

        // find the next available reference index
        var referenceIndex = 1;
        while( data.indexOf('android.library.reference.'+referenceIndex) > -1 ) {
            referenceIndex++;
        }
        // compute the entries to be appended
        var appends = "";
        for( var i=0; i<referencePaths.length; i++ ) {
            appends += "\n\randroid.library.reference."+(i+referenceIndex)+"="+referencePaths[i];
            log("Adding references "+referencePaths[i]+" to "+projectProperties+" as reference#"+(referenceIndex+i));
        }
        // write back
        fs.writeFileSync(projectProperties, data+appends, "UTF-8", {'flags': 'w+'});
    };

    var patchCordovaWebview = function() {

        var path = "./platforms/android/CordovaLib/src/org/apache/cordova/CordovaWebview.java";
        var data = fs.readFileSync(path, 'utf8');
        data = data.replace(/class CordovaWebView extends WebView/, "class CordovaWebView extends com.ludei.chromium.LudeiWebView");
        fs.writeFileSync(path, data, "UTF-8", {'flags': 'w+'});
    };


    var fs = require('fs');
    var path = require('path');

    // see https://github.com/apache/cordova-lib/blob/master/cordova-lib/templates/hooks-README.md
    var Q = context.requireCordovaModule('q');

    patchCordovaWebview();
    addLibraryReference("./platforms/android/CordovaLib", ["../../../plugins/com.ludei.webview.plus/android"]);

    return Q.resolve();
};







