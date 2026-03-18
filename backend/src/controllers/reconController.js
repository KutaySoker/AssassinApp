const axios = require('axios');
const https = require('https');
const prisma = require('../config/db');
const { addLog } = require('./historyController');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const HEADERS = { 
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive'
};
const TIMEOUT = 15000;
const TARGET_STATUS_CODES = [200, 301, 302, 307, 308, 401, 403, 500];

// DÜZELTME: API'lerden gelen bozuk verileri (sonundaki nokta, başındaki yıldız) tertemiz yapar
const cleanSub = (sub) => sub ? sub.toLowerCase().trim().replace(/\.$/, '').replace(/^\*\./, '') : '';

// --- 8 SİLİNDİRLİ DEV OSINT MOTORU (HATA LOGLARI AÇIK) ---

const fetchCrtSh = async (domain) => {
    try {
        console.log(`[OSINT] crt.sh sorgulanıyor...`);
        // DÜZELTME: % işareti kaldırıldı, doğrudan domain aranıyor (WAF Bypass)
        const { data } = await axios.get(`https://crt.sh/?q=${domain}&output=json`, { headers: HEADERS, timeout: 20000 });
        if (!Array.isArray(data)) return [];
        return data.map(d => d.name_value.split('\n')).flat().map(cleanSub).filter(Boolean);
    } catch (e) { 
        console.log(`[OSINT-HATA] crt.sh çöktü: HTTP ${e.response?.status || e.message}`);
        return []; 
    }
};

const fetchHackerTarget = async (domain) => {
    try {
        console.log(`[OSINT] HackerTarget sorgulanıyor...`);
        const { data } = await axios.get(`https://api.hackertarget.com/hostsearch/?q=${domain}`, { headers: HEADERS, timeout: TIMEOUT });
        if (!data || data.includes('error')) return [];
        return data.split('\n').map(line => cleanSub(line.split(',')[0])).filter(Boolean);
    } catch (e) { 
        console.log(`[OSINT-HATA] HackerTarget çöktü: HTTP ${e.response?.status || e.message}`);
        return []; 
    }
};

const fetchAlienVault = async (domain) => {
    try {
        console.log(`[OSINT] AlienVault sorgulanıyor...`);
        const { data } = await axios.get(`https://otx.alienvault.com/api/v1/indicators/domain/${domain}/passive_dns`, { headers: HEADERS, timeout: TIMEOUT });
        if (!data || !data.passive_dns) return [];
        return data.passive_dns.map(entry => cleanSub(entry.hostname));
    } catch (e) { 
        console.log(`[OSINT-HATA] AlienVault çöktü: HTTP ${e.response?.status || e.message}`);
        return []; 
    }
};

const fetchCertSpotter = async (domain) => {
    try {
        console.log(`[OSINT] CertSpotter sorgulanıyor...`);
        const { data } = await axios.get(`https://api.certspotter.com/v1/issuances?domain=${domain}&include_subdomains=true&expand=dns_names`, { headers: HEADERS, timeout: TIMEOUT });
        if (!Array.isArray(data)) return [];
        return data.map(entry => entry.dns_names).flat().map(cleanSub).filter(Boolean);
    } catch (e) { 
        console.log(`[OSINT-HATA] CertSpotter çöktü: HTTP ${e.response?.status || e.message}`);
        return []; 
    }
};

const fetchAnubis = async (domain) => {
    try {
        console.log(`[OSINT] Anubis sorgulanıyor...`);
        const { data } = await axios.get(`https://jonlu.ca/anubis/subdomains/${domain}`, { headers: HEADERS, timeout: TIMEOUT });
        if (!Array.isArray(data)) return [];
        return data.map(cleanSub);
    } catch (e) { 
        console.log(`[OSINT-HATA] Anubis çöktü: HTTP ${e.response?.status || e.message}`);
        return []; 
    }
};

const fetchWayback = async (domain) => {
    try {
        console.log(`[OSINT] Wayback Machine sorgulanıyor...`);
        const { data } = await axios.get('http://web.archive.org/cdx/search/cdx', { 
            params: { url: `*.${domain}/*`, output: 'json', collapse: 'urlkey' },
            headers: HEADERS, timeout: 20000 
        });
        if (!data || !Array.isArray(data) || data.length <= 1) return [];
        const subs = new Set();
        data.slice(1).forEach(row => {
            try {
                const originalUrl = row[2];
                if (originalUrl) {
                    const hostname = new URL(originalUrl).hostname;
                    if (hostname.endsWith(domain)) subs.add(cleanSub(hostname));
                }
            } catch(err) {}
        });
        return Array.from(subs);
    } catch (e) { 
        console.log(`[OSINT-HATA] Wayback çöktü: HTTP ${e.response?.status || e.message}`);
        return []; 
    }
};

const fetchUrlScan = async (domain) => {
    try {
        console.log(`[OSINT] URLScan sorgulanıyor...`);
        const { data } = await axios.get(`https://urlscan.io/api/v1/search/?q=domain:${domain}`, { timeout: TIMEOUT });
        if (!data || !data.results) return [];
        return data.results.map(r => cleanSub(r.page.domain));
    } catch (e) { 
        console.log(`[OSINT-HATA] URLScan çöktü: HTTP ${e.response?.status || e.message}`);
        return []; 
    }
};

const fetchThreatMiner = async (domain) => {
    try {
        console.log(`[OSINT] ThreatMiner sorgulanıyor...`);
        const { data } = await axios.get(`https://api.threatminer.org/v2/domain.php?q=${domain}&rt=5`, { timeout: TIMEOUT });
        if (!data || !data.results) return [];
        return data.results.map(sub => cleanSub(sub));
    } catch (e) { 
        console.log(`[OSINT-HATA] ThreatMiner çöktü: HTTP ${e.response?.status || e.message}`);
        return []; 
    }
};

// --- HEDEF ANALİZİ ---
const probeDomain = async (domain) => {
    const protocols = ['https://', 'http://'];
    for (const protocol of protocols) {
        try {
            const targetUrl = `${protocol}${domain}`;
            const res = await axios.get(targetUrl, { 
                timeout: 8000, 
                httpsAgent, 
                validateStatus: () => true, 
                maxRedirects: 0, 
                headers: HEADERS 
            });

            if (protocol === 'http://' && (res.status === 301 || res.status === 302) && res.headers.location?.startsWith(`https://${domain}`)) {
                continue;
            }

            if (TARGET_STATUS_CODES.includes(res.status)) {
                console.log(`[PROBE-CANLI] ${targetUrl} -> HTTP ${res.status}`);
                return { url: targetUrl, status: res.status, server: res.headers['server'] || 'Bilinmiyor' };
            }
        } catch (e) { 
            continue; 
        }
    }
    return null;
};

// --- ANA KONTROL FONKSİYONU ---
const startRecon = async (req, res) => {
    const { domain } = req.body;
    const agentId = req.headers['x-assassin-id'] || 'GHOST-AGENT';

    if (!domain) return res.status(400).json({ error: "Hedef domain gerekli." });

    try {
        console.log(`\n--- [RECON BAŞLADI] Hedef: ${domain} ---`);
        
        const osintResults = await Promise.allSettled([
            fetchCrtSh(domain), fetchHackerTarget(domain), fetchAlienVault(domain),
            fetchCertSpotter(domain), fetchAnubis(domain), fetchWayback(domain),
            fetchUrlScan(domain), fetchThreatMiner(domain)
        ]);
        
        let allSubs = [];
        osintResults.forEach(result => {
            if (result.status === 'fulfilled') allSubs = allSubs.concat(result.value);
        });

        // Temizleyici ile son filtreden geçiyor
        const foundSubs = [...new Set([domain, ...allSubs])].filter(sub => sub.endsWith(domain) && !sub.includes('*'));
        
        console.log(`[RECON-BİLGİ] OSINT motorları toplam ${foundSubs.length} benzersiz alt alan adı buldu.`);
        console.log(`[PROBE] ${foundSubs.length} hedef taranıyor. Canlılık testi başlıyor...`);

        const probePromises = foundSubs.map(sub => probeDomain(sub));
        const probeResults = await Promise.all(probePromises);
        
        const aliveHosts = [];
        probeResults.forEach(hostData => {
            if (hostData) aliveHosts.push(hostData);
        });

        console.log(`[RECON-SONUÇ] ${aliveHosts.length} canlı hedef tespit edildi.\n`);
        const reconId = `RECON-${Date.now().toString().slice(-6)}`;

        try {
            await prisma.reconHistory.create({
                data: {
                    id: reconId, targetDomain: domain, agentId,
                    subdomains: { create: aliveHosts.map(h => ({ url: h.url, status: h.status, server: h.server })) }
                }
            });
        } catch (dbError) {}

        await addLog({
            id: reconId, agentId, status: "COMPLETED",
            message: `${domain} ağ analizi tamamlandı. Keşfedilen toplam: ${foundSubs.length}, Analiz edilen: ${aliveHosts.length}.`,
            apps: aliveHosts.map(h => ({ name: h.url, version: `HTTP ${h.status}` }))
        });

        res.json({ success: true, reconId, totalFound: foundSubs.length, aliveCount: aliveHosts.length, aliveHosts, rawSubdomains: foundSubs });

    } catch (error) {
        console.error("[KRİTİK HATA] İstihbarat işlemi sonlandırılamadı:", error.message);
        res.status(500).json({ error: "İstihbarat motoru işlemi tamamlayamadı." });
    }
};

module.exports = { startRecon };