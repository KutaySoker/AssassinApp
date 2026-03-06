const express = require('express');
const router = express.Router();

// --- CONTROLLER BAĞLANTILARI ---
// 1. Eski Scan Rotaları
const { startScan, getHistory: getScanHistory, getScanDetails, streamProgress } = require('../controllers/scanController');

// 2. Update Rotaları
const { checkUpdates, startUpdate, streamUpdateProgress } = require('../controllers/updateController');

// 3. YENİ: History (Kara Kutu) Rotaları
// (İsim çakışmasını önlemek için getHistory'i getOpHistory olarak içeri alıyoruz)
const { getHistory: getOpHistory, clearHistory } = require('../controllers/historyController');


// --- TARAMA (SCAN) ROTALARI ---
router.get('/start', startScan);
router.get('/history', getScanHistory); // Bu senin eski spesifik scan geçmişin
router.get('/stream', streamProgress); 
router.get('/:id', getScanDetails); 

// --- GÜNCELLEME (UPDATE) ROTALARI ---
router.get('/updates/check', checkUpdates); 
router.post('/updates/start', startUpdate); 
router.get('/updates/stream', streamUpdateProgress); 

// --- YENİ: OPERASYON GEÇMİŞİ (KARA KUTU) ROTALARI ---
// server.js'de bu dosya '/api/scan' altına bağlandığı için 
// Frontend'den buraya istek atarken '/api/scan/operations/history' adresini kullanacağız
router.get('/operations/history', getOpHistory);
router.delete('/operations/history', clearHistory);

module.exports = router;