'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OrchestrationSchema = new Schema({
  correlationId: {
    type: String,
    required: true,
    unique: true
  },
  dataId: {
    type: Schema.Types.ObjectId,
    required: false
  },
  predictionId: {
    type: Schema.Types.ObjectId,
    required: false
  },
  features: {
    type: [Number],
    required: false
  },
  prediction: {
    type: Number,
    required: false
  },
  acquireLatencyMs: {
    type: Number,
    default: 0
  },
  predictLatencyMs: {
    type: Number,
    default: 0
  },
  totalLatencyMs: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'error'],
    required: true
  },
  error: {
    type: String,
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Orchestration', OrchestrationSchema, 'orchestrations');