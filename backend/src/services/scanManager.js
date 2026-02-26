const { getInstalledApps } = require('./appDiscovery');
const { searchCVE } = require('./nvdService');
const prisma = require('../config/db');

// Senin kodundaki bekleme fonksiyonu
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function performFullScan() {
    console.log("🚀 Tarama Başlatılıyor...");

    // 1. Veritabanında yeni bir tarama kaydı oluştur
    const scanRecord = await prisma.scanHistory.create({
        data: { status: 'SCANNING' }
    });

    // 2. Uygulamaları Bul
    const apps = await getInstalledApps();
    console.log(`💻 ${apps.length} uygulama bulundu.`);

    let totalVulnerabilities = 0;

    // SADECE BİR TANE DÖNGÜ VAR
    for (const app of apps) {
        // 1. DIŞ TRY-CATCH: Bir uygulama patlarsa tüm tarama durmasın!
        try {
            // --- SENİN REGEX İLE TEMİZLEME MANTIĞIN ---
            // Hem büyük hem küçük harf ihtimallerini dahil edip ham veriyi alıyoruz
            const rawName = app.DisplayName || app.Name || app.name || "";
            const rawVersion = app.DisplayVersion || app.Version || app.version || "";
            const cleanVendor = app.Publisher || app.publisher || app.vendor || "Unknown";

            // Senin mükemmel regex temizlemen
            const cleanName = rawName
                .replace(/\(.*?\)/g, '')         // Parantezleri sil
                .replace(/[^a-zA-Z0-9 ]/g, '')   // Özel karakterleri sil
                .split(' ')
                .slice(0, 2).join(' ')           // İlk 2 kelimeyi al
                .trim() || "Unknown";

            const cleanVersion = rawVersion.split(' ')[0].replace(/[^0-9.]/g, '') || "0.0";

            // İsim çok kısaysa, "Unknown" ise veya versiyon yoksa atla
            if (!cleanName || cleanName === "Unknown" || cleanName.length < 3 || cleanVersion === "0.0") {
                console.log(`⚠️ Geçersiz uygulama atlanıyor: ${rawName}`);
                continue;
            }

            // 2. Uygulamayı Kaydet (Upsert)
            const savedApp = await prisma.discoveredApp.upsert({
                where: {
                    // GÜNCELLENEN KISIM: Sadece isim ve versiyona göre arıyoruz
                    app_unique: {
                        name: cleanName,
                        version: cleanVersion
                    }
                },
                update: {
                    vendor: cleanVendor,
                    scanId: scanRecord.id // Eğer uygulama zaten varsa, onu en son taramaya bağlıyoruz
                },
                create: {
                    name: cleanName,
                    version: cleanVersion,
                    vendor: cleanVendor,
                    scanId: scanRecord.id
                }
            });

            // 3. NVD Üzerinden Zafiyet Ara
            const keyword = `${cleanName} ${cleanVersion}`;
            const cves = await searchCVE(keyword);

            if (cves && cves.length > 0) {
                console.log(`🚨 ${cleanName} için ${cves.length} zafiyet bulundu!`);
                totalVulnerabilities += cves.length;

                // 4. Zafiyetleri Kaydet (Upsert)
                for (const cve of cves) {
                    // İÇ TRY-CATCH: Tek bir CVE hatalıysa diğerlerini etkilemesin
                    try {
                        await prisma.vulnerability.upsert({
                            where: {
                                cve_app_unique: {
                                    cveId: cve.cveId,
                                    appId: savedApp.id
                                }
                            },
                            update: {
                                description: cve.description,
                                score: cve.score,
                                severity: cve.severity
                            },
                            create: {
                                cveId: cve.cveId,
                                description: cve.description,
                                score: cve.score,
                                severity: cve.severity,
                                publishedAt: cve.published,
                                appId: savedApp.id
                            }
                        });
                    } catch (cveErr) {
                        console.error(`⚠️ CVE Kayıt hatası (${cve.cveId}):`, cveErr.message);
                    }
                }
            }

            // 5. Rate Limit Beklemesi (API Ban yememek için)
            await sleep(2000);

        } catch (appErr) {
            // KRİTİK NOKTA: Uygulama kaydedilirken (upsert) hata çıkarsa buraya düşer
            console.error(`❌ ${app.Name || app.name || 'Uygulama'} işlenirken hata oluştu, pas geçiliyor:`, appErr.message);
            continue;
        }
    }

    // 6. Taramayı Tamamlandı Olarak İşaretle
    await prisma.scanHistory.update({
        where: { id: scanRecord.id },
        data: { status: 'COMPLETED' }
    });

    console.log(`✅ Tarama Bitti. Toplam ${totalVulnerabilities} zafiyet veritabanına işlendi.`);
    return { scanId: scanRecord.id, totalVulnerabilities };
}

module.exports = { performFullScan };