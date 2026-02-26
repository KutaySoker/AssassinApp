const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Tarama Başlat
  startScan: () => ipcRenderer.invoke('scan:start'),
  
  // Geçmişi Getir
  getHistory: () => ipcRenderer.invoke('scan:history'),
  
  // Detay Getir
  getDetails: (scanId) => ipcRenderer.invoke('scan:details', scanId)
});