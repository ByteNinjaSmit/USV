# Core Algorithms & Logic

This document outlines the primary algorithms governing the AquaBot's edge intelligence, connection stability, and safety failsafes.

## 1. Autonomous Navigation & Obstacle Avoidance

When the ESP32 is set to `auto` mode, it relies entirely on its sensor array (3x Ultrasonic, 3x IR) to navigate bodies of water without human intervention.

### The Algorithm Workflow:
1. **Sensor Polling**: 
   Every loop iteration, the ESP32 reads the Front, Left, and Right ultrasonic distances in centimeters.
2. **Threshold Checking**:
   If the `front` distance is greater than 0 but less than the `OBSTACLE_DIST` threshold (e.g., 30cm), an obstacle is imminent.
3. **Evasive Maneuver**:
   * **Halt**: Immediately sets `analogWrite(ENA, 0)` to stop forward momentum.
   * **Evaluate**: Compares `leftD` and `rightD` to determine the path of least resistance.
   * **Turn**: 
     * If `leftD > rightD`, the servo turns to 45° and left-turn PWM is applied.
     * If `rightD > leftD`, the servo turns to 135° and right-turn PWM is applied.
   * **Alert**: Transmits an `obstacleDetected` event to the Node.js backend.
4. **Cruise**:
   If no obstacle is detected, the servo centers to 90° and standard forward PWM is applied.

## 2. Waste Detection & Automated Conveyor

The robot actively hunts for floating waste using IR sensors mounted near the collection intake.

### The Algorithm Workflow:
1. **IR Polling**: 
   Reads digital states from `IR1`, `IR2`, and `IR3`. A `LOW` reading indicates blocked light (waste present).
2. **Trigger Evaluation**:
   If `wasteDetected` flips from `false` to `true`, a `wasteDetected` event is fired to the backend.
3. **Conveyor Engagement**:
   If waste is detected and the conveyor is NOT currently running:
   * The conveyor motor driver (`ENB`) is supplied with `CONVEYOR_SPEED`.
   * A timestamp `conveyorStart = millis()` is recorded.
4. **Conveyor Timeout**:
   The conveyor runs for a fixed operational window (e.g., 2000ms) to pull the waste into the holding bin before automatically shutting off to conserve battery.

## 3. Communication State Machine & Telemetry Syncing

To ensure the React UI never displays stale data, the backend and ESP32 utilize a forced-sync handshake.

### The Algorithm Workflow:
1. **Frontend Connects**: React opens a WebSocket connection sending `{"type": "init-frontend"}`.
2. **Backend Routes**: The Node.js server maps the frontend ID and broadcasts `{"type": "frontend-connected"}` to all active ESP32 sockets.
3. **Edge Response**: The ESP32 parses `frontend-connected` and immediately bypasses its standard 50ms telemetry delay timer, executing an instant `sendTelemetry()` function call.
4. **Result**: The React dashboard populates with exact hardware parameters (speed, mode, sensors) within milliseconds of rendering.

## 4. Hardware Fail-Safe Algorithm (Dead Man's Switch)

In `manual` mode, if the WebSocket connection drops or the operator stops sending commands (e.g., browser crash), the robot must not sail away uncontrollably.

### The Algorithm Workflow:
1. **Timestamping**: Every time a `motorControl` WebSocket frame arrives, `lastCommandTime = millis()` is updated.
2. **Watchdog Loop**: Every main loop iteration, the ESP checks `millis() - lastCommandTime`.
3. **Trigger**: If the difference exceeds `FAILSAFE_TIMEOUT` (e.g., 500ms), and the motors are currently engaged, the ESP32 forcefully fires `stopMotors()`.
4. **Safety Reset**: Motors remain locked until a new valid `motorControl` frame is received.
