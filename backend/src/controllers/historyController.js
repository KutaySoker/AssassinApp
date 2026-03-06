const fs = require('fs');
const path = require('path');

// Logların tutulacağı gizli dosyamız
const historyFilePath = path.join(__dirname, '../../history.json');

// Sunucu kalktığında dosya yoksa otomatik yaratır
if (!fs.existsSync(historyFilePath)) {
    fs.writeFileSync(historyFilePath, JSON.stringify([]));
}

const getHistory = (req, res) => {
    try {
        const data = fs.readFileSync(historyFilePath, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(500).json({ error: "Geçmiş okunamadı." });
    }
};

const clearHistory = (req, res) => {
    try {
        fs.writeFileSync(historyFilePath, JSON.stringify([]));
        res.json({ success: true, message: "Geçmiş temizlendi." });
    } catch (error) {
        res.status(500).json({ error: "Geçmiş temizlenemedi." });
    }
};

// Diğer dosyalardan (tarama ve güncelleme bitince) buraya kayıt atmak için casus fonksiyon
const addLog = (logData) => {
    try {
        const data = fs.readFileSync(historyFilePath, 'utf8');
        let history = JSON.parse(data);

        // --- KRİTİK DEĞİŞİKLİK BURADA ---
        // Eğer log atarken gerçek bir ID gönderildiyse onu kullan, gönderilmediyse OP- uydur
        history.unshift({
            id: logData.id || `OP-${Math.floor(1000 + Math.random() * 9000)}`,
            date: new Date().toLocaleString('tr-TR'),
            ...logData
        });

        if (history.length > 50) history.pop();

        fs.writeFileSync(historyFilePath, JSON.stringify(history, null, 2));
    } catch (error) {
        console.error("Log yazılamadı:", error);
    }
};


module.exports = { getHistory, clearHistory, addLog };