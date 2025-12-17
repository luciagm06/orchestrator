'use strict';

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/predict';

async function connectMongo() {
  try {
    if (!MONGO_URI) {
      throw new Error('MONGO_URI no definida');
    }

    console.log('[ORCHESTRATOR-MONGO] Intentando conectar a:', MONGO_URI);

    await mongoose.connect(MONGO_URI);

    console.log('[ORCHESTRATOR-MONGO] Conectado a MongoDB');
    
    mongoose.connection.on('error', (err) => {
      console.error('[ORCHESTRATOR-MONGO] Error:', err);
    });

  } catch (err) {
    console.error('[ORCHESTRATOR-MONGO] Error de conexion:', err);
    process.exit(1);
  }
}

module.exports = connectMongo;