const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { setupIpcHandlers } = require('./ipcManager');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Preload burada
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // BURAYI DEĞİŞTİRDİK: Geliştirme aşamasında olduğumuz için direkt URL'i veriyoruz.
  // React (Vite) varsayılan olarak 5173 portunda çalışır.
  mainWindow.loadURL('http://localhost:5173');

  // Geliştirici konsolunu otomatik aç (Hata varsa görelim)
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  setupIpcHandlers(); // Backend bağlantısını kur
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});