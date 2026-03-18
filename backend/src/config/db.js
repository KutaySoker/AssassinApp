const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// __dirname her zaman 'backend/src/config' dizinini işaret eder.
// İki üst dizine çıkarak mutlak .env yolunu buluyoruz.
const envPath = path.join(__dirname, '../../.env');

let dbUrl = process.env.DATABASE_URL;

// Ortam değişkeni yoksa .env dosyasını manuel okuma işlemi
if (!dbUrl && fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split(/\r?\n/);
    
    for (const line of lines) {
        if (line.trim().startsWith('DATABASE_URL=')) {
            // İlk eşittir işaretinden sonrasını tam olarak alıyoruz (URL içinde eşittir olma ihtimaline karşı)
            const rawUrl = line.substring(line.indexOf('=') + 1).trim();
            // Başındaki ve sonundaki tırnakları temizliyoruz
            dbUrl = rawUrl.replace(/^["']|["']$/g, '');
            
            // Prisma'nın kendi iç süreçleri için ortam değişkenine de yazıyoruz
            process.env.DATABASE_URL = dbUrl;
            break;
        }
    }
}

// Dosya okunamazsa veya URL bulunamazsa sistemi durduracak hata fırlatması
if (!dbUrl) {
    throw new Error(`Veritabanı URL'si bulunamadı. Lütfen ${envPath} yolunda .env dosyasının ve DATABASE_URL değişkeninin olduğundan emin olun.`);
}

const prisma = global.prisma || new PrismaClient({
    datasources: {
        db: { url: dbUrl }
    }
});

if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
}

module.exports = prisma;