#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <NewPing.h>
#include <ESP32Servo.h>
#include <WiFiUdp.h>
#include <NTPClient.h>

// ---------- WIFI & WS ----------
const char* ssid = "YOUR_SSID";
const char* password = "YOUR_PASSWORD";
const char* ws_host = "192.168.1.100"; // REPLACE WITH SERVER IP
const uint16_t ws_port = 3000;
const char* deviceId = "esp32-01";

WebSocketsClient webSocket;
unsigned long lastTelemetryTime = 0;
unsigned long lastCommandTime = 0;
const int TELEMETRY_INTERVAL = 50; // 20Hz
const int FAILSAFE_TIMEOUT = 500; // ms

// ---------- TIME TRACKING ----------
WiFiUDP udp;
NTPClient timeClient(udp, "pool.ntp.org", 19800, 60000); // UTC+5:30 (IST)
bool isMachineMoving = false;
String sessionStartTime = "";

// ---------- SYSTEM STATE ----------
String mode = "manual"; // "manual" or "auto"

// ---------- ULTRASONIC ----------
#define TRIG_FRONT 5
#define ECHO_FRONT 18
#define TRIG_LEFT 16
#define ECHO_LEFT 17
#define TRIG_RIGHT 4
#define ECHO_RIGHT 2
#define MAX_DISTANCE 200

NewPing sonarFront(TRIG_FRONT, ECHO_FRONT, MAX_DISTANCE);
NewPing sonarLeft(TRIG_LEFT, ECHO_LEFT, MAX_DISTANCE);
NewPing sonarRight(TRIG_RIGHT, ECHO_RIGHT, MAX_DISTANCE);

// ---------- IR ----------
#define IR1 34
#define IR2 35
#define IR3 21

// ---------- MOTOR DRIVER ----------
#define ENA 26
#define IN1 27
#define IN2 14

#define ENB 25
#define IN3 33
#define IN4 32

// ---------- SERVO ----------
#define SERVO_PIN 13
Servo steering;

// ---------- BUZZER ----------
#define BUZZER_PIN 22
int buzzerBeepsRemaining = 0;
unsigned long lastBuzzerToggle = 0;
bool buzzerState = false;
int buzzerDuration = 0;

void setBuzzerPattern(int times, int durationMs) {
  buzzerBeepsRemaining = times * 2; 
  buzzerDuration = durationMs;
  buzzerState = true;
  digitalWrite(BUZZER_PIN, HIGH);
  lastBuzzerToggle = millis();
  buzzerBeepsRemaining--;
}

void handleBuzzer() {
  if (buzzerBeepsRemaining > 0) {
    if (millis() - lastBuzzerToggle > buzzerDuration) {
      buzzerState = !buzzerState;
      digitalWrite(BUZZER_PIN, buzzerState ? HIGH : LOW);
      lastBuzzerToggle = millis();
      buzzerBeepsRemaining--;
    }
  } else if (buzzerState) {
    digitalWrite(BUZZER_PIN, LOW);
    buzzerState = false;
  }
}

// ---------- PARAMETERS ----------
#define OBSTACLE_DIST 30
#define DEFAULT_SPEED 180
#define TURN_SPEED 120
#define CONVEYOR_SPEED 180

// ---------- VARIABLES ----------
int front, leftD, rightD;
bool wasteDetected = false;
unsigned long conveyorStart = 0;
bool conveyorRunning = false;
int currentSpeedLeft = 0;
int currentSpeedRight = 0;
float currentDistance = 0.0;

// ---------- FUNCTION DECLARATIONS ----------
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length);
void sendTelemetry();
void sendEvent(String eventType, String severity, String message);
void readSensors();
void autoNavigation();
void setMotors(int leftSpeed, int rightSpeed);
void stopMotors();
void handleConveyor();
String getFormattedTime();

void setup() {
  Serial.begin(115200);

  // Init Pins
  pinMode(IR1, INPUT);
  pinMode(IR2, INPUT);
  pinMode(IR3, INPUT);

  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);

  pinMode(ENA, OUTPUT);
  pinMode(ENB, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  steering.attach(SERVO_PIN);
  steering.write(90);

  // WiFi connection
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected.");
  setBuzzerPattern(1, 500); // 1 Long Beep for WiFi connected

  // Init NTP Time
  timeClient.begin();

  // WebSocket config
  webSocket.begin(ws_host, ws_port, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);

  Serial.println("System Ready");
}

String getFormattedTime() {
  timeClient.update();
  unsigned long epochTime = timeClient.getEpochTime();
  int hours = (epochTime / 3600) % 24;
  int minutes = (epochTime / 60) % 60;
  int seconds = epochTime % 60;
  char buffer[10];
  snprintf(buffer, sizeof(buffer), "%02d:%02d:%02d", hours, minutes, seconds);
  return String(buffer);
}

void loop() {
  webSocket.loop();
  readSensors();
  handleConveyor();
  handleBuzzer();

  if (mode == "auto") {
    autoNavigation();
  } else {
    // Fail-safe: stop if no command received recently in manual mode
    if (millis() - lastCommandTime > FAILSAFE_TIMEOUT) {
      if (currentSpeedLeft != 0 || currentSpeedRight != 0) {
        stopMotors();
        setBuzzerPattern(5, 50); // 5 Rapid Beeps for Failsafe Stop
      }
    }
  }

  if (millis() - lastTelemetryTime > TELEMETRY_INTERVAL) {
    sendTelemetry();
    lastTelemetryTime = millis();
  }

  delay(10); // Small delay to prevent watchdog reset
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected!");
      stopMotors();
      setBuzzerPattern(3, 300); // 3 Slow Beeps for WS Disconnect
      break;
    case WStype_CONNECTED:
      Serial.println("[WS] Connected to url");
      setBuzzerPattern(2, 100); // 2 Short Beeps for WS Connect
      {
        StaticJsonDocument<128> doc;
        doc["type"] = "init-esp";
        doc["deviceId"] = deviceId;
        String output;
        serializeJson(doc, output);
        webSocket.sendTXT(output);
      }
      break;
    case WStype_TEXT:
      {
        StaticJsonDocument<512> doc;
        DeserializationError error = deserializeJson(doc, payload);
        if (error) {
          Serial.println("[WS] JSON Parse Error");
          return;
        }

        String msgType = doc["type"];
        
        if (msgType == "hello_ack") {
          Serial.println("[WS] Hello Ack received");
        } 
        else if (msgType == "frontend-connected") {
          Serial.println("[WS] Frontend Connected -> Forcing Telemetry sync");
          sendTelemetry(); // Force sync immediately
        } 
        else if (msgType == "modeSwitch") {
          mode = doc["data"]["mode"].as<String>();
          Serial.println("Mode switched to: " + mode);
          stopMotors();
          setBuzzerPattern(1, 200); // 1 Beep on Mode Switch
        }
        else if (msgType == "motorControl" && mode == "manual") {
          lastCommandTime = millis();
          int spl = doc["data"]["speedLeft"];
          int spr = doc["data"]["speedRight"];
          setMotors(spl, spr);
        }
        else if (msgType == "conveyorControl") {
          bool active = doc["data"]["active"];
          if (active) {
            digitalWrite(IN3, HIGH);
            digitalWrite(IN4, LOW);
            analogWrite(ENB, CONVEYOR_SPEED);
            conveyorRunning = true;
            sendEvent("conveyorActive", "info", "Conveyor manually started");
          } else {
            analogWrite(ENB, 0);
            conveyorRunning = false;
          }
        }
      }
      break;
  }
}

void readSensors() {
  front = sonarFront.ping_cm();
  leftD = sonarLeft.ping_cm();
  rightD = sonarRight.ping_cm();

  bool newWaste = (digitalRead(IR1) == LOW || digitalRead(IR2) == LOW || digitalRead(IR3) == LOW);
  
  if (newWaste && !wasteDetected) {
    sendEvent("wasteDetected", "info", "Waste detected by IR sensors");
    setBuzzerPattern(2, 50); // 2 Very Short Beeps for Waste Detect
  }
  wasteDetected = newWaste;
}

void sendTelemetry() {
  StaticJsonDocument<256> doc;
  doc["type"] = "telemetry";
  doc["source"] = "device";
  doc["deviceId"] = deviceId;
  
  JsonObject data = doc.createNestedObject("data");
  data["speedLeft"] = currentSpeedLeft;
  data["speedRight"] = currentSpeedRight;
  
  // Approximate distance based on speed and time
  if(currentSpeedLeft > 0 || currentSpeedRight > 0) {
     currentDistance += 0.05; // Dummy distance calculation
  }
  data["distance"] = currentDistance;
  data["heading"] = 90; // Dummy heading
  data["battery"] = 95.0; // Dummy battery
  data["mode"] = mode; // Send current mode to frontend

  JsonObject sensors = data.createNestedObject("sensors");
  sensors["front"] = front;
  sensors["left"] = leftD;
  sensors["right"] = rightD;
  sensors["wasteDetected"] = wasteDetected;

  String output;
  serializeJson(doc, output);
  webSocket.sendTXT(output);
}

void sendEvent(String eventType, String severity, String message) {
  StaticJsonDocument<256> doc;
  doc["type"] = eventType;
  doc["source"] = "device";
  doc["deviceId"] = deviceId;
  
  JsonObject data = doc.createNestedObject("data");
  data["severity"] = severity;
  data["message"] = message;

  String output;
  serializeJson(doc, output);
  webSocket.sendTXT(output);
}

void autoNavigation() {
  if (front > 0 && front < OBSTACLE_DIST) {
    stopMotors();
    sendEvent("obstacleDetected", "warning", "Obstacle closer than threshold");
    setBuzzerPattern(1, 100); // 1 Short Beep for Obstacle Avoidance
    
    if (leftD > rightD) {
      steering.write(45);
      setMotors(TURN_SPEED, TURN_SPEED);
    } else {
      steering.write(135);
      setMotors(TURN_SPEED, TURN_SPEED);
    }
    delay(500); // Quick turn
  } else {
    steering.write(90);
    setMotors(DEFAULT_SPEED, DEFAULT_SPEED);
  }
}

void setMotors(int spl, int spr) {
  currentSpeedLeft = spl;
  currentSpeedRight = spr;
  
  if (spl >= 0) {
    digitalWrite(IN1, HIGH);
    digitalWrite(IN2, LOW);
    analogWrite(ENA, spl);
  } else {
    digitalWrite(IN1, LOW);
    digitalWrite(IN2, HIGH);
    analogWrite(ENA, -spl); // Ensure positive PWM
  }

  // Session Tracking: Start
  if (!isMachineMoving && (spl != 0 || spr != 0)) {
    isMachineMoving = true;
    sessionStartTime = getFormattedTime();
    sendEvent("machineStarted", "info", "Machine started moving at " + sessionStartTime);
  }
}

void stopMotors() {
  analogWrite(ENA, 0);
  currentSpeedLeft = 0;
  currentSpeedRight = 0;

  // Session Tracking: Stop
  if (isMachineMoving) {
    isMachineMoving = false;
    String stopTime = getFormattedTime();
    sendEvent("machineStopped", "info", "Machine stopped moving at " + stopTime + " (Session started at " + sessionStartTime + ")");
  }
}

void handleConveyor() {
  if (wasteDetected && !conveyorRunning) {
    digitalWrite(IN3, HIGH);
    digitalWrite(IN4, LOW);
    analogWrite(ENB, CONVEYOR_SPEED);
    conveyorStart = millis();
    conveyorRunning = true;
    sendEvent("conveyorActive", "info", "Conveyor auto started");
  }

  if (conveyorRunning && millis() - conveyorStart > 2000) {
    analogWrite(ENB, 0);
    conveyorRunning = false;
  }
}