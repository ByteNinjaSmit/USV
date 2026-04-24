# Hardware Reference & AutoMode Parameters

This document details the exact physical wiring connections for the ESP32, the mathematical parameters governing the autonomous operating mode, field definitions, and comprehensive troubleshooting steps.

---

## 1. AutoMode Conditions & Thresholds

The autonomous decision-making engine inside the ESP32 relies on several hardcoded thresholds. Adjusting these values in `ESP32_WS.ino` drastically alters the robot's driving behavior.

| Parameter | Threshold Value | Description |
| :--- | :--- | :--- |
| **`OBSTACLE_DIST`** | **`30 cm`** | The minimum safe distance allowed for the front ultrasonic sensor. If `front < 30cm`, an emergency halt is triggered and an evasion maneuver begins. |
| **`DEFAULT_SPEED`** | **`180 PWM`** | The default cruising speed of the DC motors when no obstacles are present. (Range: 0-255). |
| **`TURN_SPEED`** | **`120 PWM`** | The speed applied to the DC motors during an evasive turn. It is lower than cruising speed to prevent sliding/drifting on water. |
| **`CONVEYOR_SPEED`** | **`180 PWM`** | The speed applied to the conveyor belt motor when waste is detected. |
| **`CONVEYOR_TIMEOUT`** | **`2000 ms`** | The duration the conveyor belt runs after an IR sensor detects waste. Ensures the waste is fully pulled into the holding bin. |
| **`TELEMETRY_INTERVAL`**| **`50 ms` (20Hz)**| How often the ESP32 samples sensors and transmits state to the backend. |
| **`FAILSAFE_TIMEOUT`** | **`500 ms`** | In manual mode, if a `motorControl` command is not received within this time window, the motors instantly lock to `0 PWM`. |

### Evasion Logic Conditions:
*   **IF** `front < 30cm`:
    *   **AND IF** `left > right`: Servo steers `45°` (Left).
    *   **AND IF** `right >= left`: Servo steers `135°` (Right).
*   **IF** `front >= 30cm`: Servo centers to `90°` and robot drives forward at `180 PWM`.

---

## 2. Pin Connections (ESP32 Mapping)

The following table represents the exact GPIO mappings used in `ESP32_WS.ino`. Ensure your physical wiring exactly matches these pins to prevent hardware damage.

### Ultrasonic Sensors (HC-SR04)
| Sensor | Pin Name | ESP32 GPIO |
| :--- | :--- | :--- |
| **Front** | TRIG / ECHO | GPIO 5 / GPIO 18 |
| **Left** | TRIG / ECHO | GPIO 16 / GPIO 17 |
| **Right** | TRIG / ECHO | GPIO 4 / GPIO 2 |

### Infrared (IR) Proximity Sensors
| Sensor | ESP32 GPIO | Notes |
| :--- | :--- | :--- |
| **IR 1 (Left)** | GPIO 34 | Input Only Pin |
| **IR 2 (Center)**| GPIO 35 | Input Only Pin |
| **IR 3 (Right)**| GPIO 21 | Pull-up resistor may be required |

### Actuators & Motor Drivers (L298N)
| Component | Function | ESP32 GPIO |
| :--- | :--- | :--- |
| **DC Motors** | ENA (Speed) | GPIO 26 (PWM) |
| **DC Motors** | IN1 (Dir A) | GPIO 27 |
| **DC  Motors** | IN2 (Dir B) | GPIO 14 |
| **Conveyor** | ENB (Speed) | GPIO 25 (PWM) |
| **Conveyor** | IN3 (Dir A) | GPIO 33 |
| **Conveyor** | IN4 (Dir B) | GPIO 32 |
| **Steering** | Servo PWM | GPIO 13 |

---

## 3. Field Descriptions (Telemetry JSON Payload)

When the ESP32 transmits telemetry to the dashboard, it uses the following structure:

*   **`speedLeft` / `speedRight`**: Current motor speeds (-255 to 255). Negative denotes reverse.
*   **`distance`**: An estimated calculation of distance traveled based on motor PWM over time.
*   **`heading`**: Currently a placeholder (`90`). Ready for MPU6050 integration.
*   **`battery`**: Currently a placeholder (`95.0`). Ready for ADC voltage divider integration.
*   **`sensors.front / left / right`**: Distance to nearest obstacle in centimeters.
*   **`sensors.wasteDetected`**: Boolean `true/false` indicating if the IR sensor light path is currently blocked by trash.
*   **`mode`**: Operational state of the hardware (`"auto"` or `"manual"`).

---

## 4. Future Improvements

To take the AquaBot from a prototype to a production-grade industrial robot, consider implementing the following:

1.  **MPU6050 IMU Integration**: 
    *   Currently, the `heading` telemetry is mocked. Adding a 6-axis gyro/accelerometer will allow the robot to maintain a perfectly straight line despite water currents.
2.  **Battery Voltage Monitoring**: 
    *   Implement a voltage divider circuit on an ADC pin (e.g., GPIO 36) to read the actual LiPo battery voltage and send critical low-battery alerts to the dashboard.
3.  **GPS Waypoint Navigation**: 
    *   Adding a NEO-6M GPS module would allow the user to click points on a map in the React dashboard, dynamically sending latitude/longitude coordinates to the ESP32 for autonomous routing.
4.  **Computer Vision (ESP32-CAM)**: 
    *   Replace the IR sensors with an ESP32-CAM module running a lightweight TensorFlow Lite object detection model to distinguish between "trash" and "wildlife" before engaging the conveyor.

---

## 5. Troubleshooting Guide

### Issue: Dashboard rapidly connects and disconnects (Infinite Loop)
*   **Cause**: The React `useCustomWebSocket.ts` hook is re-rendering continuously.
*   **Fix**: Ensure you are using the updated `useRef` architecture for the connection configuration inside `App.tsx` (This bug was resolved in v1.1).

### Issue: Robot motors stutter or ESP32 resets continuously (Brownout)
*   **Cause**: The DC motors are drawing too much current, causing a voltage drop that starves the ESP32.
*   **Fix**: Ensure the L298N motor driver and the ESP32 are powered from separate, appropriately rated power supplies (e.g., a 12V LiPo for the driver, and a step-down 5V buck converter for the ESP32). Ensure both share a common ground (`GND`).

### Issue: Ultrasonic readings show `0 cm` or wildly jump
*   **Cause**: 5V logic mismatch or acoustic interference. The HC-SR04 requires 5V logic on the `ECHO` pin, but the ESP32 uses 3.3V logic.
*   **Fix**: Implement a simple voltage divider (e.g., 1kΩ and 2kΩ resistors) on the `ECHO` line before it reaches the ESP32 GPIO to drop 5V down to 3.3V.

### Issue: "WebSocket Error: EADDRINUSE" in Terminal
*   **Cause**: The Node.js server crashed, but the port `3000` was not cleanly released by the OS.
*   **Fix**: Run `npx kill-port 3000` or restart your terminal instance.
