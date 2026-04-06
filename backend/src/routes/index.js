const express = require('express');
const router = express.Router();

const scan = require('../controllers/scanController');
const history = require('../controllers/historyController');
const update = require('../controllers/updateController');
const recon = require('../controllers/reconController');

router.use((req, res, next) => {
    console.log(`\n[ROUTER] İstek Geldi: ${req.method} /api/scan${req.url}`);
    next();
});

// --- ROTALAR (SIRALAMA ÇOK ÖNEMLİDİR) ---
router.get('/start', scan.startScan);
router.get('/stream', scan.streamProgress);

router.get('/operations/history', history.getHistory);
router.delete('/operations/history', history.clearHistory);

router.post('/recon/start', recon.startRecon);

router.get('/updates/check', update.checkUpdates);
router.post('/updates/start', update.startUpdate);
router.get('/updates/stream', update.streamProgress);

// DİKKAT: Bu dinamik /:id rotası EN ALTTA olmak zorundadır!
router.get('/:id', scan.getScanDetails);

router.post('/recon/start', recon.startRecon);
router.get('/recon/stream', recon.streamReconProgress);

module.exports = router;