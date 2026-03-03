const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Senin Mevcut API Görevlerin
  startScan: () => ipcRenderer.invoke('scan:start'),
  getHistory: () => ipcRenderer.invoke('scan:history'),
  getDetails: (scanId) => ipcRenderer.invoke('scan:details', scanId),

  // YENİ EKLENEN: Siberpunk Pencere Butonları İçin Köprüler
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close')
});