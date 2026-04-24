# Comprehensive System Architecture & Flowcharts

This document provides an in-depth visualization of the AquaBot IIoT platform's internal mechanics, networking, state logic, and database architecture using detailed Mermaid diagrams.

---

## 1. Complete System Data Flow (DFD)

This diagram illustrates the macro-level data flow across all three layers of the stack: Edge (Hardware), Server (Node.js), and Client (React).

```mermaid
graph TD
    subgraph Edge Layer [ESP32 Hardware]
        direction TB
        Sensors[Sensor Array<br/>Ultrasonic, IR] -->|Raw I/O| ESP[ESP32 Main Loop]
        ESP -->|PWM Signals| Actuators[DC Motors, Conveyor, Servo]
        ESP -->|20Hz Telemetry| WSC[WiFi WebSocket Client]
    end

    subgraph Transport Layer [Local Network / Internet]
        direction LR
        WSC <-->|WSS / JSON Packets| NGNX[Network Router / Gateway]
    end

    subgraph Backend Layer [Node.js Server]
        direction TB
        NGNX <-->|Port 3000| WSM[WebSocket Manager]
        WSM -->|Data Validation| Router[Message Router]
        Router -->|Persist Telemetry| MDB[(MongoDB Mongoose)]
        Router -->|Filter Events| MDB
        Router -->|Broadcast| WSS[WebSocket Server]
    end

    subgraph Client Layer [React Dashboard]
        direction TB
        WSS <-->|Socket Push| Hook[useCustomWebSocket.ts]
        Hook -->|React State| App[App.tsx State Engine]
        App -->|Props| Dash[Dashboard Charts]
        App -->|Props| Ctrl[Control Panel UI]
        App -->|Props| Event[Event Log Stream]
        Ctrl -->|User Commands| Hook
    end
```

---

## 2. Advanced Component Architecture (React Frontend)

Visualizing the exact component tree and state propagation down the React application.

```mermaid
classDiagram
    class App {
        +ReadyState connectionState
        +Array telemetryData
        +Array events
        +useCustomWebSocket()
        +sendCommand(type, data)
    }
    class Dashboard {
        +Object currentTelemetry
        +Array telemetryHistory
        +renderRecharts()
    }
    class ControlPanel {
        +String currentMode
        +Boolean deviceOnline
        +handleMotorControl()
        +toggleAutonomous()
    }
    class EventLog {
        +Array recentEvents
        +renderNotifications()
    }
    class MetricCard {
        +String title
        +Number value
    }

    App *-- Dashboard : Passes telemetry state
    App *-- ControlPanel : Passes sendCommand callback
    App *-- EventLog : Passes event array
    Dashboard *-- MetricCard : Renders 4x instances
```

---

## 3. Database Entity Relationship Diagram (ERD)

This illustrates the MongoDB relational structure (simulated via Mongoose references).

```mermaid
erDiagram
    DEVICE ||--o{ TELEMETRY : "Generates (20Hz)"
    DEVICE ||--o{ EVENT : "Triggers"
    
    DEVICE {
        ObjectId _id PK
        String deviceId UK
        String status "online | offline"
        Date lastSeen
    }
    
    TELEMETRY {
        ObjectId _id PK
        String deviceId FK
        Date ts "Timeseries Index"
        Number speedLeft
        Number speedRight
        Number distance
        Object sensors "front, left, right, waste"
    }
    
    EVENT {
        ObjectId _id PK
        String deviceId FK
        String type "obstacleDetected | fault"
        String severity "info | warning | critical"
        Date ts
        Object data "contextual message"
    }
```

---

## 4. Hardware Failsafe & Dead-Man's Switch Logic

This sequence visualizes the critical safety mechanism that prevents the robot from losing control if the network connection dies while motors are active.

```mermaid
sequenceDiagram
    participant React as React (Operator)
    participant Server as Node.js
    participant ESP as ESP32 (Robot)
    
    Note over ESP: Robot in Manual Mode
    React->>Server: {"type": "motorControl", "direction": "forward"}
    Server->>ESP: motorControl packet
    
    Note over ESP: millis() captured as lastCommandTime<br/>Motors Engaged (PWM > 0)
    
    loop Every 10ms (Watchdog)
        ESP->>ESP: Check (millis() - lastCommandTime) > 500ms?
        Note over ESP: Result: FALSE (Keep driving)
    end
    
    Note over React,Server: NETWORK CONNECTION DROPS
    
    loop Every 10ms (Watchdog)
        ESP->>ESP: Check (millis() - lastCommandTime) > 500ms?
        Note over ESP: Result: TRUE (Timeout Exceeded!)
    end
    
    Note right of ESP: 🚨 FAILSAFE TRIGGERED 🚨
    ESP->>ESP: analogWrite(ENA, 0) (HARD STOP)
    ESP->>Server: {"type": "event", "type": "fault", "data": "Failsafe activated"}
    Note over ESP: Awaiting new valid command
```

---

## 5. End-to-End WebSocket Handshake & Resurrection

Demonstrating the explicit handshake protocol and auto-reconnect resilience built into the frontend hook.

```mermaid
stateDiagram-v2
    [*] --> Uninstantiated
    Uninstantiated --> Connecting : App Mounts
    
    Connecting --> Open : TCP/WS Socket Up
    Connecting --> Closed : Server Refusal
    
    state Open {
        [*] --> SendInitFrontend
        SendInitFrontend --> WaitAck
        WaitAck --> HeartbeatActive
    }
    
    Open --> Closing : Browser Closes
    Open --> Closed : Network Drops
    
    state Closed {
        [*] --> TimeoutWait
        TimeoutWait --> Reconnecting : After 3000ms
    }
    
    Reconnecting --> Connecting : retryCount++
    
    Closing --> [*]
```

---

## 6. Autonomous Evasion State Machine (Robot Brain)

The exact micro-decisions made by the ESP32 while in autonomous operating mode.

```mermaid
flowchart TD
    START((Loop Start)) --> CHK_FRONT{Front Sonar < 30cm?}
    
    CHK_FRONT -->|Yes| EVADE[Execute Hard Stop]
    EVADE --> FIRE_EVT[Emit 'obstacleDetected' Event]
    FIRE_EVT --> CHK_SIDES{Left > Right?}
    
    CHK_SIDES -->|Yes| TURN_LEFT[Servo 45° + L/R PWM]
    CHK_SIDES -->|No| TURN_RIGHT[Servo 135° + L/R PWM]
    
    TURN_LEFT --> DELAY[500ms Delay]
    TURN_RIGHT --> DELAY
    DELAY --> START
    
    CHK_FRONT -->|No| CRUISE[Servo 90° + Forward PWM]
    CRUISE --> CHK_WASTE{IR Blocked?}
    
    CHK_WASTE -->|Yes| CHK_CONV{Conveyor Running?}
    CHK_WASTE -->|No| START
    
    CHK_CONV -->|Yes| CHK_TIME{Time > 2000ms?}
    CHK_CONV -->|No| START_CONV[Start Conveyor PWM]
    START_CONV --> LOG_START[Timestamp conveyorStart]
    LOG_START --> START
    
    CHK_TIME -->|Yes| STOP_CONV[Stop Conveyor PWM]
    CHK_TIME -->|No| START
    STOP_CONV --> START
```
