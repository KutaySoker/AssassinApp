const axios = require('axios');
const { searchCVE } = require('../nvdService');

// Axios'u tamamen taklit ediyoruz (İnternete çıkmasını engelliyoruz)
jest.mock('axios');

describe('nvdService.js Testleri', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
        
        // ZAMAN BÜKÜCÜ: Kodun içindeki tüm 'setTimeout' ve 'sleep' işlemlerini
        // beklemeksizin anında tetiklenmesi için taklit ediyoruz!
        jest.spyOn(global, 'setTimeout').mockImplementation((callback) => callback());
    });

    afterEach(() => {
        // Test bitince zamanı normale döndür
        jest.restoreAllMocks();
    });

    test('Senaryo 1: NVD API başarılı şekilde zafiyetleri dönerse', async () => {
        // Axios'un döneceği sahte veri (Happy Path)
        const mockResponse = {
            data: {
                vulnerabilities: [
                    {
                        cve: {
                            id: "CVE-2026-1234",
                            descriptions: [{ value: "Çok tehlikeli bir açık" }],
                            metrics: {
                                cvssMetricV31: [{
                                    cvssData: { baseScore: 9.8, baseSeverity: "CRITICAL" }
                                }]
                            },
                            published: "2026-02-27T00:00:00.000Z"
                        }
                    }
                ]
            }
        };

        // axios.get çağrıldığında bu başarılı veriyi dön
        axios.get.mockResolvedValueOnce(mockResponse);

        const result = await searchCVE("Alienware FX");

        // Beklentilerimiz
        expect(axios.get).toHaveBeenCalledTimes(1); // Sadece 1 kere istek atılmış olmalı
        expect(result).toHaveLength(1); // 1 tane CVE dönmeli
        expect(result[0].cveId).toBe("CVE-2026-1234");
        expect(result[0].score).toBe(9.8);
        expect(result[0].severity).toBe("CRITICAL");
    });

    test('Senaryo 2: NVD API boş sonuç dönerse (Zafiyet yoksa)', async () => {
        // Boş dönen veri
        axios.get.mockResolvedValueOnce({ data: { vulnerabilities: [] } });

        const result = await searchCVE("SuperGuvenliApp");

        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(result).toEqual([]); // Boş dizi dönmeli
    });

    test('Senaryo 3: Rate Limit (429) yersek ve ikinci denemede başarılı olursa', async () => {
        const mockSuccessResponse = {
            data: {
                vulnerabilities: [{ cve: { id: "CVE-2026-9999", descriptions: [], metrics: {}, published: "2026-01-01" } }]
            }
        };

        // 1. İstek: 429 Hatası fırlat!
        axios.get.mockRejectedValueOnce({ response: { status: 429 } });
        // 2. İstek: Başarılı ol!
        axios.get.mockResolvedValueOnce(mockSuccessResponse);

        const result = await searchCVE("Steam");

        // Toplam 2 kere istek atılmış olmalı (1 hata + 1 başarılı tekrar)
        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(result).toHaveLength(1);
        expect(result[0].cveId).toBe("CVE-2026-9999");
    });

    test('Senaryo 4: Rate Limit (429) üst üste 3 kez yaşanırsa pes etmeli', async () => {
        // Axios ne kadar çağrılırsa çağrılsın hep 429 hatası fırlat
        axios.get.mockRejectedValue({ response: { status: 429 } });

        const result = await searchCVE("InatciApp");

        // Kodumuzdaki retryCount >= 3 mantığı gereği 
        // 1 normal istek + 3 tekrar = Toplam 4 denemeden sonra pes etmeli
        expect(axios.get).toHaveBeenCalledTimes(4);
        expect(result).toEqual([]); // Pes edince boş dizi dönmeli
    });

    test('Senaryo 5: NVD API komple çökerse (500 veya Timeout hatası)', async () => {
        // 429 harici kritik bir hata (mesela Timeout veya 500)
        axios.get.mockRejectedValueOnce(new Error("Network Error"));

        const result = await searchCVE("BrokenApp");

        // Hemen pes etmeli, tekrar (retry) DENEMEMELİ
        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(result).toEqual([]);
    });
});