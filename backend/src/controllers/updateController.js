// DİKKAT: Kısır döngüyü kırmak için objeyi parçalamadan direkt aldık
const updateService = require('../services/updateService');
const { addLog } = require('./historyController');

const checkUpdates = async (req, res) => {
    try {
        const apps = await updateService.getOutdatedApps();

        // --- CASUS LOG BURADA DEVREYE GİRİYOR ---
        if (apps.length === 0) {
            addLog({ status: "CLEAN", message: "Sistem kusursuz. Güncellenecek uygulama bulunamadı.", apps: [] });
        } else {
            addLog({ status: "SCANNED", message: `${apps.length} adet güncellenmemiş uygulama tespit edildi.`, apps: apps });
        }

        res.json(apps);
    } catch (error) {
        console.error("Tarama Hatası:", error);
        res.status(500).json({ error: "Güncellemeler denetlenirken hata oluştu." });
    }
};

const startUpdate = async (req, res) => {
    try {
        const appId = req.body.appId || req.body.id;

        if (appId) {
            console.log(`[API] Tekli güncelleme (Sniper) tetiklendi. Hedef ID: ${appId}`);
        } else {
            console.log(`[API] Toplu güncelleme (--all) tetiklendi.`);
        }

        updateService.performUpdate(appId).then(result => {
            console.log(`[API] Güncelleme işlemi bitti. Başarı: ${result.success}`);

            // --- GÜNCELLEME BİTİNCE LOG AT ---
            if (result.success) {
                addLog({
                    status: "UPDATED",
                    message: appId ? `${appId} başarıyla güncellendi.` : "Tüm sistem güncellendi.",
                    apps: appId ? [{ name: appId, oldVer: "Bilinmiyor", newVer: "Güncel" }] : []
                });
            }
        });

        res.status(200).json({ message: "Güncelleme komutu Winget'e iletildi." });

    } catch (error) {
        console.error("Güncelleme başlatılamadı:", error);
        res.status(500).json({ error: "Güncelleme başlatılamadı." });
    }
};

const streamUpdateProgress = (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const onProgress = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    updateService.updateEmitter.on('update-progress', onProgress);

    req.on('close', () => {
        updateService.updateEmitter.off('update-progress', onProgress);
    });
};

module.exports = { checkUpdates, startUpdate, streamUpdateProgress };