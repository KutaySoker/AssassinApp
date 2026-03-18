const request = require('supertest');
const express = require('express');
const routes = require('../index');

// Servisleri değil, direkt Controller'ları mockluyoruz!
jest.mock('../../controllers/scanController', () => ({
    startScan: jest.fn((req, res) => res.status(200).json({ success: true, message: "Tarama arka planda başarıyla başlatıldı." })),
    getScanDetails: jest.fn((req, res) => res.status(200).json({ success: true, data: { id: 'detay-123' } })),
    streamProgress: jest.fn((req, res) => res.status(200).end())
}));

jest.mock('../../controllers/historyController', () => ({
    getHistory: jest.fn((req, res) => res.status(200).json({ success: true, history: [] })),
    clearHistory: jest.fn((req, res) => res.status(200).json({ success: true, message: "Geçmiş temizlendi." }))
}));

jest.mock('../../controllers/updateController', () => ({
    checkUpdates: jest.fn((req, res) => res.status(200).json([])),
    startUpdate: jest.fn((req, res) => res.status(200).json({ success: true })),
    streamProgress: jest.fn((req, res) => res.status(200).end())
}));

jest.mock('../../controllers/reconController', () => ({
    startRecon: jest.fn((req, res) => res.status(200).json({ success: true }))
}));

const app = express();
app.use(express.json());
app.use('/api/scan', routes);

describe('API Rotaları (index.js) Güvenlik ve Mantık Testleri', () => {
    beforeEach(() => { jest.clearAllMocks(); });

    test('GET /api/scan/start - Taramayı başlatıp 200 OK dönmeli', async () => {
        const response = await request(app).get('/api/scan/start').set('X-Assassin-ID', 'GHOST-AGENT');
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });

    test('GET /api/scan/operations/history - Geçmiş taramaları başarıyla getirmeli', async () => {
        const response = await request(app).get('/api/scan/operations/history').set('X-Assassin-ID', 'GHOST-AGENT');
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });

    test('GET /api/scan/:id - Spesifik bir taramanın detaylarını getirmeli', async () => {
        const response = await request(app).get('/api/scan/detay-123').set('X-Assassin-ID', 'GHOST-AGENT');
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });
});