const { exec, spawn } = require('child_process');
const { getOutdatedApps, performUpdate, updateEmitter } = require('../updateService');
const EventEmitter = require('events');

jest.mock('child_process');

describe('🛡️ UpdateService Kaos ve Stres Testleri', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        updateEmitter.removeAllListeners(); 
    });

    describe('🔍 getOutdatedApps - Ayrıştırma (Parsing) Kaos Senaryoları', () => {
        // ... (Bu kısımdaki test 1, 2, 3, 4 aynı kalıyor) ...
        test('1. Uzun ve bol boşluklu uygulama isimlerini (örn: Microsoft Visual C++) bozmadan almalı', async () => {
            const mockStdout = `
Name                                          Id                                Version        Available      Source
-----------------------------------------------------------------------------------------------------------------------
Microsoft Visual C++ 2015 UWP Desktop Runtime Microsoft.VCLibs.Desktop.14       14.0.33728.0   14.0.33730.0   winget
Kurumlar için Microsoft 365 Uygulamaları      ARP\\Machine\\X64\\O365ProPlusRetail 16.0.19725.20126 16.0.20000.0   winget
            `;
            exec.mockImplementation((cmd, options, callback) => callback(null, mockStdout, ''));
            const apps = await getOutdatedApps();
            expect(apps).toHaveLength(2);
        });

        test('2. Winget tablodan önce uyarı/hata mesajı basarsa (Kafası karışmamalı)', async () => {
            const mockStdout = `
Failed to update source: winget
Name             Id               Version    Available  Source
--------------------------------------------------------------
Discord          Discord.Discord  1.0.9015   1.0.9020   winget
            `;
            exec.mockImplementation((cmd, options, callback) => callback(null, mockStdout, ''));
            const apps = await getOutdatedApps();
            expect(apps).toHaveLength(1);
        });

        test('3. Tablonun içinde bomboş satırlar veya çöp veriler varsa atlamalı', async () => {
            const mockStdout = `
Name             Id               Version    Available  Source
--------------------------------------------------------------
SadeceTekKelime
Bozuk Satır Yapısı Ama Iki Kelime
VLC              VideoLAN.VLC     3.0.18     3.0.20     winget
            `;
            exec.mockImplementation((cmd, options, callback) => callback(null, mockStdout, ''));
            const apps = await getOutdatedApps();
            expect(apps).toHaveLength(1);
        });

        test('4. Farklı dillerdeki "Güncelleme Yok" mesajlarını yakalayıp boş dönmeli', async () => {
            exec.mockImplementationOnce((cmd, opt, cb) => cb(null, 'Herhangi bir kullanılabilir güncelleştirme bulunamadı.', ''));
            let apps = await getOutdatedApps();
            expect(apps).toEqual([]);
        });
    });

    describe('🚀 performUpdate - Canlı Yayın (SSE) ve Çıkış Kodu Senaryoları', () => {
        
        test('5. Frontend Loader için updateEmitter üzerinden stdout loglarını fırlatmalı', async () => {
            const mockChildProcess = new EventEmitter();
            mockChildProcess.stdout = new EventEmitter();
            mockChildProcess.stderr = new EventEmitter();
            
            spawn.mockReturnValue(mockChildProcess);

            const mockListener = jest.fn();
            updateEmitter.on('update-progress', mockListener);

            const updatePromise = performUpdate('Discord.Discord');

            mockChildProcess.stdout.emit('data', Buffer.from('İndiriliyor: %10\n'));
            mockChildProcess.stdout.emit('data', Buffer.from('Kuruluyor... \n'));
            
            mockChildProcess.emit('close', 0);
            await updatePromise;

            // 🔥 DÜZELTME BURADA: Artık 2 değil, 3 mesaj bekliyoruz (Son mesaj "Tamamlandı" bayrağı) 🔥
            expect(mockListener).toHaveBeenCalledTimes(3);
            expect(mockListener).toHaveBeenNthCalledWith(1, { text: 'İndiriliyor: %10' });
            expect(mockListener).toHaveBeenNthCalledWith(2, { text: 'Kuruluyor...' });
            expect(mockListener).toHaveBeenNthCalledWith(3, { text: 'Sistem başarıyla güncellendi!', done: true });
        });

        test('6. Winget garip bir eksi kod (-1978335215) döndüğünde bunu Başarılı (true) saymalı', async () => {
            const mockChildProcess = new EventEmitter();
            mockChildProcess.stdout = new EventEmitter();
            mockChildProcess.stderr = new EventEmitter();
            spawn.mockReturnValue(mockChildProcess);
            const updatePromise = performUpdate();
            
            mockChildProcess.emit('close', -1978335215); 
            
            const result = await updatePromise;
            expect(result.success).toBe(true);
        });

        test('7. Gerçekten başarısız olduğunda (Exit Code 1) false dönmeli', async () => {
            const mockChildProcess = new EventEmitter();
            mockChildProcess.stdout = new EventEmitter();
            mockChildProcess.stderr = new EventEmitter();
            spawn.mockReturnValue(mockChildProcess);
            const updatePromise = performUpdate();
            
            mockChildProcess.emit('close', 1); 
            
            const result = await updatePromise;
            expect(result.success).toBe(false);
        });
    });
});