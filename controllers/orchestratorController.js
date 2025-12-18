'use strict';

const axios = require('axios');

const ACQUIRE_URL = process.env.ACQUIRE_URL || 'http://acquire:3001';
const PREDICT_URL = process.env.PREDICT_URL || 'http://predict:3002';

function health(req, res) {
  res.json({
    status: 'ok',
    service: 'orchestrator'
  });
}

async function run(req, res) {
  const startTime = Date.now();
  const correlationId = generateCorrelationId();

  try {
    console.log('[ORCHESTRATOR] Nueva peticion POST /run');
    console.log('[ORCHESTRATOR] correlationId:', correlationId);

    const acquireResponse = await axios.post(
      `${ACQUIRE_URL}/data`,
      {},
      { timeout: 30000 }
    );

    const acquireData = acquireResponse.data;

    const targetDate = new Date(acquireData.createdAt);

    const timeEnd = new Date(targetDate);
    timeEnd.setDate(timeEnd.getDate() - 1);

    const timeStart = new Date(timeEnd);
    timeStart.setDate(timeStart.getDate() - 3);

    const predictResponse = await axios.post(
      `${PREDICT_URL}/predict`,
      {
        features: acquireData.features,
        meta: {
          featureCount: acquireData.featureCount,
          dataId: acquireData.dataId,
          source: 'orchestrator',
          correlationId: correlationId,
          target_date: targetDate.toISOString(),
          time_start: timeStart.toISOString(),
          time_end: timeEnd.toISOString()
        }
      },
      { timeout: 30000 }
    );

    const predictData = predictResponse.data;

    const totalLatency = Date.now() - startTime;
    console.log('[ORCHESTRATOR] Flujo completado en', totalLatency, 'ms');

    res.status(200).json({
      dataId: acquireData.dataId,
      predictionId: predictData.predictionId,
      prediction: predictData.prediction,
      timestamp: predictData.timestamp
    });

  } catch (err) {
    console.error('[ORCHESTRATOR] Error:', err.message);

    let statusCode = 500;
    let errorType = 'Internal Server Error';

    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      statusCode = 502;
      errorType = 'Bad Gateway';
    } else if (err.code === 'ETIMEDOUT' || err.message.includes('timeout')) {
      statusCode = 504;
      errorType = 'Gateway Timeout';
    }

    res.status(statusCode).json({
      error: errorType,
      message: err.message,
      correlationId: correlationId
    });
  }
}

function generateCorrelationId() {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

module.exports = {
  health,
  run
};
