const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scanController');

// http://localhost:3000/api/scan/start adresine bağlar
router.get('/scan/start', scanController.startScan);
router.get('/scan/history', scanController.getHistory);
router.get('/scan/:id', scanController.getScanDetails);

module.exports = router;