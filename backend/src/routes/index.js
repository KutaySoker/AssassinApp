const express = require('express');
const router = express.Router();
const { startScan, getHistory, getScanDetails, streamProgress } = require('../controllers/scanController');

// BU YAZIYI TERMİNALDE GÖRMEZSEK SUNUCU GÜNCELLENMEMİŞ DEMEKTİR
console.log("🔥 SİBERPUNK ROTALARI AKTİF EDİLDİ!");

// MENTORUN ÇALIŞAN AYARI: Tekrar GET yapıyoruz!
router.get('/start', startScan); 
router.get('/history', getHistory);

// CANLI YAYIN ROTASI (Kesinlikle :id'den üstte)
router.get('/stream', streamProgress); 

// JOKER ROTA EN ALTTA
router.get('/:id', getScanDetails); 

module.exports = router;