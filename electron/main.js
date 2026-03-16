const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { setupIpcHandlers } = require('./ipcManager');
const crypto = require('crypto');
const fs = require('fs');
const { execSync } = require('child_process');

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

// --- SİBER GÜVENLİK: DONANIM KİMLİĞİ OKUMA ---
function getRawHardwareId() {
    try {
        if (process.platform === 'win32') {
            const output = execSync('reg query HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid').toString();
            const match = output.match(/REG_SZ\s+([a-zA-Z0-9-]+)/);
            if (match) return match[1];
        } else if (process.platform === 'darwin') {
            const output = execSync('ioreg -rd1 -c IOPlatformExpertDevice').toString();
            const match = output.match(/IOPlatformUUID"\s*=\s*"([a-zA-Z0-9-]+)"/);
            if (match) return match[1];
        } else {
            return execSync('cat /var/lib/dbus/machine-id').toString().trim();
        }
    } catch (e) {
        return require('os').hostname(); 
    }
}

// --- KİMLİK YÖNETİMİ ---
ipcMain.handle('get-machine-id', () => {
    const appDataPath = app.getPath('appData'); 
    const assassinFolder = path.join(appDataPath, 'AssassinApp'); 

    if (!fs.existsSync(assassinFolder)) {
        fs.mkdirSync(assassinFolder, { recursive: true });
    }

    const configPath = path.join(assassinFolder, 'assassin_identity.json');

    try {
        if (fs.existsSync(configPath)) {
            const rawData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(rawData).machineHash; 
        }

        const rawHwId = getRawHardwareId();
        const machineHash = crypto.createHash('sha256').update(rawHwId + "assassin_salt_2026").digest('hex');

        const newConfig = { 
            machineHash: machineHash, 
            createdAt: new Date().toISOString(),
            info: "DO NOT WORRY IF THIS FILE IS DELETED. IT WILL BE REGENERATED FROM YOUR HARDWARE ID."
        };
        
        fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
        return machineHash;

    } catch (error) {
        console.error("Kimlik hatası:", error);
        return null;
    }
});