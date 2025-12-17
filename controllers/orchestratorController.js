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

async function predict(req, res) {
  const startTime = Date.now();
  const correlationId = generateCorrelationId();

  try {
    console.log('[ORCHESTRATOR] Nueva peticion de prediccion');
    console.log('[ORCHESTRATOR] correlationId:', correlationId);

    // PASO 1: Llamar a Acquire para obtener features
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

    // PASO 2: Llamar a Predict con las features
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

    // PASO 3: Guardar la orquestación en MongoDB
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

    // PASO 4: Responder al cliente
    const response = {
      orchestrationId: orchestration._id,
      correlationId: correlationId,
      dataId: acquireData.dataId,
      predictionId: predictData.predictionId,
      features: acquireData.features,
      prediction: predictData.prediction,
      timestamp: orchestration.timestamp,
      latency: {
        acquire: acquireData.latencyMs || 0,
        predict: predictData.latencyMs || 0,
        total: orchestration.totalLatencyMs
      }
    };

    res.status(200).json(response);

  } catch (err) {
    console.error('[ORCHESTRATOR] Error:', err.message);

    // Guardar el error en MongoDB
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

    res.status(500).json({
      error: 'Orchestration failed',
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
  predict
};