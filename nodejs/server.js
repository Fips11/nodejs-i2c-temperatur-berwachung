var readtemp = require("./tempread.js");
var fs = require("fs");



fs.stat('sensor.json', function(err, stat) {

    if(err == null) {
        var config = require('./sensor.json');
        readtemp.loadConfig(config,function(){
            readtemp.init(function(){
                readtemp.startread(0/*function(){}*/);  
                readtemp.CLIstart();
                });
        });   
    } 
});
