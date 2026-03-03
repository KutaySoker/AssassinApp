const request = require('supertest');
const express = require('express');

// DOSYA YOLLARI SENİN YAPIYA GÖRE KUSURSUZLAŞTIRILDI:
const routes = require('../index'); // Hemen bir üstteki index.js (Rotalar)
const scanManager = require('../../services/scanManager'); // İki üst klasörden services'a geçiş
const prisma = require('../../config/db'); // İki üst klasörden config'e geçiş

// 1. Tarama Motorunu ve Veritabanını Mock'luyoruz (Gerçek işlem yapmasınlar)
jest.mock('../../services/scanManager', () => {
    const EventEmitter = require('events');
    return {
        performFullScan: jest.fn(),
        progressEmitter: new EventEmitter() // Canlı yayın radyosunu sahte olarak açtık
    };
});

jest.mock('../../config/db', () => ({
    scanHistory: {
        findMany: jest.fn(),
        findUnique: jest.fn()
    }
}));

// 2. Test için Sahte (Mini) Bir Express Sunucusu Kuruyoruz
const app = express();
app.use(express.json());
// Kritik Nokta: Senin index.js rotalarını "/api/scan" kapısına bağlıyoruz
app.use('/api/scan', routes); 

describe('API Rotaları (index.js) Güvenlik ve Mantık Testleri', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('GET /api/scan/start - Taramayı başlatıp 200 OK dönmeli', async () => {
        // Tarama motoru sahte bir başarı cevabı dönsün
        scanManager.performFullScan.mockResolvedValue({ scanId: 'test-scan-123', totalVulnerabilities: 5 });

        // Frontend gibi sahte bir istek atıyoruz
        const response = await request(app).get('/api/scan/start');

        // Beklentilerimiz:
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.scanId).toBe('test-scan-123');
        
        expect(scanManager.performFullScan).toHaveBeenCalledTimes(1);
    });

    test('GET /api/scan/history - Geçmiş taramaları başarıyla getirmeli', async () => {
        const mockHistory = [
            { id: '1', status: 'COMPLETED' }, 
            { id: '2', status: 'SCANNING' }
        ];
        prisma.scanHistory.findMany.mockResolvedValue(mockHistory);

        const response = await request(app).get('/api/scan/history');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
        expect(prisma.scanHistory.findMany).toHaveBeenCalledTimes(1);
    });

    test('GET /api/scan/:id - Spesifik bir taramanın detaylarını getirmeli', async () => {
        const mockDetails = { id: 'detay-123', apps: [] };
        prisma.scanHistory.findUnique.mockResolvedValue(mockDetails);

        const response = await request(app).get('/api/scan/detay-123');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe('detay-123');
    });

    test('Sunucu Çökerse (Exception) 500 Internal Server Error dönmeli', async () => {
        // Motor bilerek kasten patlasın
        scanManager.performFullScan.mockRejectedValue(new Error("Beklenmeyen Kritik Hata"));

        const response = await request(app).get('/api/scan/start');

        // Uygulama tamamen çökmek yerine kullanıcıya efendi gibi 500 hatası dönmeli
        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe("Beklenmeyen Kritik Hata");
    });
});