const updateService = require('../services/updateService');

const checkUpdates = async (req, res) => {
    try {
        const apps = await updateService.getOutdatedApps();
        res.json({ success: true, data: apps });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Güncellemeler kontrol edilemedi.' });
    }
};

const startUpdate = async (req, res) => {
    try {
        const { id } = req.body; // id gelirse tekli, gelmezse toplu
        updateService.performUpdate(id).then(result => {
            console.log("Güncelleme işlemi tamamlandı.");
        });
        res.json({ success: true, message: 'Güncelleme başlatıldı.' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'İşlem başlatılamadı.' });
    }
};

const streamUpdateProgress = (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    const sendProgress = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    updateService.updateEmitter.on('update-progress', sendProgress);

    req.on('close', () => {
        updateService.updateEmitter.off('update-progress', sendProgress);
    });
};

module.exports = { checkUpdates, startUpdate, streamUpdateProgress };