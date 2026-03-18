const { exec, spawn } = require('child_process');
const EventEmitter = require('events');

const updateEmitter = new EventEmitter();

const getOutdatedApps = () => {
    return new Promise((resolve) => {
        console.log("=== WINGET TARAMASI BAŞLATILDI ===");

        exec('chcp 65001 >NUL & winget upgrade --include-unknown --accept-source-agreements', { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            try {
                if (!stdout) {
                    console.log("Winget'ten boş yanıt geldi.");
                    return resolve([]);
                }

                const rawLines = stdout.split(/\r?\n/);
                const lines = [];

                for (let line of rawLines) {
                    const lastCr = line.lastIndexOf('\r');
                    if (lastCr !== -1) line = line.substring(lastCr + 1);

                    line = line.replace(/\x1b\][^\x07]*\x07/g, '');
                    line = line.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
                    line = line.replace(/[\x00-\x1F\x7F]/g, '');
                    lines.push(line);
                }

                const dashLineIndex = lines.findIndex(line => line.trim().startsWith('---'));

                if (dashLineIndex === -1) {
                    // 🔥 RÖNTGEN BURADA: Winget aslında ne dedi de tablo bulamadık?
                    console.log("⚠️ TABLO AYIRACI BULUNAMADI! Winget'in Ham Çıktısı Aşağıda:");
                    console.log("--------------------------------------------------");
                    console.log(stdout.trim()); // Winget'in gizlediği mesajı buraya kusacak
                    console.log("--------------------------------------------------");
                    return resolve([]);
                }

                const headerLine = lines[dashLineIndex - 1];
                const columns = [...headerLine.matchAll(/\S+/g)];

                if (columns.length < 4) return resolve([]);

                const colId = columns[1].index;
                const colVersion = columns[2].index;
                const colAvailable = columns[3].index;
                const colSource = columns.length > 4 ? columns[4].index : headerLine.length;

                const apps = [];
                for (let i = dashLineIndex + 1; i < lines.length; i++) {
                    const line = lines[i];

                    if (line.trim() === '' || line.toLowerCase().includes('upgrades available') || line.toLowerCase().includes('güncelleştirme')) continue;

                    const paddedLine = line.padEnd(colSource + 15, ' ');
                    const appName = paddedLine.substring(0, colId).trim();
                    const appId = paddedLine.substring(colId, colVersion).trim();
                    let appCurrent = paddedLine.substring(colVersion, colAvailable).trim();

                    const tail = paddedLine.substring(colAvailable).trim();
                    const tailParts = tail.split(/\s+/);
                    const appAvailable = tailParts.length > 1 ? tailParts.slice(0, -1).join(' ') : tailParts[0];

                    if (appCurrent === 'Unknown') appCurrent = 'Bilinmiyor';

                    if (appName && appId && appAvailable && !appName.toLowerCase().includes('winget')) {
                        apps.push({
                            name: appName,
                            id: appId,
                            currentVersion: appCurrent,
                            availableVersion: appAvailable
                        });
                    }
                }

                console.log(`=== TOPLAM ${apps.length} UYGULAMA EKRANA GÖNDERİLDİ ===`);
                resolve(apps);

            } catch (err) {
                console.error("!!! AYRIŞTIRMA (PARSE) SIRASINDA CRASH !!!", err);
                resolve([]);
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
            const lines = data.toString('utf8').split(/\r?\n/);
            for (let line of lines) {
                let cleanLine = line.trim();
                if (!cleanLine) continue;

                const lowerLine = cleanLine.toLowerCase();
                if (
                    lowerLine.includes('cannot be determined') || 
                    lowerLine.includes('belirlenemeyen') || 
                    lowerLine.includes('--include-unknown') ||
                    lowerLine.includes('package(s) have version numbers')
                ) {
                    continue; 
                }

                updateEmitter.emit('update-progress', { text: cleanLine });
            }
        });

        child.stderr.on('data', (data) => console.error(`Winget Hatası: ${data}`));

        child.on('close', (code) => {
            const success = code === 0 || code === -1978335215;
            
            updateEmitter.emit('update-progress', { 
                text: success ? "Sistem başarıyla güncellendi!" : "İşlem tamamlandı.", 
                done: true 
            });

            resolve({ success });
        });
    });
};

module.exports = { getOutdatedApps, performUpdate, updateEmitter };