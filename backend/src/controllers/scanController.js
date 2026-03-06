const { performFullScan, progressEmitter } = require('../services/scanManager');
const prisma = require('../config/db');
const { addLog } = require('./historyController');

// Taramayı Başlatır
// Taramayı Başlatır
async function startScan(req, res) {
  try {
    const result = await performFullScan();
    
    // --- NÜKLEER ÇÖZÜM BURADA ---
    // Prisma'ya gidip "Bana veritabanına eklenen EN SON taramayı getir" diyoruz.
    const lastScan = await prisma.scanHistory.findFirst({
      orderBy: { startedAt: 'desc' }
    });

    // result.id varsa onu al, yoksa result.scanId al, o da yoksa direkt veritabanındaki son taramanın ID'sini (lastScan.id) çak!
    const gercekTaramaID = result.id || result.scanId || (lastScan ? lastScan.id : null); 

    // Kara Kutu'ya (History) KESİN GERÇEK ID ile log atıyoruz
    addLog({ 
        id: gercekTaramaID, 
        status: "SCANNED", 
        message: "Güvenlik zafiyet taraması tamamlandı.", 
        apps: [] 
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Controller Hatası:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Geçmiş Taramaları Getirir
async function getHistory(req, res) {
  try {
    const history = await prisma.scanHistory.findMany({
      orderBy: { startedAt: 'desc' },
      include: { _count: { select: { apps: true } } }
    });
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Tek Bir Taramanın Detayını Getirir
async function getScanDetails(req, res) {
  try {
    const scanId = req.params.id; // UUID için parseInt KULLANMIYORUZ!
    const details = await prisma.scanHistory.findUnique({
      where: { id: scanId },
      include: { apps: { include: { vulnerabilities: true } } }
    });
    res.json({ success: true, data: details });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// CANLI YAYIN FONKSİYONU (SSE)
async function streamProgress(req, res) {
  // Express'in bunu JSON'a çevirmesini KESİN OLARAK engelliyoruz
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*' // CORS patlamasını engeller
  });

  const sendProgress = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  progressEmitter.on('progress', sendProgress);

  req.on('close', () => {
    progressEmitter.off('progress', sendProgress);
  });
}

module.exports = { startScan, getHistory, getScanDetails, streamProgress };