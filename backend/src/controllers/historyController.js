const prisma = require('../config/db');

const addLog = async (logData) => {
    try {
        // ZIRH: Ne gelirse gelsin onu Prisma'nın kabul edeceği saf bir diziye (array) çeviririz.
        let safeApps = [];
        if (logData.apps) {
            if (typeof logData.apps === 'string') {
                try { safeApps = JSON.parse(logData.apps); } catch(e) { safeApps = []; }
            } else if (Array.isArray(logData.apps) || typeof logData.apps === 'object') {
                safeApps = logData.apps;
            }
        }
        
        await prisma.operationLog.create({
            data: {
                id: logData.id || `OP-${Date.now()}`,
                agentId: logData.agentId || 'GHOST-AGENT',
                status: logData.status || 'UNKNOWN',
                message: logData.message || 'İşlem yapıldı.',
                apps: safeApps // Artık Prisma burada patlayamaz!
            }
        });
        console.log(`✅ [LOG BAŞARILI] ${logData.id} geçmişe kaydedildi.`);
    } catch (e) { 
        console.error(`❌ [LOG PATLADI] ${logData.id} geçmişe YAZILAMADI:`, e.message); 
    }
};

const getHistory = async (req, res) => {
    try {
        const agentId = req.headers['x-assassin-id'] || 'GHOST-AGENT';
        const history = await prisma.operationLog.findMany({
            where: { agentId },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        res.json({ success: true, history });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};

const clearHistory = async (req, res) => {
    try {
        const agentId = req.headers['x-assassin-id'] || 'GHOST-AGENT';
        await prisma.operationLog.deleteMany({ where: { agentId } });
        res.json({ success: true, message: "Geçmiş temizlendi." });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = { addLog, getHistory, clearHistory };