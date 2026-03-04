const express = require('express');
const router = express.Router();

// Eski Scan rotaları
const { startScan, getHistory, getScanDetails, streamProgress } = require('../controllers/scanController');

// YENİ: Update rotaları (Burayı eklemeyi unutmuş veya dosya yolunu yanlış yazmış olabiliriz)
const { checkUpdates, startUpdate, streamUpdateProgress } = require('../controllers/updateController');

// --- TARAMA (SCAN) ROTALARI ---
router.get('/start', startScan);
router.get('/history', getHistory);
router.get('/stream', streamProgress); // Tarama canlı yayını
router.get('/:id', getScanDetails); 

// --- GÜNCELLEME (UPDATE) ROTALARI ---
router.get('/updates/check', checkUpdates); // Güncellemeleri denetle
router.post('/updates/start', startUpdate); // Güncellemeyi başlat
router.get('/updates/stream', streamUpdateProgress); // Güncelleme canlı yayını

module.exports = router;