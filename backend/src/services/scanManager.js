const { getInstalledApps } = require('./appDiscovery');
const { searchCVE } = require('./nvdService');
const prisma = require('../config/db');

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function performFullScan() {
    console.log("🚀 Tarama Başlatılıyor...");

    const scanRecord = await prisma.scanHistory.create({
        data: { status: 'SCANNING' }
    });

    const apps = await getInstalledApps();
    console.log(`📡 Windows'tan ${apps.length} ham kayıt çekildi. Temizlik başlıyor...`);

    let totalVulnerabilities = 0;
    let processedAppCount = 0; 
    
    const seenApps = new Set(); // Kara Kaplı Defter (Klon filtreleyici)

    for (const app of apps) {
        try {
            const rawName = app.DisplayName || app.Name || app.name || "";
            const rawVersion = app.DisplayVersion || app.Version || app.version || "";
            const cleanVendor = app.Publisher || app.publisher || app.vendor || "Unknown";

            const cleanName = rawName
                .replace(/\(.*?\)/g, '')
                .replace(/[^a-zA-Z0-9 ]/g, '')
                .split(' ')
                .slice(0, 2).join(' ')
                .trim() || "Unknown";

            const cleanVersion = rawVersion.split(' ')[0].replace(/[^0-9.]/g, '') || "0.0";

            if (!cleanName || cleanName === "Unknown" || cleanName.length < 3 || cleanVersion === "0.0") {
                continue; // Çöpleri sessizce atla
            }

            const uniqueAppKey = `${cleanName}-${cleanVersion}`;
            if (seenApps.has(uniqueAppKey)) {
                continue; // Klonları sessizce atla
            }
            
            seenApps.add(uniqueAppKey);
            processedAppCount++;

            const savedApp = await prisma.discoveredApp.upsert({
                where: { app_unique: { name: cleanName, version: cleanVersion } },
                update: { vendor: cleanVendor, scanId: scanRecord.id },
                create: { name: cleanName, version: cleanVersion, vendor: cleanVendor, scanId: scanRecord.id }
            });

            const keyword = `${cleanName} ${cleanVersion}`;
            const rawCves = await searchCVE(keyword);

            // NVD'DEN GELEN MÜKERRER CVE'LERİ TEMİZLE
            const uniqueCvesMap = new Map();
            if (rawCves && rawCves.length > 0) {
                rawCves.forEach(cve => uniqueCvesMap.set(cve.cveId, cve));
            }
            const cves = Array.from(uniqueCvesMap.values()); 

            if (cves.length > 0) {
                console.log(`🚨 ${cleanName} için ${cves.length} zafiyet bulundu!`);
                totalVulnerabilities += cves.length; 

                for (const cve of cves) {
                    try {
                        await prisma.vulnerability.upsert({
                            where: {
                                cve_app_unique: { cveId: cve.cveId, appId: savedApp.id }
                            },
                            update: { description: cve.description, score: cve.score, severity: cve.severity },
                            create: {
                                cveId: cve.cveId, description: cve.description,
                                score: cve.score, severity: cve.severity,
                                publishedAt: cve.published, appId: savedApp.id
                            }
                        });
                    } catch (cveErr) {
                        console.error(`⚠️ CVE Kayıt hatası (${cve.cveId}):`, cveErr.message);
                    }
                }
            }
            
            await sleep(2000);

        } catch (appErr) {
            console.error(`❌ ${app.Name || app.name} işlenirken hata oluştu:`, appErr.message);
            continue;
        }
    }

    await prisma.scanHistory.update({
        where: { id: scanRecord.id },
        data: { status: 'COMPLETED' }
    });

    console.log(`✅ Tarama Bitti. Toplam ${processedAppCount} benzersiz uygulama tarandı, ${totalVulnerabilities} benzersiz zafiyet bulundu.`);
    return { scanId: scanRecord.id, totalVulnerabilities };
}

module.exports = { performFullScan };