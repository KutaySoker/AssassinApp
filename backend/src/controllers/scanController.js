const { performFullScan } = require('../services/scanManager');
const prisma = require('../config/db');

// Taramayı Başlatır
async function startScan(req, res) {
  try {
    const result = await performFullScan();
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
      include: {
        _count: {
          select: { apps: true }
        }
      }
    });
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Tek Bir Taramanın Detayını Getirir
async function getScanDetails(req, res) {
  try {
    // DİKKAT: UUID olduğu için parseInt KULLANMIYORUZ!
    const scanId = req.params.id; 
    
    const details = await prisma.scanHistory.findUnique({
      where: { id: scanId },
      include: {
        apps: {
          include: {
            vulnerabilities: true
          }
        }
      }
    });
    res.json({ success: true, data: details });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = { startScan, getHistory, getScanDetails };