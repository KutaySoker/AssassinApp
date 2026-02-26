const { spawn } = require('child_process');

/**
 * PowerShell komutunu çalıştırır ve çıktıyı döndürür.
 */
function runPS(command) {
    return new Promise((resolve, reject) => {
        const ps = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command]);
        let output = '';
        
        ps.stdout.on('data', (data) => { output += data.toString(); });
        ps.stderr.on('data', (data) => { console.error(`PS Error: ${data}`); });
        
        ps.on('close', (code) => {
            if (code !== 0) resolve(null); // Hata olsa bile null dönüp süreci kırmayalım
            else resolve(output);
        });
        
        ps.on('error', (err) => reject(err));
    });
}

/**
 * İşletim sistemindeki yüklü uygulamaları çeker.
 */
async function getInstalledApps() {
    // Senin yazdığın optimize edilmiş PowerShell komutu
    const command = `
        $apps = Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*, 
                                 HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | 
                Select-Object DisplayName, DisplayVersion, Publisher | 
                Where-Object { $_.DisplayName -ne $null }
        $apps | ConvertTo-Json -Compress
    `;

    try {
        const rawOutput = await runPS(command);
        if (!rawOutput) return [];

        let appList = JSON.parse(rawOutput);
        
        // Tek bir sonuç dönerse array'e çevir
        if (!Array.isArray(appList)) appList = [appList];

        return appList;
    } catch (error) {
        console.error("App Discovery Hatası:", error);
        return [];
    }
}

module.exports = { getInstalledApps };