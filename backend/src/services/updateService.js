const { exec, spawn } = require('child_process');
const EventEmitter = require('events');

const updateEmitter = new EventEmitter();

// 1. GÜNCELLENEBİLİR UYGULAMALARI LİSTELE (AJANLI SÜRÜM)
const getOutdatedApps = () => {
    return new Promise((resolve) => {
        console.log("=== WINGET TARAMASI BAŞLATILDI ===");
        
        // Sadece temel komutu verelim, chcp veya ekstra argümanları şimdilik kaldırıp saf çıktıyı görelim
        exec('winget upgrade', { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            try {
                // WINGET NE DÖNDÜYSE TERMİNALE BAS (BURASI ÇOK KRİTİK)
                console.log("--- WINGET RAW ÇIKTISI BAŞLANGIÇ ---");
                console.log(stdout);
                console.log("--- WINGET RAW ÇIKTISI BİTİŞ ---");

                if (error) {
                    console.log("Winget Error Tespit Edildi (Kod):", error.code);
                    console.log("Winget Error Mesajı:", error.message);
                }
                if (stderr) {
                    console.log("Winget Stderr (Hata Çıktısı):", stderr);
                }

                if (!stdout) {
                    console.log("KRİTİK HATA: Winget'ten bomboş çıktı geldi!");
                    return resolve([]);
                }

                const lines = stdout.split('\n');
                const dashLineIndex = lines.findIndex(line => line.trim().startsWith('---'));

                if (dashLineIndex === -1) {
                    console.log("HATA: Çıktıda '---' ayraç çizgisi bulunamadı! Tablo yapısı bozuk gelmiş olabilir.");
                    return resolve([]); 
                }

                console.log(`Tablo başlığı ${dashLineIndex}. satırda bulundu. Ayrıştırma başlıyor...`);

                const apps = [];
                for (let i = dashLineIndex + 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;
                    
                    // Regex ile sütunları ayırıyoruz (En az 2 boşluk)
                    const parts = line.split(/\s{2,}/);
                    
                    if (parts.length >= 4 && !parts[0].toLowerCase().includes('winget')) {
                        const appName = parts[0];
                        const appCurrent = parts[2] === 'Unknown' ? 'Bilinmiyor' : parts[2];
                        const appAvailable = parts[3];
                        
                        apps.push({
                            name: appName,
                            id: parts[1],
                            currentVersion: appCurrent,
                            availableVersion: appAvailable
                        });
                        console.log(`--> YAKALANDI: ${appName} | Mevcut: ${appCurrent} | Yeni: ${appAvailable}`);
                    }
                }
                
                console.log(`=== TOPLAM ${apps.length} UYGULAMA BULUNDU ===`);
                resolve(apps);

            } catch (err) {
                console.error("!!! AYRIŞTIRMA (PARSE) SIRASINDA CRASH !!!", err);
                resolve([]); // Frontend çökmesin diye boş array dön
            }
        });
    });
};

const performUpdate = (appId = null) => {
    return new Promise((resolve) => {
        const args = ['upgrade', '--silent', '--accept-package-agreements', '--accept-source-agreements'];
        if (appId) args.push('--id', appId);
        else args.push('--all');

        const child = spawn('winget', args, { shell: true });

        child.stdout.on('data', (data) => {
            const message = data.toString('utf8').trim();
            if (message) updateEmitter.emit('update-progress', { text: message });
        });

        child.stderr.on('data', (data) => console.error(`Winget Hatası: ${data}`));
        child.on('close', (code) => resolve({ success: code === 0 || code === -1978335215 }));
    });
};

module.exports = { getOutdatedApps, performUpdate, updateEmitter };