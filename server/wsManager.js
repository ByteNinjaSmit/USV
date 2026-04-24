import { WebSocketServer, WebSocket } from 'ws';
import Device from './models/Device.js';
import Telemetry from './models/Telemetry.js';
import Event from './models/Event.js';
import logger from './utils/logger.js';

class WSManager {
  constructor(server) {
    this.wss = new WebSocketServer({ server });
    this.frontendClients = new Map(); // frontendId => ws
    this.espDevices = new Set();      // list of esp device sockets

    this.wss.on('connection', (ws) => {
      logger.info('New WebSocket connection established');

      ws.on('message', async (message) => {
        try {
          // Normalize Buffer vs String
          let msgStr = message;
          if (Buffer.isBuffer(message)) {
            msgStr = message.toString('utf-8');
          }
          const parsedMessage = JSON.parse(msgStr);
          await this.handleMessage(ws, parsedMessage);
        } catch (error) {
          logger.error(`Failed to parse message: ${error.message} - Raw: ${message.toString()}`);
        }
      });

      ws.on('close', () => {
        logger.info('WebSocket client disconnected');

        // Check if it was a frontend
        if (ws.frontendId) {
          this.frontendClients.delete(ws.frontendId);
          logger.info(`Frontend ${ws.frontendId} removed`);
        }

        // Check if it was an ESP device
        if (ws.isEspDevice) {
          this.espDevices.delete(ws);
          logger.info(`ESP device ${ws.deviceId || ''} removed`);
          if (ws.deviceId) {
            this.updateDeviceStatus(ws.deviceId, 'offline');
            this.broadcastToFrontend({
              type: 'deviceStatus',
              deviceId: ws.deviceId,
              data: { status: 'offline' }
            });
          }
        }
      });
      
      ws.on('error', (err) => logger.error(`WebSocket Error: ${err.message}`));
    });
  }

  async handleMessage(ws, parsedMessage) {
    // 1. Initialization Handling
    if (parsedMessage.type === "init-frontend") {
      const frontendId = parsedMessage.frontendId || `front-${Date.now()}`;
      this.frontendClients.set(frontendId, ws);
      ws.frontendId = frontendId;
      logger.info(`Frontend registered with ID: ${frontendId}`);

      // Notify all ESP devices: "new frontend connected"
      for (let espWs of this.espDevices) {
        if (espWs.readyState === WebSocket.OPEN) {
          espWs.send(JSON.stringify({ type: "frontend-connected" }));
          logger.info(`Forwarded frontend-connected to ESP device`);
        }
      }
      ws.send(JSON.stringify({ type: 'hello_ack', timestamp: Date.now() }));
      return;
    } 
    
    if (parsedMessage.type === "init-esp") {
      this.espDevices.add(ws);
      ws.isEspDevice = true;
      ws.deviceId = parsedMessage.deviceId || 'esp32-01';
      logger.info(`ESP device registered: ${ws.deviceId}`);

      await this.updateDeviceStatus(ws.deviceId, 'online');
      this.broadcastToFrontend({
        type: 'deviceStatus',
        deviceId: ws.deviceId,
        data: { status: 'online' }
      });
      return;
    }

    // 2. Message from Frontend (Control Commands)
    if (ws.frontendId) {
      // Forward commands to ESP devices
      if (['motorControl', 'servoControl', 'modeSwitch', 'conveyorControl'].includes(parsedMessage.type)) {
        logger.info(`Received command from frontend ${ws.frontendId}: ${parsedMessage.type}`);
        const msgStr = JSON.stringify(parsedMessage);
        
        for (let espWs of this.espDevices) {
          if (espWs.readyState === WebSocket.OPEN) {
            espWs.send(msgStr);
          }
        }
      }
      return;
    }

    // 3. Message from ESP (Telemetry & Events)
    if (ws.isEspDevice) {
      const { type, data } = parsedMessage;
      
      // Save Telemetry
      if (type === 'telemetry') {
        try {
          const telemetry = new Telemetry({
            deviceId: ws.deviceId,
            ...data
          });
          await telemetry.save();
          this.broadcastToFrontend(parsedMessage);
        } catch (err) {
          logger.error(`Failed to save telemetry: ${err.message}`);
        }
      }
      
      // Save Events
      if (['obstacleDetected', 'wasteDetected', 'fault', 'conveyorActive', 'machineStarted', 'machineStopped'].includes(type)) {
        try {
          const event = new Event({
            deviceId: ws.deviceId,
            type,
            severity: data?.severity || 'info',
            data
          });
          await event.save();
          this.broadcastToFrontend(parsedMessage);
        } catch (err) {
          logger.error(`Failed to save event: ${err.message}`);
        }
      }
    }
  }

  broadcastToFrontend(message) {
    const msgStr = JSON.stringify(message);
    for (let [frontendId, clientWs] of this.frontendClients.entries()) {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(msgStr);
      }
    }
  }

  async updateDeviceStatus(deviceId, status) {
    try {
      await Device.findOneAndUpdate(
        { deviceId },
        { status, lastSeen: Date.now() },
        { upsert: true, new: true }
      );
    } catch (err) {
      logger.error(`Failed to update device status: ${err.message}`);
    }
  }
}

export default WSManager;
