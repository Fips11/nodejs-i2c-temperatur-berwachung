# nodejs-i2c-temperatur-berwachung
simple Temperaturüberwachung mit cli-Ausgabe für Raspberry Pi.
Sammelt Temperaturwerte von 1wire Temperatursensoren die an einem Arduino Nano angeschlossen sind. 

|Raspberry|----< I2C >-----|Arduino|-----< 1Wire >-----|DS18B20|

-erlaubt eine höhere sensoranzahl als der Raspberry allein. (bisher mit 24 stück getestet)

-über die sensor.json lassen sich den sensorid's feste Namen und erlaubte Temperaturen zuweisen.




__Example__

```js
var readtemp = require("./tempread.js");

var config = require('./sensor.json');

        readtemp.loadConfig(config,function(){
            readtemp.init(function(){
                readtemp.startread(0);  
                
                readtemp.CLIstart();
                });
        }); 

```

