const axios = require('axios');
const https = require('https');
const { addLog } = require('./historyController');
const prisma = require('../config/db');

// SSL Hatalarını Yoksay
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// --- KİMLİK (USER-AGENT) AYARLARI ---
const ASSASSIN_HEADERS = { 
    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
};

// --- İSTİHBARAT KAYNAKLARI (AJANLAR) ---
const fetchCrtSh = async (domain) => {
    try {
        const res = await axios.get(`https://crt.sh/?q=%25.${domain}&output=json`, { timeout: 12000, headers: ASSASSIN_HEADERS });
        if (Array.isArray(res.data)) return res.data.map(entry => entry.name_value.toLowerCase());
        return [];
    } catch (e) { return []; }
};

const fetchHackerTarget = async (domain) => {
    try {
        const res = await axios.get(`https://api.hackertarget.com/hostsearch/?q=${domain}`, { timeout: 10000, headers: ASSASSIN_HEADERS });
        if (typeof res.data === 'string' && !res.data.includes('error')) {
            return res.data.split('\n').map(line => line.split(',')[0].toLowerCase());
        }
        return [];
    } catch (e) { return []; }
};

const fetchAlienVault = async (domain) => {
    try {
        const res = await axios.get(`https://otx.alienvault.com/api/v1/indicators/domain/${domain}/passive_dns`, { timeout: 10000, headers: ASSASSIN_HEADERS });
        if (res.data && res.data.passive_dns) return res.data.passive_dns.map(entry => entry.hostname.toLowerCase());
        return [];
    } catch (e) { return []; }
};

const fetchThreatMiner = async (domain) => {
    try {
        const res = await axios.get(`https://api.threatminer.org/v2/domain.php?q=${domain}&rt=5`, { timeout: 10000, headers: ASSASSIN_HEADERS });
        if (res.data && Array.isArray(res.data.results)) return res.data.results.map(sub => sub.toLowerCase());
        return [];
    } catch (e) { return []; }
};

const fetchWayback = async (domain) => {
    try {
        const res = await axios.get(`http://web.archive.org/cdx/search/cdx?url=*.${domain}/*&output=json&fl=original&collapse=urlkey`, { timeout: 15000, headers: ASSASSIN_HEADERS });
        if (Array.isArray(res.data) && res.data.length > 1) {
            let subs = [];
            res.data.slice(1).forEach(row => {
                try {
                    let url = new URL(row[0]);
                    subs.push(url.hostname.toLowerCase());
                } catch(e) {}
            });
            return subs;
        }
        return [];
    } catch(e) { return []; }
};

const fetchCertSpotter = async (domain) => {
    try {
        const res = await axios.get(`https://api.certspotter.com/v1/issuances?domain=${domain}&include_subdomains=true&expand=dns_names`, { timeout: 10000, headers: ASSASSIN_HEADERS });
        let subs = [];
        if (Array.isArray(res.data)) {
            res.data.forEach(cert => {
                if (cert.dns_names) cert.dns_names.forEach(name => subs.push(name.toLowerCase()));
            });
        }
        return subs;
    } catch(e) { return []; }
};

const fetchAnubis = async (domain) => {
    try {
        const res = await axios.get(`https://jldc.me/anubis/subdomains/${domain}`, { timeout: 10000, headers: ASSASSIN_HEADERS });
        if (Array.isArray(res.data)) return res.data.map(sub => sub.toLowerCase());
        return [];
    } catch (e) { return []; }
};

// --- GİYOTİN FİLTRESİ ---
const extractValidSubdomains = (rawList, rootDomain) => {
    const cleanSubs = new Set();
    const escapedDomain = rootDomain.replace(/\./g, '\\.');
    const exactEndRegex = new RegExp(`\\.${escapedDomain}$`);
    const multipleDomainRegex = new RegExp(escapedDomain, 'g');
    const badTLDs = ['.com', '.net', '.org', '.info', '.biz', '.gov', '.edu', '.co', '.io'];

    rawList.forEach(raw => {
        if (typeof raw !== 'string') return;
        
        let sub = raw.toLowerCase().trim();
        sub = sub.replace(/^\*\./, ''); 
        sub = sub.replace(/^https?:\/\//, '').split('/')[0].split(':')[0].split('?')[0]; 
        
        if (!/^[a-z0-9.-]+$/.test(sub)) return;
        if (!exactEndRegex.test(sub) || sub === rootDomain) return;
        
        const matchCount = (sub.match(multipleDomainRegex) || []).length;
        if (matchCount > 1) return;
        if (sub.includes('..')) return;

        const labels = sub.split('.');
        let isLabelValid = true;
        for (let label of labels) {
            if (label.length === 0 || label.length > 63) isLabelValid = false;
            if (label.startsWith('-') || label.endsWith('-')) isLabelValid = false;
        }
        if (!isLabelValid) return;

        const prefix = sub.replace(`.${rootDomain}`, '');
        let hasBadTLD = false;
        for (let tld of badTLDs) {
            if (prefix.endsWith(tld) || prefix.includes(`${tld}.`)) {
                hasBadTLD = true; break;
            }
        }
        if (hasBadTLD) return;

        if (/^(252f|253d|2f|3d|5c|2b)/.test(prefix)) return;

        cleanSubs.add(sub);
    });

    return Array.from(cleanSubs).sort();
};

// --- HTTPX MANTIĞI: CANLI HEDEF DOĞRULAMASI ---
const probeDomain = async (domain) => {
    const protocols = ['https://', 'http://'];
    for (let proto of protocols) {
        try {
            const res = await axios.get(`${proto}${domain}`, {
                timeout: 5000, 
                maxRedirects: 2, 
                maxContentLength: 500000, 
                maxBodyLength: 500000,    
                httpsAgent,
                validateStatus: () => true, 
                headers: ASSASSIN_HEADERS 
            });

            const titleMatch = typeof res.data === 'string' ? res.data.match(/<title[^>]*>([^<]+)<\/title>/i) : null;
            const title = titleMatch ? titleMatch[1].trim() : 'HTML Değil';
            const server = res.headers['server'] || 'Bilinmiyor';

            return {
                domain,
                url: `${proto}${domain}`,
                status: res.status,
                title,
                server
            };
        } catch (error) {
            continue; 
        }
    }
    return null; 
};

// --- ANA MOTOR ---
const startRecon = async (req, res) => {
    const { domain } = req.body;

    if (!domain) return res.status(400).json({ success: false, error: "Hedef domain belirtilmedi!" });

    try {
        console.log(`[RECON] ${domain} için pasif istihbarat toplanıyor...`);

        const sources = [
            fetchCrtSh(domain), fetchHackerTarget(domain), fetchAlienVault(domain),
            fetchThreatMiner(domain), fetchWayback(domain), fetchCertSpotter(domain), fetchAnubis(domain)
        ];

        const results = await Promise.allSettled(sources);
        let rawSubdomains = [];

        results.forEach(result => {
            if (result.status === 'fulfilled' && Array.isArray(result.value)) rawSubdomains.push(...result.value);
        });

        const finalSubdomains = extractValidSubdomains(rawSubdomains, domain);
        console.log(`[RECON] Temiz hedef sayısı: ${finalSubdomains.length}. Aktif doğrulama (HTTPX) başlıyor...`);

        const chunkSize = 20;
        let aliveHosts = [];

        for (let i = 0; i < finalSubdomains.length; i += chunkSize) {
            const chunk = finalSubdomains.slice(i, i + chunkSize);
            const promises = chunk.map(sub => probeDomain(sub));
            const probeResults = await Promise.all(promises);
            aliveHosts.push(...probeResults.filter(r => r !== null));
        }

        console.log(`[RECON] İşlem Tamam! ${finalSubdomains.length} hedeften ${aliveHosts.length} tanesi canlı.`);

        aliveHosts.sort((a, b) => a.status - b.status);

        // --- 1. GERÇEK VERİTABANINA (ReconHistory & Subdomain) KAYIT ---
        const reconId = `RECON-${Math.floor(1000 + Math.random() * 9000)}`;
        const agentId = req.headers['x-assassin-id'] || 'GHOST-AGENT';

        try {
            await prisma.reconHistory.create({
                data: {
                    id: reconId,
                    targetDomain: domain,
                    agentId: agentId,
                    subdomains: {
                        create: aliveHosts.map(host => ({
                            url: host.url.substring(0, 250),
                            status: host.status,
                            title: host.title ? host.title.substring(0, 250) : null,
                            server: host.server ? host.server.substring(0, 250) : null
                        }))
                    }
                }
            });
            console.log(`💾 [DB] Recon verileri ilişkisel veritabanına işlendi: ${reconId}`);
        } catch (dbError) {
            console.error("Recon veritabanı kayıt hatası:", dbError);
        }

        // --- 2. VİTRİNE (Geçmiş Ekranı İçin) LOG ATMA ---
        const formattedTargets = aliveHosts.map(host => ({
            name: host.url,
            version: `[${host.status}] ${host.server} | ${host.title}`
        }));

        await addLog({
            agentId: agentId,
            id: reconId, 
            status: "COMPLETED",
            message: `${domain} üzerinde Pasif İstihbarat ve Aktif Doğrulama yapıldı. ${finalSubdomains.length} hedeften ${aliveHosts.length} tanesi canlı bulundu.`,
            apps: formattedTargets 
        });

        res.json({ 
            success: true, 
            target: domain,
            totalFound: finalSubdomains.length,
            totalAlive: aliveHosts.length,
            aliveHosts: aliveHosts 
        });

    } catch (error) {
        console.error("Recon Hatası:", error);
        res.status(500).json({ success: false, error: "İstihbarat motoru bir hatayla karşılaştı." });
    }
};

module.exports = { startRecon };