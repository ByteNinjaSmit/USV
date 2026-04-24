import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info'
  },
  ts: {
    type: Date,
    default: Date.now
  },
  data: {
    type: Object,
    default: {}
  }
});

export default mongoose.model('Event', eventSchema);
