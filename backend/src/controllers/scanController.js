const { performFullScan } = require('../services/scanManager');
const prisma = require('../config/db');

// Taramayı Başlatır
async function startScan() {
  try {
    // Tarama servisini çağır
    const result = await performFullScan();
    return { success: true, data: result };
  } catch (error) {
    console.error("Controller Hatası:", error);
    return { success: false, error: error.message };
  }
}

// Geçmiş Taramaları Getirir
async function getHistory() {
  try {
    const history = await prisma.scanHistory.findMany({
      orderBy: { startedAt: 'desc' },
      include: {
        _count: {
          select: { apps: true }
        }
      }
    });
    return { success: true, data: history };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Tek Bir Taramanın Detayını Getirir (Hangi App'te ne zafiyet var?)
async function getScanDetails(scanId) {
  try {
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
    return { success: true, data: details };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = { startScan, getHistory, getScanDetails };