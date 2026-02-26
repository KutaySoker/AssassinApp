const { performFullScan } = require('./src/services/scanManager');

(async () => {
    try {
        await performFullScan();
    } catch (error) {
        console.error("Ana işlem hatası:", error);
    }
})();