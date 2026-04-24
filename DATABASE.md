# Database Architecture & Schemas

AquaBot utilizes MongoDB to ensure high-throughput telemetry ingestion and reliable event persistence. The database is interfaced via Mongoose ODM.

## Collection Overview

1. **`devices`**: Tracks the registry, heartbeat, and online/offline status of edge devices.
2. **`telemetries`**: A high-frequency timeseries-style collection capturing the physical state of the robot multiple times a second.
3. **`events`**: A log of significant system occurrences (e.g., autonomous obstacle evasion, waste collection, errors).

---

## 1. Device Schema (`devices`)
Manages fleet inventory and active connection status.

```json
{
  "deviceId": "String (Unique, Required)",
  "status": "String (Enum: ['online', 'offline'], Default: 'offline')",
  "lastSeen": "Date (Default: Date.now)",
  "meta": "Object (For future fleet metadata)"
}
```

## 2. Telemetry Schema (`telemetries`)
Optimized for rapid ingestion. This tracks the robot's physical variables over time for chart rendering and historical playback.

```json
{
  "deviceId": "String (Indexed, Required)",
  "ts": "Date (Indexed, Default: Date.now)",
  "speedLeft": "Number (PWM value)",
  "speedRight": "Number (PWM value)",
  "distance": "Number (Computed distance traveled)",
  "heading": "Number (Compass/IMU orientation in degrees)",
  "position": {
    "x": "Number",
    "y": "Number"
  },
  "battery": "Number (Percentage 0-100)",
  "sensors": {
    "front": "Number (Ultrasonic cm)",
    "left": "Number (Ultrasonic cm)",
    "right": "Number (Ultrasonic cm)",
    "wasteDetected": "Boolean (IR sensor state)"
  }
}
```
*Note: In production with MongoDB 5.0+, this schema can be natively converted to a Time-Series collection using `{ timeseries: { timeField: 'ts', metaField: 'deviceId' } }`.*

## 3. Event Schema (`events`)
Used for the React Dashboard's Event Log and triggering external notifications.

```json
{
  "deviceId": "String (Indexed, Required)",
  "type": "String (e.g., 'obstacleDetected', 'wasteDetected', 'conveyorActive')",
  "severity": "String (Enum: ['info', 'warning', 'critical'], Default: 'info')",
  "ts": "Date (Default: Date.now)",
  "data": {
    "message": "String (Human readable reason)"
  }
}
```
