const fs = require('fs');
const path = require('path');
const { Resolver } = require('dns').promises;

const BACKUP_RESOLVERS = [
    '8.8.8.8', '8.8.4.4',       // Google
    '1.1.1.1', '1.0.0.1',       // Cloudflare
    '9.9.9.9', '149.112.112.112', // Quad9
    '208.67.222.222', '208.67.220.220' // OpenDNS
];

function loadWordlist() {
    const filePath = path.join(__dirname, '../wordlists/subdomain.txt');
    if (!fs.existsSync(filePath)) {
        console.warn("\n[UYARI] wordlists/subdomains.txt bulunamadı!");
        return ['api', 'dev', 'test', 'portal', 'admin', 'vpn', 'console']; 
    }
    return fs.readFileSync(filePath, 'utf8').split('\n').map(w => w.trim()).filter(Boolean);
}

function generateTargets(domain, passiveResults) {
    const targetSet = new Set(passiveResults); 
    const wordlist = loadWordlist();
    
    wordlist.forEach(word => targetSet.add(`${word}.${domain}`));

    passiveResults.forEach(sub => {
        const prefix = sub.replace(`.${domain}`, '').trim(); 
        if(prefix && prefix !== domain) {
            ['dev', 'api', 'test', 'staging', 'v1', 'v2', 'admin', 'console', 'dash', 's3', 'manage'].forEach(mod => {
                targetSet.add(`${prefix}-${mod}.${domain}`);
                targetSet.add(`${mod}-${prefix}.${domain}`);
                targetSet.add(`${prefix}${mod}.${domain}`); 
                targetSet.add(`${mod}${prefix}.${domain}`); 
                targetSet.add(`${mod}.${prefix}.${domain}`);
            });
        }
    });

    const results = Array.from(targetSet);
    console.log(`[ACTIVE-RECON] Strateji: OSINT + ${wordlist.length} Kelimelik Wordlist = Toplam ${results.length} Mermi!`);
    return results;
}

async function runActiveRecon(domain, passiveResults, onProgress) {
    console.log(`\n[ACTIVE-RECON] --- MASSIVE BRUTE-FORCE MOTORU ATEŞLENDİ ---`);
    const targets = generateTargets(domain, passiveResults);
    onProgress({ status: 'info', message: `[ACTIVE] Toplam ${targets.length} potansiyel hedef taranıyor.` });

    const aliveHosts = [];
    const concurrencyLimit = 100; // 🔥 KENDİMİZİ BANLATMAMAK İÇİN 100'E DÜŞÜRDÜK 🔥
    let processed = 0;
    
    // 🔥 DEBUG İÇİN KAPSAMLI HATA RADARI 🔥
    const errorStats = { ENOTFOUND: 0, ETIMEOUT: 0, REFUSED: 0, OTHER: 0 };

    for (let i = 0; i < targets.length; i += concurrencyLimit) {
        const chunk = targets.slice(i, i + concurrencyLimit);
        
        const promises = chunk.map(async (target) => {
            const randomIp = BACKUP_RESOLVERS[Math.floor(Math.random() * BACKUP_RESOLVERS.length)];
            const resolver = new Resolver();
            resolver.setServers([randomIp]);

            try {
                // Sadece IPv4 çöz. timeout ve retries ayarlarını Node.js default bırakıyoruz
                const addresses = await resolver.resolve4(target);
                if (addresses && addresses.length > 0) {
                    if (!aliveHosts.find(h => h.subdomain === target)) {
                        console.log(`[VURGUN] ${target} -> ${addresses[0]} (DNS: ${randomIp})`);
                        aliveHosts.push({ subdomain: target, ips: addresses, resolver: randomIp });
                        onProgress({ status: 'found', data: { subdomain: target, ips: addresses } });
                    }
                }
            } catch (error) {
                // 🔥 İŞTE BURASI: HATALARI SESSİZCE YUTMUYORUZ, SAYIYORUZ! 🔥
                if (error.code === 'ENOTFOUND') {
                    errorStats.ENOTFOUND++; // Bu normal, subdomain gerçekten yok demek
                } else if (error.code === 'ETIMEOUT') {
                    errorStats.ETIMEOUT++; // DNS sunucusu cevap vermiyor (Rate limit / Ban yemişiz)
                } else if (error.code === 'ECONNREFUSED' || error.code === 'EREFUSED') {
                    errorStats.REFUSED++; // DNS sunucusu sorguyu reddetti
                } else {
                    errorStats.OTHER++;
                }
            } finally {
                processed++;
            }
        });

        await Promise.all(promises);
        
        // Saniyede bir ekrana log kusmasın, 5000 adımda bir rapor versin
        if (processed % 5000 === 0 || processed === targets.length) {
            const percent = Math.floor((processed / targets.length) * 100);
            console.log(`[DEBUG-RADAR] ${processed}/${targets.length} Mermi | Yok: ${errorStats.ENOTFOUND}, Ban/Timeout: ${errorStats.ETIMEOUT}, Red: ${errorStats.REFUSED}`);
            onProgress({ status: 'progress', percent, message: `[ACTIVE] DNS Çözümlemesi: ${processed} / ${targets.length}` });
        }
    }

    console.log(`\n[ACTIVE-RECON] --- MOTOR DURDU ---`);
    console.log(`🔥 [HATA RAPORU SÖZLEŞMESİ] 🔥`);
    console.log(`Geçerli Olmayan Hedef (ENOTFOUND): ${errorStats.ENOTFOUND}`);
    console.log(`Ban/Zaman Aşımı (ETIMEOUT): ${errorStats.ETIMEOUT}`);
    console.log(`Reddedilen Bağlantı (REFUSED): ${errorStats.REFUSED}`);
    console.log(`Bilinmeyen Hata: ${errorStats.OTHER}`);
    console.log(`Total ${aliveHosts.length} YENİ hedef vuruldu.\n`);
    
    onProgress({ status: 'completed', message: '[ACTIVE] Recon tamamlandı.', totalAlive: aliveHosts.length });
    return aliveHosts;
}

module.exports = { runActiveRecon };