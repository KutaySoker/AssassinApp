const prisma = require('../config/db');
const { addLog } = require('./historyController');
const scanManager = require('../services/scanManager'); 

async function startScan(req, res) {
    console.log("\n🔥 [SCAN-MOTORU] Tarama Tetiklendi (Arka Plana Atılıyor)..."); 
    try {
        // Ajan ID'sini frontend'den alıyoruz
        const agentId = req.headers['x-assassin-id'] || 'GHOST-AGENT';
        
        // 🔥 DÜZELTME: Ajan ID'sini motorun içine iletiyoruz!
        scanManager.performFullScan(agentId).then(async (result) => {
            if (result && result.scanId) {
                await addLog({ 
                    id: result.scanId,
                    agentId: agentId, // Geçmiş loguna da doğru ID'yi basıyoruz
                    status: "SCANNED", 
                    message: "Güvenlik zafiyet taraması tamamlandı.",
                    apps: [] 
                });
            }
        }).catch(e => console.error("Arka plan taraması çöktü:", e));

        res.json({ success: true, message: "Tarama arka planda başarıyla başlatıldı." });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

async function getScanDetails(req, res) {
    console.log(`🔍 [SCAN-DETAY] Rapor İstendi! Aranan ID: ${req.params.id}`);
    try {
        const scanId = req.params.id; 
        const agentId = req.headers['x-assassin-id'] || 'GHOST-AGENT';
        
        const details = await prisma.scanHistory.findFirst({
            where: { id: scanId, agentId: agentId },
            include: { apps: { include: { vulnerabilities: true } } }
        });

        if (!details) return res.status(404).json({ success: false, error: "Rapor bulunamadı." });
        res.json({ success: true, data: details });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

async function getHistory(req, res) {
    try {
        const agentId = req.headers['x-assassin-id'] || 'GHOST-AGENT';
        const history = await prisma.scanHistory.findMany({
            where: { agentId },
            orderBy: { startedAt: 'desc' }
        });
        res.json({ success: true, data: history });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function streamProgress(req, res) {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
    const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
    scanManager.progressEmitter.on('progress', send);
    req.on('close', () => scanManager.progressEmitter.off('progress', send));
}

module.exports = { startScan, getHistory, streamProgress, getScanDetails }; 