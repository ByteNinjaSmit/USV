# Acoustic Signatures & Buzzer Logic

The AquaBot ESP32 firmware features a completely non-blocking, asynchronous acoustic feedback engine. This allows the robot to emit complex beep patterns to communicate its internal state without halting the main CPU loop (which would otherwise cause sensor polling delays or WebSocket timeouts).

---

## 1. Hardware Pinout

| Component | ESP32 GPIO | Description |
| :--- | :--- | :--- |
| **Buzzer** | `GPIO 22` | Digital Output. Requires a standard 3.3V/5V active buzzer. |

*Note: If using a passive buzzer, the `digitalWrite` logic must be replaced with `ledcWriteTone` for PWM frequency generation.*

---

## 2. Acoustic Event Patterns

The robot communicates its state using the following 7 programmed acoustic signatures. Operators can use these audible cues to diagnose system states without looking at the React dashboard.

| Event Trigger | Acoustic Pattern | Duration | Meaning |
| :--- | :--- | :--- | :--- |
| **WiFi Connected** | 1 Long Beep | `500ms` | The ESP32 has successfully authenticated and connected to the local WLAN. |
| **WebSocket Connected** | 2 Short Beeps | `100ms` | The TCP connection to the Node.js WebSocket server is established. |
| **Mode Switched** | 1 Medium Beep | `200ms` | The operator toggled between `manual` and `auto` mode via the UI. |
| **Waste Detected** | 2 Very Short Beeps| `50ms` | The IR sensors triggered, and the conveyor belt is actively engaging. |
| **Obstacle Evasion** | 1 Short Beep | `100ms` | An obstacle breached the `30cm` ultrasonic threshold. Evasion maneuver initiated. |
| **WebSocket Disconnected**| 3 Slow Beeps | `300ms` | Connection to the Node.js server was lost. The robot is halting. |
| **Failsafe Triggered** | 5 Rapid Beeps | `50ms` | Dead-man's switch activated. No manual command received within 500ms; motors hard-locked for safety. |

---

## 3. The Non-Blocking State Machine

Standard Arduino `delay()` commands block the entire CPU. If an evasion maneuver required 3 beeps of 300ms, the robot would drive completely blind for 900ms. 

To solve this, the AquaBot uses an asynchronous state machine called `handleBuzzer()`.

### How it Works:
1. **Triggering**: Calling `setBuzzerPattern(times, durationMs)` does not turn on the buzzer and wait. It simply updates global variables (`buzzerBeepsRemaining`, `buzzerDuration`, `buzzerState`) and records the current `millis()`.
2. **Execution**: The `handleBuzzer()` function runs at the very bottom of the main `loop()`.
3. **Evaluation**: Every loop iteration, it checks if `millis() - lastBuzzerToggle > buzzerDuration`. 
4. **Action**: If the duration has passed, it flips the `buzzerState` (`HIGH` to `LOW` or vice-versa) and decrements the remaining beeps. 

This guarantees the buzzer sequence runs flawlessly in the background while the robot continues reading sensors at 20Hz and processing WebSocket frames at ultra-low latency.
