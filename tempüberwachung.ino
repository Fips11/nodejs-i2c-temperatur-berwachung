#include <OneWire.h>
#include <avr/wdt.h>
#include <Wire.h>
#define LED            13 

OneWire  ds(10);  // on pin 10 (a 4.7K resistor is necessary)

//---wenn adressen u anzahl erst gesucht werden müssen
byte test_addr[50][8]; //adressarray
int sens_anzahl=0;     //geamtanzahl sensoren... wird im setup bestimmt
bool initialread = false;

//--- wenn adressen und anzahl fest vorgegeben sind
/*byte test_addr[5][8]={
  {
    0x28,0x50,0x18,0x1F,0x0,0x0,0x80,0x5C  }
  ,
  {
    0x28,0xD0,0x1A,0x1F,0x0,0x0,0x80,0x35  }
  ,
  {
    0x28,0x28,0x13,0x8,0x0,0x0,0x80,0xAB  }
  ,
  {
    0x28,0x42,0x18,0x1F,0x0,0x0,0x80,0x69  }
  ,
  {
    0x28,0xF2,0x17,0x8,0x0,0x0,0x80,0xBF  }
}; //adressarray*/

//int sens_anzahl=5;     //geamtanzahl sensoren... wird im setup bestimmt


int readnr=0; //sensor der gelesen werden soll
int init_index=0;
byte data[50][12];    //sensoradressarray
float temp[50];       //array mit den gespeicherten temperaturen
byte i;
byte arr[4];



void setup(void) {
  wdt_enable(WDTO_1S); 
  Serial.begin(115200);
  //i2c init-------------
  Wire.begin(13);

  Wire.onReceive(receiveEvent);
  Wire.onRequest(requestEvent);
  //---------------------

  //sensoradressen suchen
  while(ds.search(test_addr[sens_anzahl])){
   
   Serial.print("ROM =");
   
   for( i = 0; i < 8; i++) {
   Serial.write(' ');
   Serial.print(test_addr[sens_anzahl][i], HEX);
   }
   sens_anzahl++;
   Serial.println();
   
   }
   Serial.print("Anzahl Sensoren: ");
   Serial.println(sens_anzahl);
   
}

void loop(void) {
delay(20);
  // sensor++;
  //if(sensor>=sens_anzahl) {sensor=0;}
  wdt_reset();
}


void receiveEvent(int many){
  //  emfang legt fest welcher arrayeintrag gelesen werden soll und löst auslesen des sensors aus
  readnr = Wire.read();
  Serial.println(readnr);
  if(128 == readnr){
    initialread=true;
    init_index=0;
    intToByte(arr,sens_anzahl);
    Serial.println("init_read gestartet");
  }else{
  
readsensor(readnr);

floatToByte(arr, temp[readnr]);

Serial.println(temp[readnr]);
  }

 
}

void requestEvent(){  //-----------------------------sendet vorher festgelegten wert
  //überträgt die ausgelesenen byte vom sensor
  // Wire.write(data[readnr],9);
  if(initialread){
    if(init_index==0){
    Wire.write(arr,2);
    init_index=1;}
    else{
      Wire.write(test_addr[init_index-1],8);
      //for(int y=0;y<8;y++){Serial.print(test_addr[init_index-1][y],HEX);Serial.print(" ");}
      //Serial.println();
      init_index++;
      if(init_index==sens_anzahl+1){initialread=false; init_index=0;}
    }
    
  }else{
  //als zerlegtes float übertragen
  Wire.write(arr,4);
  }


}
//-----------------------------------------------------------------------------------

void floatToByte(byte* arr, float value)
{
  long l = *(long*) &value;

  arr[0] = l & 0x00FF;
  arr[1] = (l >> 8) & 0x00FF;
  arr[2] = (l >> 16) & 0x00FF;
  arr[3] = l >> 24;
}

void intToByte(byte* arr, int value)
{
  int l = *(int*) &value;

  arr[0] = l & 0xFF;   
  arr[1] = (l&0xFF00)>>8;
  
}
//------------------------------------------------------------------------------------

void readsensor(int sensor){

  byte present = 0;
  byte type_s;
  float celsius ;

  // liest über 1wire den wert des sensors----------------
  ds.reset();
  ds.select(test_addr[sensor]);
  ds.write(0x44, 1);        // start conversion, with parasite power on at the end

  //delay(75);     // maybe 750ms is enough, maybe not
  // we might do a ds.depower() here, but the reset will take care of it.

  present = ds.reset();
  ds.select(test_addr[sensor]);    
  ds.write(0xBE);         // Read Scratchpad


  // -----sensoren in array einlesen
  for ( i = 0; i < 9; i++) {           // we need 9 bytes
    data[sensor][i] = ds.read();
  }

  //aus sensoadresse sensortyp und ergebnisart bestimmen  ---------------------
  int16_t raw = (data[sensor][1] << 8) | data[sensor][0];

  // the first ROM byte indicates which chip
  switch (test_addr[sensor][0]) {
  case 0x10:
    // Serial.println("  Chip = DS18S20");  // or old DS1820
    type_s = 1;
    break;
  case 0x28:
    //Serial.println("  Chip = DS18B20");
    type_s = 0;
    break;
  case 0x22:
    // Serial.println("  Chip = DS1822");
    type_s = 0;
    break;
  default:
    //Serial.println("Device is not a DS18x20 family device.");
    return;
  } 

  //ausgelesene byts in lesbaren floatwert convertieren-------------------

  if (type_s) {
    raw = raw << 3; // 9 bit resolution default
    if (data[sensor][7] == 0x10) {
      // "count remain" gives full 12 bit resolution
      raw = (raw & 0xFFF0) + 12 - data[sensor][6];
    }
  } 
  else {
    byte cfg = (data[sensor][4] & 0x60);
    // at lower res, the low bits are undefined, so let's zero them
    if (cfg == 0x00) raw = raw & ~7;  // 9 bit resolution, 93.75 ms
    else if (cfg == 0x20) raw = raw & ~3; // 10 bit res, 187.5 ms
    else if (cfg == 0x40) raw = raw & ~1; // 11 bit res, 375 ms
    //// default is 12 bit resolution, 750 ms conversion time
  }
  temp[sensor]=(float)raw / 16.0;

  //  Serial.println("im arr ggespeicherter wert");

  //Serial.println(temp[sensor]);

  //return temp[sensor];
}



