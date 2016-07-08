var CLI = require('clui'),
    clc = require('cli-color'),
    i2c = require('i2c-bus');

var i2c1 = i2c.openSync(1);
exports.cli_config={"refresh":500,
                    "readcontinuous" : true 
};

exports.config = {"I2Cadresse":"",
                  "readcontinuous" : true ,
                  "readall" : true,
                  "stopread": false,
                  "refresh" : 500,
                  "Sensoren":""                 
};
exports.onew_adressen=[];



var interval;

//-- modulexporte

exports.loadConfig= function(obj,callback){
        
        if(obj.readcontinuous){exports.config.readcontinuous = obj.readcontinuous ;}
        if(obj.refresh)       {exports.config.refresh        = obj.refresh        ;}
        if(obj.readall)       {exports.config.readall        = obj.readall        ;}
        if(obj.I2Cadresse)    {exports.config.I2Cadresse     = obj.I2Cadresse     ;}
        if(obj.Sensoren)      {exports.config.Sensoren       = obj.Sensoren       ;}
        
        if(obj.I2Cadresse)    {exports.cli_config.refresh        = obj.CLIrefresh       ;}
        if(obj.Sensoren)      {exports.cli_config.readcontinuous = obj.CLIreadcontinuous;}
        
       
        if(callback)callback();
        
    };


    exports.init = function(callback){
      init(callback);  
    };
    
        
    exports.startread = function(sensor,callback){
      startread(sensor,callback);  
    };
    
    exports.stopread = function(callback){
      stopread(callback);  
    };
//modulexport--- cli

    exports.CLIstart = function(){
      CLIstart();  
    };
    exports.CLIstop = function(){
      CLIstop();  
    };
   
//--- funktionsdefinition

//--- funktionsdefinition---- init

function init(callback){//sendet befehl zum übertragen der sensoradressen
    
    i2c1.sendByte(  parseInt(exports.config.I2Cadresse),
                    parseInt(128), //sensor 128 steht für initialisierung einleiten 
                    function(){ setTimeout(function(){ init_readcount(callback);}, 300);
                    });
    
}

function init_readcount(callback){//emfängt anzahl der adressen
    var buffer = new Buffer(2);
    i2c1.i2cRead(parseInt(exports.config.I2Cadresse),
                 2,
                 buffer,
                 function(){ var anz_sensoren= buffer.readIntLE(0,2);
                             
                             init_readadress(0,anz_sensoren,callback);
                           });
    
}

function init_readadress(read_count,anz_sensoren,callback){//emfängt die eigendlichen adressen
    var buffer = new Buffer(8);
    i2c1.i2cRead(parseInt(exports.config.I2Cadresse),
                          8,
                          buffer,
                          function(){ exports.onew_adressen[read_count] = buffer.toString('hex');
                                      
                                      if(read_count+1 < anz_sensoren){
                                          setTimeout(function(){ init_readadress(read_count+1,anz_sensoren,callback);}, 5);
                                      }else{
                                          updateConfig(callback);
                                      }
    });    
}

function updateConfig(callback){
   var arr=Object.keys(exports.config.Sensoren);
   // vergleiche configobjekteinträge mit adressarray und ergänze die befehle
    for(var z=0 ; z<exports.onew_adressen.length ; z++){
        
        var find=false;
        
        for(var y=0 ; y<arr.length ; y++){
         
            if(exports.onew_adressen[z] == standartId(exports.config.Sensoren[arr[y]].adresse)){

                exports.config.Sensoren[arr[y]].befehl = z;
                find=true;
            }
            
        }
        // vervollständige das configobjekt um die neuen adressen
        if(find===false){ 
            var num = Object.keys(exports.config.Sensoren).length-arr.length;
            
            exports.config.Sensoren["Sensor_"+num]= {"adresse": exports.onew_adressen[z],
                                                     "befehl" : z};
        }
       
    }
    
    //entferne ungenutzte keys aus objekt
    for (var Sensor in exports.config.Sensoren){
        if(exports.config.Sensoren[Sensor].befehl=== undefined){delete exports.config.Sensoren[Sensor];}
    }
    
    if(callback)callback();
}
//--- funktionsdefinition---- init----ende
//
//
//
//--- funktionsdefinition---- main----
function startread(sensor,callback){
   var sensornr= 0;
    if(exports.config.readall==false){sensornr = sensor;}
    
    setsensor(sensornr,callback);
}

function setsensor(sensornr,callback){ //teilt mit welcher sensor gelesen werden soll
    var arr=Object.keys(exports.config.Sensoren);
    
    i2c1.sendByte(  parseInt(exports.config.I2Cadresse),
                    parseInt(exports.config.Sensoren[arr[sensornr]].befehl), 
                    function(){ setTimeout(function(){readsensor( sensornr,callback);}, exports.config.refresh);
                        });
    
}

function readsensor(sensornr,callback){ //emfängt gelesene werte
    var buffer = new Buffer(4);
    var arr=Object.keys(exports.config.Sensoren);
    
    i2c1.i2cRead(parseInt(exports.config.I2Cadresse),
                 4,
                 buffer,
                 function(){ 
                    exports.config.Sensoren[arr[sensornr]].temp = buffer.readFloatLE();
                   
                    if(exports.config.stopread===true){ return;}       //bricht lesen ab
         
                    if(exports.config.readall===true ){
                        if(sensornr<arr.length-1){ sensornr++;} else{ sensornr=0;}  //zählt die sensoren hoch
                        if(exports.config.readcontinuous===false && sensornr === 0){ if(callback){callback();} return;}//wenn nur einmal alle gelesen weden sollen
                        if(exports.config.readcontinuous===false && sensornr !== 0){ setsensor(sensornr,callback);}
                        if(exports.config.readcontinuous===true) {setsensor(sensornr,callback);} //standart schleife
                   
                     }else{//wenn nur ein wert gelesen werden soll
                        if(exports.config.readcontinuous===true ){ setsensor(sensornr,callback);}/*wenn einer dauerhaft gelesen werden soll*/
                        else {if(callback){callback();}} //geht am ende einer readabfrage raus 
            
        }
    });
    
}

function stopread(callback){
    
    exports.config.stopread=true;
    setTimeout(function(){exports.config.stopread=true; if(callback)callback();},
                          exports.config.refresh+40);
    
}

//--- funktionsdefinition---- main--- ende
//
////--- funktionsdefinition---- cli--- 

 function CLIstart(){
    (!exports.cli_config.readcontinuous)? CLIrun() : interval=setInterval(CLIrun, exports.cli_config.refresh); 
 }
 
 function CLIstop(){
    clearInterval(interval);
 }
 
 function CLIrun(){
     
         
    var Line          = CLI.Line,
        LineBuffer    = CLI.LineBuffer;
    var Gauge         = CLI.Gauge;
    var Sparkline     = CLI.Sparkline;
        
   
    console.log(clc.reset);

    var outputBuffer = new LineBuffer({
      x: 0,
      y: 0,
      width: 'console',
      height: 'console'
    });

    var blankLine = new Line(outputBuffer).fill().store();
    
    var total=150 ;
    var i=0;
    var arr=Object.keys(exports.config.Sensoren);
     
    for (var Sensor in exports.config.Sensoren)
    
    { 
        
      var temp=0;
      if(exports.config.Sensoren[arr[i]].temp){temp=exports.config.Sensoren[arr[i]].temp;}
      temp=Rundenkomma1(temp);
      var human = temp+  ' C°';
      
      var warning= 80;
      if(exports.config.Sensoren[arr[i]].tempmax){warning=exports.config.Sensoren[arr[i]].tempmax;}
      
      var name ="unbekannt";
      if(Sensor){name=Sensor;}
     
      var memoryLine = new Line(outputBuffer)
                    .padding(2)
                    .column(name, 20, [clc.cyan])
                    .column(Gauge( temp, total, 50, warning , human), 70)
                    
                    .fill()
                    .store();
      i++;
    }
    i=0;
    outputBuffer.output();

     
     
     
 }

////--- funktionsdefinition---- cli--- ende
//
//--- helper---- 

function standartId(input){//bringt unterschiedlich geschriebene 1wire ids in ein einheitliches format zum verarbeiten
    var test = input.split(" ");
   for (var y=0; y< test.length; y++)
   {if(test[y]=="0")test[y]="00";}
    var string = test.join("").toLowerCase();
    return string;
}



function Rundenkomma1(x) { Ergebnis = Math.round(x * 10) / 10 ; return Ergebnis; }
