const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { setupIpcHandlers } = require('./ipcManager');

// Pencereyi dışarıda tanımlıyoruz ki aşağıdaki kapat/küçült butonları erişebilsin
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false, // Çerçeve gitti
    
    // --- GÖREV ÇUBUĞU DÜZELTMELERİ BURADA ---
    title: 'Assassin', // Üstüne gelince "Electron" yerine "AssassinApp" yazacak
    icon: path.join(__dirname, 'icon.png'), // Görev çubuğundaki o atom logosunu değiştirecek
    // -----------------------------------------

    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // O klasik, sıkıcı "File, Edit, View" menüsünü (Toolbox) siliyoruz!
  mainWindow.removeMenu();

  // Geliştirme aşamasında olduğumuz için direkt URL'i veriyoruz.
  mainWindow.loadURL('http://localhost:5173');

  // Geliştirici konsolunu otomatik aç
  mainWindow.webContents.openDevTools();
}

// --- YENİ: SİBERPUNK PENCERE KONTROLLERİ İÇİN DİNLEYİCİLER ---
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});
// -------------------------------------------------------------

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