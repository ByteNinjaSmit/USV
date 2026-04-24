import mongoose from 'mongoose';

const telemetrySchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  ts: {
    type: Date,
    default: Date.now,
    index: true
  },
  distance: { type: Number },
  speed: { type: Number },
  direction: { type: String },
  position: {
    x: { type: Number },
    y: { type: Number }
  },
  battery: { type: Number },
  sensors: {
    front: { type: Number },
    left: { type: Number },
    right: { type: Number }
  }
}, {
  timeseries: {
    timeField: 'ts',
    metaField: 'deviceId',
    granularity: 'seconds'
  }
});

// Since the timeseries feature might require a specific MongoDB setup (5.0+), 
// let's ensure it doesn't break if they use a standard collection. 
// We will just use a normal collection with indexing to be safe across versions.
const safeTelemetrySchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  ts: {
    type: Date,
    default: Date.now,
    index: true
  },
  speedLeft: { type: Number },
  speedRight: { type: Number },
  distance: { type: Number },
  heading: { type: Number },
  position: {
    x: { type: Number },
    y: { type: Number }
  },
  battery: { type: Number },
  sensors: {
    front: { type: Number },
    left: { type: Number },
    right: { type: Number },
    wasteDetected: { type: Boolean }
  }
});

export default mongoose.model('Telemetry', safeTelemetrySchema);
