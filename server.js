var CLI = require('clui'),
    clc = require('cli-color'),
    i2c = require('i2c-bus');
var config = require('./sensor.json');

var i2c1 = i2c.openSync(1);

var init_read_count = 0; //zählposition beim abfragen der sernsoradressen
var sensornr= 0;
var arr=Object.keys(config.Sensoren);
var anz_sensoren=0;     //anzahl der verfügbaren sensoren
var adressen = new Array;
var buffer = new Buffer(8);

//setInterval(drawProgress, 700);
init();
//setsensor();




function init(){//sendet befehl zum übertragen der sensoradressen
    
    i2c1.sendByte(  parseInt(config.I2Cadresse),
                    parseInt(128), //sensor 128 steht für initialisierung einleiten 
                    function(){ setTimeout(function(){ init_readcount();}, 300);
                    });
    
}
function init_readcount(){//emfängt anzahl der adressen
    i2c1.i2cRead(parseInt(config.I2Cadresse),2,buffer,
    function(){ anz_sensoren= buffer.readIntLE(0,2);
        console.log( anz_sensoren);
        init_readadress();
    });
    
}

function init_readadress(){//emfängt die eigendlichen adressen
    
    i2c1.i2cRead(parseInt(config.I2Cadresse),8,buffer,
    function(){ adressen[init_read_count]=buffer.toString('hex');
                init_read_count++;
                
                if(init_read_count<anz_sensoren){
                    setTimeout(function(){ init_readadress();}, 5);
                   
                }else{
                    updateConfig();
                }
    });    
}

function standartId(input){
    var test = input.split(" ");
   for (var y=0; y< test.length; y++)
   {if(test[y]=="0"){test[y]="00";}    
   }
    var string = test.join("").toLowerCase();
    return string;
}

function updateConfig(){
    
    console.log(adressen);
    
   // vergleiche configobjekteinträge mit adressarray und ergänze die befehle
    for(var z=0 ; z<adressen.length ; z++){
        var find=false;
        for(var y=0 ; y<arr.length ; y++){
         
            if(adressen[z]==standartId(config.Sensoren[arr[y]].adresse)){

                config.Sensoren[arr[y]].befehl=z;
                find=true;
            }
            
        }
        // vervollständige das configobjekt um die neuen adressen
        if(find===false){ 
            var num=Object.keys(config.Sensoren).length-arr.length;
            config.Sensoren["Unwnown_"+num]= {};
            config.Sensoren["Unwnown_"+num].adresse = adressen[z] ;
            config.Sensoren["Unwnown_"+num].befehl = z ;
        }//hier funktion um objekt zu erweitern 
       
    }
    
    //entferne ungenutzte keys aus objekt
    for (var Sensor in config.Sensoren){
        if(!config.Sensoren[Sensor].befehl){delete config.Sensoren[Sensor];}
    }
    
    // arr updaten ... nötig für korrektes wertelesen
    arr=Object.keys(config.Sensoren);
    //starte  
     setInterval(drawProgress, 700);
     setsensor();
}
//sensoerdatenleseschleife------------anfang-----
function setsensor(){ //teilt mit welcher sensor gelesen werden soll
    
    i2c1.sendByte(  parseInt(config.I2Cadresse),
                    parseInt(config.Sensoren[arr[sensornr]].befehl), 
                    function(){ setTimeout(function(){readsensor();}, 200);
                        });
    
}

function readsensor(){ //emfängt gelesene werte
     
    i2c1.i2cRead(parseInt(config.I2Cadresse),4,buffer,
    function(){ setTimeout(function(){convert();}, 0);
    });
    
}

function convert(){ //trägt wert lesbar in objekt ein und initiiert lesen eines neuen sensors
    
  
    config.Sensoren[arr[sensornr]].temp = buffer.readFloatLE();
   
    if(sensornr<(Object.keys(config.Sensoren).length)-1){sensornr++;}else{sensornr=0;}
    setsensor();
}
//sensoerdatenleseschleife------------ende-----

//cli funktionen
function drawProgress () {
    
    
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
    
    for (var Sensor in config.Sensoren)
    //for(var z=0;z<anz_sensoren;z++)
    { //console.log(arr);
        
      var temp=0;
      if(config.Sensoren[arr[i]].temp){temp=config.Sensoren[arr[i]].temp;}
      
      var warning= 80;
      if(config.Sensoren[arr[i]].tempmax){warning=config.Sensoren[arr[i]].tempmax;}
       var name ="unbekannt";
       if(Sensor){name=Sensor;}
       
      var human = temp+  ' C°';
      var memoryLine = new Line(outputBuffer)
                    .padding(2)
                    .column(name, 20, [clc.cyan])
                    .column(Gauge( temp, total, 60, warning , human), 80)
                    .fill()
                    .store();
      i++;
    }
    i=0;
outputBuffer.output();

}
