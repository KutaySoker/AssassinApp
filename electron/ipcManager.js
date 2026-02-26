const { ipcMain } = require('electron');
const scanController = require('../backend/src/controllers/scanController');

function setupIpcHandlers() {
  // 1. Tarama Başlatma İsteği
  ipcMain.handle('scan:start', async () => {
    return await scanController.startScan();
  });

  // 2. Geçmişi Getirme İsteği
  ipcMain.handle('scan:history', async () => {
    return await scanController.getHistory();
  });

  // 3. Detay Getirme İsteği
  ipcMain.handle('scan:details', async (event, scanId) => {
    return await scanController.getScanDetails(scanId);
  });
  
  console.log("🔌 IPC Handlers kuruldu.");
}

module.exports = { setupIpcHandlers };