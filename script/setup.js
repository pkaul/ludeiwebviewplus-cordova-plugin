module.exports = function(context) {

    var fs = require('fs');
    var path = require('path');
    var exec = require('child_process').exec;

    var log = function(message) {
        console.info("[webview-cordova-plugin] "+message);
    };

    var androidHome = process.env.ANDROID_HOME;
    if( !androidHome ) {
        throw new Error("Environment variable ANDROID_HOME is not set to Android SDK directory");
    }
    else {
        log("Found Android SDK at "+androidHome);
    }

    /**
     * Executes an (external) command
     */
    var execCommand = function(command, callback) {

        log("Executing "+command+" ...");
        try {
            var p = exec(command, {maxBuffer: 500 * 1024},function (error, stdout, stderr) {

                if (!!stdout) {
                    log("Exec: " + stdout);
                }
                if (!!stderr) {
                    log("Exec: " + stderr);
                }
                if (!!error) {
                    log("Error executing "+command+": "+error);
                    throw new Error("Error executing "+command+": "+error);
                }
            });
            p.on("close", function (code) {
                if (code !== 0) {
                    log("Error executing "+command+": "+code);
                    throw new Error("Error executing " + command + ": " + code);
                }
                log("Executed " + command);
                if (!!callback) {
                    callback();
                }
            });
        } catch (e) {
            log("Error executing "+command+": "+code);
            throw new Error("Error executing " + command + ": " + code);
        }
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


    /**
     * Turns a project into an android "library project"
     * @param path The location of the project
     */
    var prepareLibraryProject = function(path, callback) {

        log("Preparing project library at "+path+" ...");
        execCommand(androidHome+"/tools/android update lib-project -p "+path, function() {
            execCommand("ant clean -f "+path+"/build.xml", function() {
                execCommand("ant release -f "+path+"/build.xml", function() {

                    console.info("Turned "+path+" into a library project");
                    if(!!callback ) {
                        callback();
                    }
                });
            });
        });
    };

    var patchCordovaWebview = function() {

        var path = "./platforms/android/CordovaLib/src/org/apache/cordova/CordovaWebview.java";
        var data = fs.readFileSync(path, 'utf8');
        data = data.replace(/class CordovaWebView extends WebView/, "class CordovaWebView extends com.ludei.chromium.LudeiWebView");
        fs.writeFileSync(path, data, "UTF-8", {'flags': 'w+'});
    };

    // see https://github.com/apache/cordova-lib/blob/master/cordova-lib/templates/hooks-README.md
    var Q = context.requireCordovaModule('q');
    var deferral = new Q.defer();

    // turn webview+ into a library project
    prepareLibraryProject("./plugins/com.ludei.webview.plus/android", function() {

        // add webview+ lib as dependency to cordova lib
        addLibraryReference("./platforms/android/CordovaLib", ["../../../plugins/com.ludei.webview.plus/android"]);

        // patch Cordova's Webview class
        patchCordovaWebview();

        // done
        deferral.resolve();
    });


    return deferral.promise;
};







