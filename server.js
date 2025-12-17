'use strict';

const express = require('express');
const orchestratorRoutes = require('./routes/orchestratorRoutes');
const connectMongo = require('./mongo');

const PORT = process.env.ORCHESTRATOR_PORT || 8080;

const app = express();
app.use(express.json());

app.use('/', orchestratorRoutes);

async function startServer() {
  try {
    console.log('[ENV] ORCHESTRATOR_PORT:', process.env.ORCHESTRATOR_PORT);
    console.log('[ENV] MONGO_URI:', process.env.MONGO_URI);
    console.log('[ENV] ACQUIRE_URL:', process.env.ACQUIRE_URL);
    console.log('[ENV] PREDICT_URL:', process.env.PREDICT_URL);
    
    await connectMongo();
    console.log('[ORCHESTRATOR] MongoDB conectado exitosamente');

    app.listen(PORT, () => {
      console.log(`[ORCHESTRATOR] Servicio escuchando en http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error('Error al iniciar orchestrator:', err);
    process.exit(1);
  }
}

startServer();