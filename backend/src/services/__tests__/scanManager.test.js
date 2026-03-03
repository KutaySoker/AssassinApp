const { performFullScan } = require('../scanManager');
const { getInstalledApps } = require('../appDiscovery');
const { searchCVE } = require('../nvdService');
const prisma = require('../../config/db'); // Dosya yoluna dikkat, bir üst klasöre daha çıkıyoruz

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

describe('scanManager.js Testleri (Büyük Patron)', () => {

    beforeEach(() => {
        jest.clearAllMocks();

        // Zaman bükücü: sleep(2000) komutunu sıfır saniyede geçmek için
        jest.spyOn(global, 'setTimeout').mockImplementation((cb) => cb());

        // Veritabanı (Prisma) Sahte Cevapları (Default)
        prisma.scanHistory.create.mockResolvedValue({ id: 'sahte-tarama-id-123' });
        prisma.scanHistory.update.mockResolvedValue({ id: 'sahte-tarama-id-123', status: 'COMPLETED' });
        prisma.discoveredApp.upsert.mockResolvedValue({ id: 'sahte-app-id-456' });
        prisma.vulnerability.upsert.mockResolvedValue({ id: 'sahte-cve-id-789' });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('Senaryo 1: Kusursuz Tarama (Happy Path)', async () => {
        // Sahte Uygulamalarımız (Biri geçerli, biri geçersiz)
        getInstalledApps.mockResolvedValue([
            { DisplayName: "Alienware Command", DisplayVersion: "6.10", Publisher: "Dell" }, // Geçerli
            { DisplayName: "A", DisplayVersion: "1.0" } // İsim çok kısa (<3), atlanmalı!
        ]);

        // NVD'den Dönen Sahte Zafiyetler
        searchCVE.mockResolvedValue([
            { cveId: "CVE-2026-9999", description: "Kritik Açık", score: 9.8, severity: "CRITICAL" }
        ]);

        const result = await performFullScan();

        // BEKLENTİLER (EXPECTATIONS)

        // 1. Tarama kaydı veritabanında oluşturulmalı ve güncellenmeli
        expect(prisma.scanHistory.create).toHaveBeenCalledWith({ data: { status: 'SCANNING' } });
        expect(prisma.scanHistory.update).toHaveBeenCalledWith({
            where: { id: 'sahte-tarama-id-123' },
            data: { status: 'COMPLETED' }
        });

        // 2. Sadece 1 geçerli uygulama olduğu için Prisma upsert 1 kere çalışmalı
        expect(prisma.discoveredApp.upsert).toHaveBeenCalledTimes(1);

        // 3. Regex temizlemesinin çalıştığını teyit edelim ("Alienware Command" -> 2 kelime)
        expect(prisma.discoveredApp.upsert).toHaveBeenCalledWith(expect.objectContaining({
            where: { app_unique: { name: "Alienware Command", version: "6.10" } }
        }));

        // 4. Zafiyet (CVE) veritabanına yazılmalı
        expect(prisma.vulnerability.upsert).toHaveBeenCalledTimes(1);

        // 5. Fonksiyon doğru dönüş yapmalı
        expect(result).toEqual({
            scanId: 'sahte-tarama-id-123',
            totalVulnerabilities: 1
        });
    });

    test('Senaryo 2: Regex Temizlemesi ve Hatalı Uygulama Atlaması', async () => {
        getInstalledApps.mockResolvedValue([
            { DisplayName: "Steam (32-bit) [Gereksiz]", DisplayVersion: "2.10.91", Publisher: "Valve" },
            { DisplayName: "Unknown", DisplayVersion: "1.0" }, // İsim Unknown, atlanmalı
            { DisplayName: "GecerliApp", DisplayVersion: "0.0" } // Versiyon 0.0, atlanmalı
        ]);

        searchCVE.mockResolvedValue([]); // CVE bulamasın

        await performFullScan();

        // Sadece "Steam" uygulaması veritabanına gitmeli, diğer 2'si atlanmalı
        expect(prisma.discoveredApp.upsert).toHaveBeenCalledTimes(1);

        // Regex parantezleri ve gereksizleri silip sadece ilk iki kelimeyi almalı
        expect(prisma.discoveredApp.upsert).toHaveBeenCalledWith(expect.objectContaining({
            // BURAYI DÜZELTTİK: "Steam 32bit" yerine "Steam" oldu
            where: { app_unique: { name: "Steam", version: "2.10.91" } }
        }));
    });

    test('Senaryo 3: Veritabanı çökerse (App kaydedilemezse) diğer uygulamaya devam etmeli', async () => {
        getInstalledApps.mockResolvedValue([
            { DisplayName: "Bozuk App", DisplayVersion: "1.0" },
            { DisplayName: "Saglam App", DisplayVersion: "2.0" }
        ]);

        // İlk uygulama kaydedilirken Prisma Hata versin, İkinci uygulamada başarılı olsun
        prisma.discoveredApp.upsert
            .mockRejectedValueOnce(new Error("Database Çöktü")) // 1. çağrı
            .mockResolvedValueOnce({ id: 'saglam-app-id' });    // 2. çağrı

        searchCVE.mockResolvedValue([]);

        await performFullScan();

        // İki uygulama için de Prisma 2 kere çağrılmalı (biri patlasa bile diğeri için devam etmeli)
        expect(prisma.discoveredApp.upsert).toHaveBeenCalledTimes(2);

        // Tarama her şeye rağmen COMPLETED olarak işaretlenmeli (sistem tamamen çökmemeli)
        expect(prisma.scanHistory.update).toHaveBeenCalledWith(expect.objectContaining({
            data: { status: 'COMPLETED' }
        }));
    });
});