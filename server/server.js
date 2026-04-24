import express from 'express';
import { createServer } from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import WSManager from './wsManager.js';
import Device from './models/Device.js';
import Telemetry from './models/Telemetry.js';
import Event from './models/Event.js';
import logger from './utils/logger.js';

dotenv.config();

const app = express();
const server = createServer(app);

// Setup WebSocket Manager
const wsManager = new WSManager(server);

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/iiot_robot';

// REST API for initial data load
app.get('/api/devices', async (req, res) => {
  try {
    const devices = await Device.find();
    res.json(devices);
  } catch (error) {
    logger.error(`Failed to fetch devices: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

app.get('/api/telemetry/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const telemetry = await Telemetry.find({ deviceId })
      .sort({ ts: -1 })
      .limit(limit);
    res.json(telemetry.reverse());
  } catch (error) {
    logger.error(`Failed to fetch telemetry: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch telemetry' });
  }
});

app.get('/api/events/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const events = await Event.find({ deviceId })
      .sort({ ts: -1 })
      .limit(limit);
    res.json(events);
  } catch (error) {
    logger.error(`Failed to fetch events: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

mongoose
  .connect(MONGO_URI, { family: 4 })
  .then(() => {
    logger.info('Connected to MongoDB');
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error(`Failed to connect to MongoDB: ${err.message}`);
  });
