const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Senin Mevcut Görevlerin
  startScan: () => ipcRenderer.invoke('scan:start'),
  getHistory: () => ipcRenderer.invoke('scan:history'),
  getDetails: (scanId) => ipcRenderer.invoke('scan:details', scanId),

  // Pencere Butonları
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // --- YENİ EKLENEN: KİMLİK KÖPRÜSÜ ---
  getMachineId: () => ipcRenderer.invoke('get-machine-id')
});
