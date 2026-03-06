const { exec, spawn } = require('child_process');
const { getOutdatedApps, performUpdate, updateEmitter } = require('../updateService');
const EventEmitter = require('events');

jest.mock('child_process');

describe('🛡️ UpdateService Kaos ve Stres Testleri', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        updateEmitter.removeAllListeners(); // Her testten önce eski event'leri temizle
    });

    describe('🔍 getOutdatedApps - Ayrıştırma (Parsing) Kaos Senaryoları', () => {
        
        test('1. Uzun ve bol boşluklu uygulama isimlerini (örn: Microsoft Visual C++) bozmadan almalı', async () => {
            const mockStdout = `
Name                                          Id                                Version          Available      Source
-----------------------------------------------------------------------------------------------------------------------
Microsoft Visual C++ 2015 UWP Desktop Runtime Microsoft.VCLibs.Desktop.14       14.0.33728.0     14.0.33730.0   winget
Kurumlar için Microsoft 365 Uygulamaları      ARP\\Machine\\X64\\O365ProPlusRetail 16.0.19725.20126 16.0.20000.0   winget
            `;

            exec.mockImplementation((cmd, options, callback) => callback(null, mockStdout, ''));
            const apps = await getOutdatedApps();

            expect(apps).toHaveLength(2);
            expect(apps[0].name).toBe('Microsoft Visual C++ 2015 UWP Desktop Runtime');
            expect(apps[1].id).toBe('ARP\\Machine\\X64\\O365ProPlusRetail');
            expect(apps[1].name).toBe('Kurumlar için Microsoft 365 Uygulamaları');
        });

        test('2. Winget tablodan önce uyarı/hata mesajı basarsa (Kafası karışmamalı)', async () => {
            const mockStdout = `
Failed to update source: winget
Ağ bağlantısı koptuğu için bazı kaynaklar güncellenemedi.
Yine de yerel önbellek kullanılıyor...

Name             Id               Version    Available  Source
--------------------------------------------------------------
Discord          Discord.Discord  1.0.9015   1.0.9020   winget
            `;

            exec.mockImplementation((cmd, options, callback) => callback(null, mockStdout, ''));
            const apps = await getOutdatedApps();

            expect(apps).toHaveLength(1);
            expect(apps[0].name).toBe('Discord');
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

            // Sadece regex kurallarına uyan (en az 4 sütunlu) VLC'yi yakalamalı
            expect(apps).toHaveLength(1);
            expect(apps[0].name).toBe('VLC');
        });

        test('4. Farklı dillerdeki "Güncelleme Yok" mesajlarını yakalayıp boş dönmeli', async () => {
            const trMessage = 'Herhangi bir kullanılabilir güncelleştirme bulunamadı.';
            const enMessage = 'No applicable update found.';
            
            exec.mockImplementationOnce((cmd, opt, cb) => cb(null, trMessage, ''));
            let apps = await getOutdatedApps();
            expect(apps).toEqual([]);

            exec.mockImplementationOnce((cmd, opt, cb) => cb(null, enMessage, ''));
            apps = await getOutdatedApps();
            expect(apps).toEqual([]);
        });
    });

    describe('🚀 performUpdate - Canlı Yayın (SSE) ve Çıkış Kodu Senaryoları', () => {
        
        test('5. Frontend Loader için updateEmitter üzerinden stdout loglarını fırlatmalı', async () => {
            // Sahte bir child_process spawn objesi yaratıyoruz
            const mockChildProcess = new EventEmitter();
            mockChildProcess.stdout = new EventEmitter();
            mockChildProcess.stderr = new EventEmitter();
            
            spawn.mockReturnValue(mockChildProcess);

            // Emit olayını dinleyecek bir ajan fonksiyon
            const mockListener = jest.fn();
            updateEmitter.on('update-progress', mockListener);

            // Güncellemeyi başlat (Asenkron olduğu için Promise'i değişkene alıyoruz ama bekletmiyoruz)
            const updatePromise = performUpdate('Discord.Discord');

            // Terminale veri akıyormuş gibi sahte eventler tetikliyoruz
            mockChildProcess.stdout.emit('data', Buffer.from('İndiriliyor: %10\n'));
            mockChildProcess.stdout.emit('data', Buffer.from('Kuruluyor... \n'));
            
            // İşlemi bitir
            mockChildProcess.emit('close', 0);
            await updatePromise;

            // Emitter gerçekten Frontend'e doğru mesajları yollamış mı?
            expect(mockListener).toHaveBeenCalledTimes(2);
            expect(mockListener).toHaveBeenNthCalledWith(1, { text: 'İndiriliyor: %10' });
            expect(mockListener).toHaveBeenNthCalledWith(2, { text: 'Kuruluyor...' });
        });

        test('6. Winget garip bir eksi kod (-1978335215) döndüğünde bunu Başarılı (true) saymalı', async () => {
            const mockChildProcess = new EventEmitter();
            mockChildProcess.stdout = new EventEmitter();
            mockChildProcess.stderr = new EventEmitter();
            
            spawn.mockReturnValue(mockChildProcess);

            const updatePromise = performUpdate();
            
            // Winget'in meşhur "Başarılı ama reboot gerekebilir" tarzı garip kodu
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
            mockChildProcess.emit('close', 1); // Hata kodu
            
            const result = await updatePromise;
            expect(result.success).toBe(false);
        });
    });
});