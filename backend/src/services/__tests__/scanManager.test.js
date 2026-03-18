const { performFullScan, progressEmitter } = require('../scanManager'); // YENİ: Canlı yayın radyosunu da import ettik
const { getInstalledApps } = require('../appDiscovery');
const { searchCVE } = require('../nvdService');
const prisma = require('../../config/db');

// 1. Dış Servisleri Taklit Ediyoruz
jest.mock('../appDiscovery');
jest.mock('../nvdService');

// 2. Prisma'yı (Veritabanını) Tamamen Taklit Ediyoruz
jest.mock('../../config/db', () => ({
    scanHistory: {
        create: jest.fn(),
        update: jest.fn()
    },
    discoveredApp: {
        upsert: jest.fn()
    },
    vulnerability: {
        upsert: jest.fn()
    }
}));

describe('scanManager.js Testleri (v1.0.0 Siberpunk Sürümü)', () => {

    beforeEach(() => {
        jest.clearAllMocks();

        // Zaman bükücü: sleep(2000) komutunu beklemeden geçmek için
        jest.spyOn(global, 'setTimeout').mockImplementation((cb) => cb());

        // YENİ: Canlı yayının (EventEmitter) çalışıp çalışmadığını dinliyoruz
        jest.spyOn(progressEmitter, 'emit');

        // Veritabanı (Prisma) Sahte Cevapları (Default)
        prisma.scanHistory.create.mockResolvedValue({ id: 'sahte-tarama-id-123' });
        prisma.scanHistory.update.mockResolvedValue({ id: 'sahte-tarama-id-123', status: 'COMPLETED' });
        prisma.discoveredApp.upsert.mockResolvedValue({ id: 'sahte-app-id-456' });
        prisma.vulnerability.upsert.mockResolvedValue({ id: 'sahte-cve-id-789' });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('Senaryo 1: Kusursuz Tarama ve Canlı Yayın (Happy Path)', async () => {
        getInstalledApps.mockResolvedValue([
            { DisplayName: "Alienware Command", DisplayVersion: "6.10", Publisher: "Dell" }, // Geçerli
            { DisplayName: "A", DisplayVersion: "1.0" } // İsim çok kısa, çöpe!
        ]);

        searchCVE.mockResolvedValue([
            { cveId: "CVE-2026-9999", description: "Kritik Açık", score: 9.8, severity: "CRITICAL" }
        ]);

        const result = await performFullScan();

        // BEKLENTİLER
        expect(prisma.scanHistory.create).toHaveBeenCalledWith({ data: { status: 'SCANNING', agentId: 'GHOST-AGENT' } });
        expect(prisma.vulnerability.upsert).toHaveBeenCalledTimes(1);

        // YENİ: EventEmitter "progress" eventi fırlattı mı? (Frontend'in loader'ı için şart)
        expect(progressEmitter.emit).toHaveBeenCalledWith('progress', expect.any(Object));

        expect(result).toEqual({
            scanId: 'sahte-tarama-id-123',
            totalVulnerabilities: 1
        });
    });

    test('Senaryo 2: Mükerrer (Klon) Uygulamaların Katledilmesi', async () => {
        getInstalledApps.mockResolvedValue([
            { DisplayName: "Steam (32-bit) [Gereksiz]", DisplayVersion: "2.10.91", Publisher: "Valve" },
            { DisplayName: "Steam", DisplayVersion: "2.10.91" }, // KLON (Regex bunu da Steam 2.10.91 yapacak)
            { DisplayName: "Unknown", DisplayVersion: "1.0" }, // Çöp
            { DisplayName: "GecerliApp", DisplayVersion: "0.0" } // Çöp
        ]);

        searchCVE.mockResolvedValue([]);

        await performFullScan();

        // 4 uygulama yolladık ama 1'i klon, 2'si çöp. Veritabanına SADECE 1 tane "Steam" gitmeli!
        expect(prisma.discoveredApp.upsert).toHaveBeenCalledTimes(1);

        expect(prisma.discoveredApp.upsert).toHaveBeenCalledWith(expect.objectContaining({
            where: { app_unique: { name: "Steam", version: "2.10.91" } }
        }));
    });

    test('Senaryo 3: NVD Aynı Zafiyeti İki Kere Verirse Veritabanını Yormamalı', async () => {
        getInstalledApps.mockResolvedValue([
            { DisplayName: "Kusursuz App", DisplayVersion: "1.0" }
        ]);

        // NVD'nin API'si kafayı yiyip aynı CVE'yi iki kere yollarsa...
        searchCVE.mockResolvedValue([
            { cveId: "CVE-1111", description: "Açık", score: 5.0, severity: "MEDIUM" },
            { cveId: "CVE-1111", description: "Açık", score: 5.0, severity: "MEDIUM" } // KLON CVE
        ]);

        const result = await performFullScan();

        // Prisma'ya zafiyet kaydı SADECE 1 KERE yapılmalı! (Map filtresi devrede)
        expect(prisma.vulnerability.upsert).toHaveBeenCalledTimes(1);

        // Zafiyet sayacı şişmemeli, 1 demeli
        expect(result.totalVulnerabilities).toBe(1);
    });

    test('Senaryo 4: Veritabanı Çökerse Sistem Durmamalı (Hata Toleransı)', async () => {
        getInstalledApps.mockResolvedValue([
            { DisplayName: "Bozuk App", DisplayVersion: "1.0" },
            { DisplayName: "Saglam App", DisplayVersion: "2.0" }
        ]);

        // İlkinde veritabanı yansın, ikincisinde düzelsin
        prisma.discoveredApp.upsert
            .mockRejectedValueOnce(new Error("Database Çöktü")) // 1. çağrı
            .mockResolvedValueOnce({ id: 'saglam-app-id' });    // 2. çağrı

        searchCVE.mockResolvedValue([]);

        await performFullScan();

        // İkisi için de uğraşmalı
        expect(prisma.discoveredApp.upsert).toHaveBeenCalledTimes(2);

        // Günün sonunda o tarama başarıyla tamamlanmalı
        expect(prisma.scanHistory.update).toHaveBeenCalledWith(expect.objectContaining({
            data: { status: 'COMPLETED' }
        }));
    });
});