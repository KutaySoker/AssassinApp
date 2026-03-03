const { startScan, getHistory, getScanDetails, streamProgress } = require('../../controllers/scanController');
const scanManager = require('../../services/scanManager');
const prisma = require('../../config/db');
const EventEmitter = require('events');

// 1. Bağımlılıkları Mock'luyoruz
jest.mock('../../services/scanManager', () => {
    const EventEmitter = require('events');
    return {
        performFullScan: jest.fn(),
        progressEmitter: new EventEmitter()
    };
});

jest.mock('../../config/db', () => ({
    scanHistory: {
        findMany: jest.fn(),
        findUnique: jest.fn()
    }
}));

describe('scanController.js Unit Testleri', () => {
    let mockReq;
    let mockRes;

    // Her testten önce tertemiz, sahte Request (req) ve Response (res) objeleri yaratıyoruz
    beforeEach(() => {
        jest.clearAllMocks();
        
        mockReq = {
            params: {},
            on: jest.fn() // streamProgress'teki req.on('close') için
        };
        
        mockRes = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(), // res.status(500).json(...) zinciri için
            setHeader: jest.fn(),
            flushHeaders: jest.fn(),
            write: jest.fn(),
            writeHead: jest.fn()
        };
    });

    describe('startScan Fonksiyonu', () => {
        test('Başarılı taramada 200 OK ve datayı dönmeli', async () => {
            scanManager.performFullScan.mockResolvedValue({ scanId: '123', totalVulnerabilities: 0 });

            await startScan(mockReq, mockRes);

            expect(scanManager.performFullScan).toHaveBeenCalledTimes(1);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: { scanId: '123', totalVulnerabilities: 0 } });
        });

        test('Tarama patlarsa 500 status ve error mesajı dönmeli', async () => {
            scanManager.performFullScan.mockRejectedValue(new Error('Tarama Motoru Çöktü'));

            await startScan(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ success: false, error: 'Tarama Motoru Çöktü' });
        });
    });

    describe('getHistory Fonksiyonu', () => {
        test('Veritabanından geçmişi çekip dönmeli', async () => {
            const sahteGecmis = [{ id: '1' }, { id: '2' }];
            prisma.scanHistory.findMany.mockResolvedValue(sahteGecmis);

            await getHistory(mockReq, mockRes);

            expect(prisma.scanHistory.findMany).toHaveBeenCalledTimes(1);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: sahteGecmis });
        });

        test('Veritabanı hatasında 500 dönmeli', async () => {
            prisma.scanHistory.findMany.mockRejectedValue(new Error('DB Bağlantısı Yok'));

            await getHistory(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ success: false, error: 'DB Bağlantısı Yok' });
        });
    });

    describe('getScanDetails Fonksiyonu', () => {
        test('Verilen ID ile detayları getirip dönmeli', async () => {
            mockReq.params.id = 'scan-999';
            const sahteDetay = { id: 'scan-999', apps: [] };
            prisma.scanHistory.findUnique.mockResolvedValue(sahteDetay);

            await getScanDetails(mockReq, mockRes);

            expect(prisma.scanHistory.findUnique).toHaveBeenCalledWith({
                where: { id: 'scan-999' },
                include: expect.any(Object)
            });
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: sahteDetay });
        });
    });

    describe('streamProgress Fonksiyonu (Canlı Yayın)', () => {
        test('Doğru HTTP Headerlarını ayarlamalı ve yayını açmalı', async () => {
            await streamProgress(mockReq, mockRes);

            // Canlı yayın (SSE) için gereken kurallar (headers) yazılmış mı?
            expect(mockRes.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }));

            // EventEmitter bir progress fırlattığında res.write tetiklenmeli
            scanManager.progressEmitter.emit('progress', { percent: 10 });
            expect(mockRes.write).toHaveBeenCalledWith(`data: {"percent":10}\n\n`);
        });
    });
});