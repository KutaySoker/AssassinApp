const { getInstalledApps } = require('./appDiscovery');
const { searchCVE } = require('./nvdService');
const prisma = require('../config/db');
const EventEmitter = require('events');

const progressEmitter = new EventEmitter();
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

let isScanning = false; 

// 🔥 DÜZELTME: Artık fonksiyon Ajan ID'sini de alıyor 🔥
async function performFullScan(agentId) {
    if (isScanning) {
        console.log("⚠️ Tarama zaten devam ediyor! Zombi istek ENGELLENDİ.");
        return null;
    }
    
    isScanning = true;
    console.log("🚀 Tarama Başlatılıyor...");
    
    try {
        progressEmitter.emit('progress', { percent: 2, message: "Sistem başlatılıyor..." });

        // 🔥 DÜZELTME: Veritabanına kaydederken GHOST-AGENT yerine gerçek Ajan ID'ni yazıyor 🔥
        const scanRecord = await prisma.scanHistory.create({
            data: { status: 'SCANNING', agentId: agentId || 'GHOST-AGENT' }
        });

        const apps = await getInstalledApps();
        progressEmitter.emit('progress', { percent: 5, message: "Kayıtlar çekildi, çöpler temizleniyor..." });

        const validApps = [];
        const seenApps = new Set();

        for (const app of apps) {
            const rawName = app.DisplayName || app.Name || app.name || "";
            const rawVersion = app.DisplayVersion || app.Version || app.version || "";
            const cleanVendor = app.Publisher || app.publisher || app.vendor || "Unknown";

            const cleanName = rawName.replace(/\(.*?\)/g, '').replace(/[^a-zA-Z0-9 ]/g, '').split(' ').slice(0, 2).join(' ').trim() || "Unknown";
            const cleanVersion = rawVersion.split(' ')[0].replace(/[^0-9.]/g, '') || "0.0";

            if (!cleanName || cleanName === "Unknown" || cleanName.length < 3 || cleanVersion === "0.0") continue;
            
            const uniqueAppKey = `${cleanName}-${cleanVersion}`;
            if (seenApps.has(uniqueAppKey)) continue;

            seenApps.add(uniqueAppKey);
            validApps.push({ cleanName, cleanVersion, cleanVendor });
        }

        const totalApps = validApps.length;
        let currentAppIndex = 0;
        let totalVulnerabilities = 0;

        console.log(`📡 Temizlik bitti. Tam olarak ${totalApps} benzersiz uygulama taranacak.`);

        for (const app of validApps) {
            currentAppIndex++;
            const currentPercent = 5 + Math.floor((currentAppIndex / totalApps) * 90);
            
            progressEmitter.emit('progress', { 
                percent: currentPercent, 
                message: `[${currentAppIndex}/${totalApps}] Taranıyor: ${app.cleanName}` 
            });

            try {
                const savedApp = await prisma.discoveredApp.upsert({
                    where: { app_unique: { name: app.cleanName, version: app.cleanVersion } },
                    update: { vendor: app.cleanVendor, scanId: scanRecord.id },
                    create: { name: app.cleanName, version: app.cleanVersion, vendor: app.cleanVendor, scanId: scanRecord.id }
                });

                const keyword = `${app.cleanName} ${app.cleanVersion}`;
                const rawCves = await searchCVE(keyword);

                const uniqueCvesMap = new Map();
                if (rawCves && rawCves.length > 0) {
                    rawCves.forEach(cve => uniqueCvesMap.set(cve.cveId, cve));
                }
                const cves = Array.from(uniqueCvesMap.values()); 

                if (cves.length > 0) {
                    totalVulnerabilities += cves.length; 
                    for (const cve of cves) {
                        try {
                            await prisma.vulnerability.upsert({
                                where: { cve_app_unique: { cveId: cve.cveId, appId: savedApp.id } },
                                update: { description: cve.description, score: cve.score, severity: cve.severity },
                                create: {
                                    cveId: cve.cveId, description: cve.description, score: cve.score, 
                                    severity: cve.severity, publishedAt: cve.published, appId: savedApp.id
                                }
                            });
                        } catch (cveErr) { }
                    }
                }
                await sleep(1000); 
            } catch (appErr) {
                continue;
            }
        }

        await prisma.scanHistory.update({
            where: { id: scanRecord.id },
            data: { status: 'COMPLETED' }
        });

        console.log(`✅ İşlem Tamam. ${totalApps} uygulama tarandı, ${totalVulnerabilities} zafiyet bulundu.`);
        
        progressEmitter.emit('progress', { 
            percent: 100, 
            message: "Tarama tamamlandı, rapor hazırlanıyor...",
            isComplete: true,
            scanId: scanRecord.id
        });

        return { scanId: scanRecord.id, totalVulnerabilities };

    } catch (fatalErr) {
        console.error("Tarama Motoru Çöktü:", fatalErr);
        progressEmitter.emit('progress', { percent: 100, message: "HATA OLUŞTU!", isComplete: true, error: true });
    } finally {
        isScanning = false;
    }
}

module.exports = { performFullScan, progressEmitter };