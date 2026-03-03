const { spawn } = require('child_process');
const { getInstalledApps } = require('../appDiscovery'); // Yolun doğruluğunu kontrol et

// Node.js'in child_process modülünü tamamen taklit (mock) ediyoruz
jest.mock('child_process');

describe('appDiscovery.js Testleri', () => {
    // Her testten önce mock'ları temizlemek için değişkenler
    let mockStdoutOn;
    let mockStderrOn;
    let mockOn;

    beforeEach(() => {
        jest.clearAllMocks();

        // Spawn fonksiyonunun içindeki event listener'ları sahte fonksiyonlarla dolduruyoruz
        mockStdoutOn = jest.fn();
        mockStderrOn = jest.fn();
        mockOn = jest.fn();

        spawn.mockReturnValue({
            stdout: { on: mockStdoutOn },
            stderr: { on: mockStderrOn },
            on: mockOn
        });
    });

    test('Senaryo 1: PowerShell başarılı bir şekilde JSON listesi dönerse', async () => {
        // Sahte veri (Sanki PowerShell'den gelmiş gibi)
        const fakeApps = [
            { DisplayName: "Alienware FX", DisplayVersion: "6.10", Publisher: "Dell" },
            { DisplayName: "Steam", DisplayVersion: "2.10", Publisher: "Valve" }
        ];

        // Kodumuz stdout.on('data') çağırdığında ona bu sahte veriyi ver
        mockStdoutOn.mockImplementation((event, callback) => {
            if (event === 'data') {
                callback(Buffer.from(JSON.stringify(fakeApps)));
            }
        });

        // Kodumuz on('close') çağırdığında çıkış kodu olarak 0 (başarılı) dön
        mockOn.mockImplementation((event, callback) => {
            if (event === 'close') callback(0);
        });

        // Asıl fonksiyonumuzu çalıştırıyoruz
        const result = await getInstalledApps();

        // Beklentilerimiz (Expectations)
        expect(spawn).toHaveBeenCalledTimes(1); // PowerShell 1 kere çağrılmış olmalı
        expect(result).toEqual(fakeApps);       // Dönen sonuç bizim sahte verimizle aynı olmalı
    });

    test('Senaryo 2: PowerShell tek bir uygulama dönerse (Array değilse)', async () => {
        const fakeSingleApp = { DisplayName: "Tekil App", DisplayVersion: "1.0", Publisher: "Test" };

        mockStdoutOn.mockImplementation((event, callback) => {
            if (event === 'data') callback(Buffer.from(JSON.stringify(fakeSingleApp)));
        });

        mockOn.mockImplementation((event, callback) => {
            if (event === 'close') callback(0);
        });

        const result = await getInstalledApps();

        // Kodun tekil objeyi otomatik olarak Array'e [ {..} ] çevirmesini bekliyoruz
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(1);
        expect(result[0].DisplayName).toBe("Tekil App");
    });

    test('Senaryo 3: PowerShell hata (Error) fırlatırsa', async () => {
        // Kodumuz on('error') çağırdığında hata fırlat
        mockOn.mockImplementation((event, callback) => {
            if (event === 'error') callback(new Error("PS Crash"));
        });

        const result = await getInstalledApps();

        // Hata durumunda kodumuzun çökmemesini ve boş bir dizi [] dönmesini bekliyoruz
        expect(result).toEqual([]);
    });

    test('Senaryo 4: PowerShell geçersiz (bozuk) JSON dönerse', async () => {
        mockStdoutOn.mockImplementation((event, callback) => {
            if (event === 'data') callback(Buffer.from("Bozuk { JSON [ Verisi"));
        });

        mockOn.mockImplementation((event, callback) => {
            if (event === 'close') callback(0);
        });

        const result = await getInstalledApps();

        // JSON.parse patlayacak ve catch bloğuna düşecek, sonuç [] dönmeli
        expect(result).toEqual([]);
    });
});