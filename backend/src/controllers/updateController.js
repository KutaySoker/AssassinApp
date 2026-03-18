const updateService = require('../services/updateService');
const { addLog } = require('./historyController');
const prisma = require('../config/db'); // 🔥 İŞTE EKSİK OLAN VERİTABANI BAĞLANTISI 🔥

// Güncellenmesi gereken uygulamaları listeler
const checkUpdates = async (req, res) => {
    try {
        const agentId = req.headers['x-assassin-id'] || 'GHOST-AGENT';
        const apps = await updateService.getOutdatedApps();
        
        const logId = `UP-CHECK-${Date.now()}`;

        // 1. OPERATION LOG'A KAYIT (Geçmiş arayüzünde görünsün diye)
        if (apps.length === 0) {
            await addLog({ 
                id: logId,
                agentId,
                status: "CLEAN", 
                message: "Sistem güncel. Herhangi bir yama veya versiyon yükseltmesi gerekmiyor.", 
                apps: [] 
            });
        } else {
            await addLog({ 
                id: logId,
                agentId,
                status: "UPDATE_CHECK", 
                message: `${apps.length} adet uygulama için versiyon güncellemesi tespit edildi.`, 
                apps: apps.map(a => ({ 
                    name: a.name, 
                    currentVersion: a.currentVersion, 
                    availableVersion: a.availableVersion 
                }))
            });
        }

        // 2. ÖZEL PRISMA TABLOLARINA KAYIT (UpdateHistory ve UpdateApp artık 0 kalmayacak!)
        try {
            await prisma.updateHistory.create({
                data: {
                    id: logId,
                    agentId: agentId,
                    // Eğer app varsa UpdateApp tablosuna da ilişkili (relation) olarak yazar
                    apps: apps.length > 0 ? {
                        create: apps.map(a => ({
                            name: a.name,
                            currentVersion: a.currentVersion || "Bilinmiyor",
                            latestVersion: a.availableVersion || "Bilinmiyor"
                        }))
                    } : undefined
                }
            });
            console.log(`✅ [DB-KAYIT] UpdateHistory ve UpdateApp tablolarına başarıyla işlendi!`);
        } catch (dbErr) {
            console.error("❌ [DB-HATA] Update tablolarına yazılamadı:", dbErr.message);
        }

        res.json(apps);
    } catch (error) {
        console.error("Güncelleme Denetleme Hatası:", error);
        res.status(500).json({ error: "Güncellemeler denetlenirken bir hata oluştu." });
    }
};

// Güncelleme işlemini başlatır
const startUpdate = async (req, res) => {
    try {
        const agentId = req.headers['x-assassin-id'] || 'GHOST-AGENT';
        const appId = req.body.appId || req.body.id;
        const logId = `UP-DO-${Date.now()}`;

        // Arka planda güncelleme işlemini başlat
        updateService.performUpdate(appId).then(async (result) => {
            if (result.success) {
                // 1. Genel Loga At
                await addLog({
                    id: logId,
                    agentId,
                    status: "UPDATED",
                    message: appId ? `[${appId}] başarıyla güncellendi.` : "Tüm eski uygulamalar başarıyla yeni versiyona geçirildi.",
                    apps: appId ? [{ name: appId, availableVersion: "Güncel" }] : []
                });

                // 2. Kendi Tablosuna At
                try {
                    await prisma.updateHistory.create({
                        data: {
                            id: logId,
                            agentId: agentId,
                            apps: appId ? {
                                create: [{ name: appId, currentVersion: "Eski", latestVersion: "Güncel" }]
                            } : undefined
                        }
                    });
                } catch (dbErr) {}
            }
        });

        res.status(200).json({ success: true, message: "Güncelleme operasyonu başlatıldı." });
    } catch (error) {
        res.status(500).json({ error: "Güncelleme işlemi başlatılamadı." });
    }
};

// 🔥 TEK VE GERÇEK CANLI AKIŞ FONKSİYONU 🔥
const streamProgress = (req, res) => {
    res.writeHead(200, { 
        'Content-Type': 'text/event-stream', 
        'Cache-Control': 'no-cache', 
        'Connection': 'keep-alive' 
    });

    const onProgress = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    updateService.updateEmitter.on('update-progress', onProgress);

    req.on('close', () => {
        updateService.updateEmitter.off('update-progress', onProgress);
    });
};

module.exports = { 
    checkUpdates, 
    startUpdate, 
    streamProgress 
};