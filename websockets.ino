#include <WiFi.h>
#include <WiFiMulti.h>
#include <WebSocketsClient_Generic.h>

WiFiMulti WiFiMulti;
WebSocketsClient webSocket;

#define LED_PIN 2 // LED conectado al pin GPIO 4
#define USE_SSL true

#if USE_SSL
  #define WS_SERVER "192.168.105.179"
  #define WS_PORT 3000
#else
  #define WS_SERVER "192.168.105.179" // Dirección IP del servidor
  #define WS_PORT 3000 // Puerto del servidor WebSocket
#endif

void webSocketEvent(const WStype_t& type, uint8_t * payload, const size_t& length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println("[WSc] Disconnected!");
      break;

    case WStype_CONNECTED:
      Serial.println("[WSc] Connected to server");
      webSocket.sendTXT("Connected");
      break;

    case WStype_TEXT:
      Serial.printf("[WSc] get text: %s\n", payload);
      if (strcmp((char*)payload, "true") == 0) {
        digitalWrite(LED_PIN, HIGH); // Enciende el LED
        delay(1000);
        digitalWrite(LED_PIN, LOW); // Apaga el LED
      }
      break;
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);

  WiFiMulti.addAP("Pablo", "pablo3292"); // Ajusta el SSID y contraseña de WiFi
  while (WiFiMulti.run() != WL_CONNECTED) {
    delay(100);
    Serial.print(".");
  }
  Serial.println("Conectado a WiFi");

#if USE_SSL
  webSocket.beginSSL(WS_SERVER, WS_PORT);
#else
  webSocket.begin(WS_SERVER, WS_PORT, "/");
#endif

  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  webSocket.enableHeartbeat(15000, 3000, 2);
}

void loop() {
  webSocket.loop(); // Mantiene la conexión WebSocket activa
}
