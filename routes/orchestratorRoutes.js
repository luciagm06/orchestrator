'use strict';

const express = require('express');
const router = express.Router();
const orchestratorController = require('../controllers/orchestratorController');

router.get('/health', orchestratorController.health);
router.post('/predict', orchestratorController.predict);

module.exports = router;