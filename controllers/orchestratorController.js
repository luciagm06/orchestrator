'use strict';

const axios = require('axios');
const Orchestration = require('../models/orchestration');

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

    console.log('[ORCHESTRATOR] Llamando a Acquire...');
    
    const acquireResponse = await axios.post(
      `${ACQUIRE_URL}/data`,
      {},
      { timeout: 30000 }
    );

    const acquireData = acquireResponse.data;
    console.log('[ORCHESTRATOR] Datos obtenidos de Acquire');
    console.log('[ORCHESTRATOR] dataId:', acquireData.dataId);
    console.log('[ORCHESTRATOR] features:', acquireData.features);

    console.log('[ORCHESTRATOR] Llamando a Predict...');

    const predictResponse = await axios.post(
      `${PREDICT_URL}/predict`,
      {
        features: acquireData.features,
        meta: {
          featureCount: acquireData.featureCount,
          dataId: acquireData.dataId,
          source: 'orchestrator',
          correlationId: correlationId
        }
      },
      { timeout: 30000 }
    );

    const predictData = predictResponse.data;
    console.log('[ORCHESTRATOR] Prediccion obtenida');
    console.log('[ORCHESTRATOR] predictionId:', predictData.predictionId);
    console.log('[ORCHESTRATOR] prediction:', predictData.prediction);

    const orchestration = await Orchestration.create({
      correlationId,
      dataId: acquireData.dataId,
      predictionId: predictData.predictionId,
      features: acquireData.features,
      prediction: predictData.prediction,
      acquireLatencyMs: acquireData.latencyMs || 0,
      predictLatencyMs: predictData.latencyMs || 0,
      totalLatencyMs: Date.now() - startTime,
      status: 'success',
      timestamp: new Date()
    });

    console.log('[ORCHESTRATOR] Orquestacion guardada. ID:', orchestration._id);

    const response = {
      dataId: acquireData.dataId,
      predictionId: predictData.predictionId,
      prediction: predictData.prediction,
      timestamp: predictData.timestamp  
    };

    res.status(200).json(response);

  } catch (err) {
    console.error('[ORCHESTRATOR] Error:', err.message);

    try {
      await Orchestration.create({
        correlationId,
        status: 'error',
        error: err.message,
        totalLatencyMs: Date.now() - startTime,
        timestamp: new Date()
      });
    } catch (dbErr) {
      console.error('[ORCHESTRATOR] Error al guardar en MongoDB:', dbErr);
    }

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
