const { startScan, getHistory, getScanDetails, streamProgress } = require('../../controllers/scanController');
const scanManager = require('../../services/scanManager');
const prisma = require('../../config/db');
const EventEmitter = require('events');

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
        findFirst: jest.fn() // findUnique yerine artık findFirst kullanıyoruz
    }
}));

jest.mock('../../controllers/historyController', () => ({
    addLog: jest.fn()
}));

describe('scanController.js Unit Testleri', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        jest.clearAllMocks();

        mockReq = {
            params: {},
            headers: { 'x-assassin-id': 'GHOST-TESTER' }, // İŞTE EKSİK KİMLİK KARTI
            on: jest.fn()
        };

        mockRes = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            setHeader: jest.fn(),
            flushHeaders: jest.fn(),
            write: jest.fn(),
            writeHead: jest.fn()
        };
    });

    describe('startScan Fonksiyonu', () => {
        test('Başarılı taramada 200 OK ve Arka Plan mesajı dönmeli', async () => {
            scanManager.performFullScan.mockResolvedValue({ scanId: '123', totalVulnerabilities: 0 });

            await startScan(mockReq, mockRes);

            expect(scanManager.performFullScan).toHaveBeenCalledTimes(1);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: "Tarama arka planda başarıyla başlatıldı." });
        });

        test('Tarama başlatılamazsa 500 status ve error mesajı dönmeli', async () => {
            // Arka planda çalışacağı için startScan kendi içinde error vermez (sadece try-catch hatası verirse 500 döner)
            // Biz burada kasten senkron bir hata fırlatıyoruz ki 500'e düşsün
            scanManager.performFullScan.mockImplementation(() => { throw new Error('Kritik Hata'); });

            await startScan(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ success: false, error: 'Kritik Hata' });
        });
    });

    describe('getHistory Fonksiyonu', () => {
        test('Veritabanından ajan ID sine göre geçmişi çekip dönmeli', async () => {
            const sahteGecmis = [{ id: '1' }, { id: '2' }];
            prisma.scanHistory.findMany.mockResolvedValue(sahteGecmis);

            await getHistory(mockReq, mockRes);

            expect(prisma.scanHistory.findMany).toHaveBeenCalledWith({
                where: { agentId: 'GHOST-TESTER' },
                orderBy: { startedAt: 'desc' }
            });
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: sahteGecmis });
        });

        test('Veritabanı hatasında 500 dönmeli', async () => {
            prisma.scanHistory.findMany.mockRejectedValue(new Error('DB Bağlantısı Yok'));

            await getHistory(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'DB Bağlantısı Yok' });
        });
    });

    describe('getScanDetails Fonksiyonu', () => {
        test('Verilen ID ve Ajan kimliği ile detayları getirip dönmeli', async () => {
            mockReq.params.id = 'scan-999';
            const sahteDetay = { id: 'scan-999', apps: [] };
            prisma.scanHistory.findFirst.mockResolvedValue(sahteDetay);

            await getScanDetails(mockReq, mockRes);

            expect(prisma.scanHistory.findFirst).toHaveBeenCalledWith({
                where: { id: 'scan-999', agentId: 'GHOST-TESTER' },
                include: expect.any(Object)
            });
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: sahteDetay });
        });
    });

    describe('streamProgress Fonksiyonu (Canlı Yayın)', () => {
        test('Doğru HTTP Headerlarını ayarlamalı ve yayını açmalı', async () => {
            await streamProgress(mockReq, mockRes);

            expect(mockRes.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }));

            scanManager.progressEmitter.emit('progress', { percent: 10 });
            expect(mockRes.write).toHaveBeenCalledWith(`data: {"percent":10}\n\n`);
        });
    });
});