# An autonomous water surface-cleaning USV (Unmanned Surface Vehicle)

![Project Status](https://img.shields.io/badge/Status-Active-brightgreen)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-purple)
![Tech Stack](https://img.shields.io/badge/Tech-MERN%20%7C%20ESP32%20%7C%20WebSockets-orange)

This project is an advanced, real-time Industrial Internet of Things (IIoT) architecture designed for an autonomous water surface-cleaning USV (Unmanned Surface Vehicle). It seamlessly integrates an ESP32 hardware edge device, a high-performance Node.js/Express WebSocket backend, and a dynamic React (Vite) frontend dashboard.

This system guarantees ultra-low latency, bi-directional communication to monitor telemetry (speed, proximity, battery, orientation) and execute precise motor/conveyor controls in both manual and autonomous operating modes.

## 🚀 Key Features

*   **Ultra-Low Latency Telemetry**: The ESP32 edge device streams high-frequency (20Hz) sensory data over WebSockets directly to the frontend.
*   **Bi-Directional Control**: Operators can send real-time PWM motor commands, toggle conveyor belts, and switch operating modes instantaneously.
*   **Autonomous Navigation**: The robot features an onboard autonomous mode that uses ultrasonic sensors for obstacle avoidance and IR sensors for waste detection, adjusting motor behavior dynamically.
*   **Bulletproof WebSockets**: Custom-built connection management handling strict `frontend-connected` vs `init-esp` handshake protocols to guarantee immediate state syncing.
*   **Fail-Safe Architecture**: ESP32 firmware includes an aggressive fail-safe that forcefully stops all motors if the connection drops or manual commands cease for >500ms.
*   **Persistent Analytics**: All telemetry ticks and events (e.g., `obstacleDetected`, `wasteDetected`) are securely persisted to a MongoDB timeseries database for historical mapping and efficiency analysis.

---

## 🛠️ Technology Stack

### Hardware (Edge)
*   **Microcontroller**: ESP32
*   **Sensors**: Ultrasonic (HC-SR04 x3), IR Proximity Sensors (x3)
*   **Actuators**: DC Motors (via L298N drivers), Servo Motor (Steering)
*   **Firmware**: C++ (Arduino IDE) with `WebSocketsClient` and `ArduinoJson`

### Backend (Server)
*   **Environment**: Node.js
*   **Framework**: Express.js
*   **Real-time Engine**: `ws` (Native WebSockets)
*   **Database**: MongoDB (Mongoose ODM)
*   **Logging**: Winston (Structured, colorized console & file logging)

### Frontend (Client)
*   **Framework**: React 19 + TypeScript + Vite
*   **Styling**: Tailwind CSS v4 + ShadCN UI
*   **Charts**: Recharts (for live telemetry visualization)
*   **Icons**: Lucide React

---

## ⚙️ System Setup & Installation

### 1. Database Configuration
1. Install MongoDB locally or set up a MongoDB Atlas cluster.
2. Ensure MongoDB is running on port `27017` (default).

### 2. Backend Initialization
```bash
cd server
npm install
# Create a .env file if necessary (MONGO_URI=mongodb://127.0.0.1:27017/iiot_robot)
npm run dev
```
*The server will start on port `3000` and establish a connection to MongoDB.*

### 3. Frontend Initialization
```bash
cd client
npm install
npm run dev
```
*The dashboard will be available at `http://localhost:5173`.*

### 4. ESP32 Firmware Flashing
1. Open `ESP32/ESP32_WS/ESP32_WS.ino` in the Arduino IDE.
2. Modify the WiFi credentials:
   ```cpp
   const char* ssid = "YOUR_SSID";
   const char* password = "YOUR_PASSWORD";
   ```
3. Update the WebSocket Host IP to match your Node.js server's local network IP:
   ```cpp
   const char* ws_host = "192.168.1.100"; // Important!
   ```
4. Flash the firmware to your ESP32 board.

---

## 🧠 System Architecture
*For a detailed look at the data flow, please refer to [ARCHITECTURE.md](ARCHITECTURE.md).*

*For database schemas, please refer to [DATABASE.md](DATABASE.md).*

*For core robotic algorithms, please refer to [ALGORITHM.md](ALGORITHM.md).*
