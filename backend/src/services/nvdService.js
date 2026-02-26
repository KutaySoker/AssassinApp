const axios = require('axios');
require('dotenv').config();

const NVD_BASE_URL = 'https://services.nvd.nist.gov/rest/json/cves/2.0';
const API_KEY = process.env.NVD_API_KEY;

// Bekleme fonksiyonu
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function searchCVE(keyword, retryCount = 0) {
    const encodedKeyword = encodeURIComponent(keyword);
    console.log(`🔍 NVD Aranıyor: ${keyword}`);

    try {
        const response = await axios.get(`${NVD_BASE_URL}?keywordSearch=${encodedKeyword}`, {
            headers: {
                'apiKey': API_KEY,
                'User-Agent': 'CVE-Scanner/1.0'
            },
            timeout: 15000 // Timeout süresini de arttırdım
        });

        // Başarılı olursa 2 saniye bekle (Nezaket kuralı)
        await sleep(2000);

        const vulnerabilities = response.data.vulnerabilities || [];
        return vulnerabilities.map(v => ({
            cveId: v.cve.id,
            description: v.cve.descriptions?.[0]?.value || 'Açıklama yok',
            score: v.cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore || 0,
            severity: v.cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseSeverity || 'UNKNOWN',
            published: new Date(v.cve.published),
            link: `https://nvd.nist.gov/vuln/detail/${v.cve.id}`
        }));

    } catch (error) {
        // HATA YÖNETİMİ
        if (error.response?.status === 429 || error.response?.status === 503) {
            // Eğer çok fazla denediysek pes et
            if (retryCount >= 3) {
                console.error(`❌ ${keyword} için çok fazla denendi, pas geçiliyor.`);
                return [];
            }

            // 429 Hatası (Rate Limit) -> Bekle ve Tekrar Dene
            console.warn(`⚠️ Rate Limit (429)! 10 saniye soğutuluyor... (Deneme: ${retryCount + 1})`);
            await sleep(10000); // 10 saniye ceza beklemesi
            return searchCVE(keyword, retryCount + 1); // RECURSIVE CALL (Kendini tekrar çağır)
        } 
        
        console.error(`❌ API Hatası: ${error.message}`);
        return [];
    }
}

module.exports = { searchCVE };