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
    // buraya nerden giriyo ne nerden giriyo
    // bu func içine nasıl giriyo

    scanId = 1;
    return await scanController.getScanDetails(scanId);
  });
  //abi ben de electrona yüzde yüz hakim edğilim ama ipc electronun kendi veri taşıma hizmeti gibi bişi 
  console.log("🔌 IPC Handlers kuruldu.");
}

module.exports = { setupIpcHandlers };