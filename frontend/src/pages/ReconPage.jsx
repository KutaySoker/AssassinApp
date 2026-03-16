import React, { useState } from 'react';

const ReconPage = () => {
  const [targetDomain, setTargetDomain] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!targetDomain) return;

    const cleanDomain = targetDomain.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];

    setIsScanning(true);
    setResults(null);
    setError(null);

    try {
      const res = await fetch('http://localhost:3000/api/scan/recon/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: cleanDomain })
      });

      const data = await res.json();

      if (data.success) {
        setResults(data);
      } else {
        setError(data.error || "Bilinmeyen bir hata oluştu.");
      }
    } catch (err) {
      setError("Sunucuya bağlanılamadı. Backend ayakta mı?");
    }

    setIsScanning(false);
  };

  const copyToClipboard = () => {
    // Çökme Koruması: aliveHosts yoksa subdomains'i kopyala
    const listToCopy = results?.aliveHosts?.map(h => h.url) || results?.subdomains || [];
    if (listToCopy.length > 0) {
      navigator.clipboard.writeText(listToCopy.join('\n'));
      alert("Liste panoya kopyalandı!");
    } else {
      alert("Kopyalanacak veri bulunamadı.");
    }
  };

  const getStatusColor = (code) => {
    if (code >= 200 && code < 300) return 'text-green-400 bg-green-900/30 border-green-500/50';
    if (code >= 300 && code < 400) return 'text-blue-400 bg-blue-900/30 border-blue-500/50';
    if (code === 403 || code === 401) return 'text-amber-400 bg-amber-900/30 border-amber-500/50';
    return 'text-red-400 bg-red-900/30 border-red-500/50';
  };

  return (
    <div className="p-10 w-full max-w-6xl mx-auto animate-in fade-in zoom-in duration-500">
      
      <div className="flex justify-between items-center mb-10 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-widest uppercase mb-2">Hedef Keşfİ (Recon)</h1>
          <p className="text-zinc-500 font-mono text-sm">OSINT ile pasif veri toplama ve HTTPX mantığıyla canlılık (Liveness) doğrulama.</p>
        </div>
        <div className="bg-zinc-900/50 border border-cyan-900/50 px-4 py-2 rounded flex items-center gap-3 shadow-[0_0_10px_rgba(6,182,212,0.1)]">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
            <span className="text-cyan-400 font-mono text-xs tracking-widest uppercase">Derİn Tarama: Aktİf</span>
        </div>
      </div>

      <div className="bg-black border border-zinc-800 rounded-xl p-8 mb-10 shadow-lg relative overflow-hidden group hover:border-zinc-700 transition-colors">
        <form onSubmit={handleScan} className="relative z-10">
          <label className="block text-zinc-500 font-mono text-sm mb-3 tracking-widest">HEDEF DOMAİN</label>
          <div className="flex gap-4">
            <input 
              type="text" 
              value={targetDomain}
              onChange={(e) => setTargetDomain(e.target.value)}
              placeholder="örn: vulnweb.com"
              disabled={isScanning}
              className="flex-1 bg-zinc-900/50 border border-zinc-700 text-cyan-400 font-mono text-lg px-6 py-4 rounded-lg focus:outline-none focus:border-cyan-500 disabled:opacity-50 transition-all placeholder:text-zinc-700"
            />
            <button 
              type="submit"
              disabled={isScanning || !targetDomain}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-black tracking-widest uppercase px-10 py-4 rounded-lg disabled:opacity-50 disabled:hover:bg-cyan-500 transition-all flex items-center gap-3"
            >
              {isScanning ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  DOĞRULANIYOR...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                  CANLI HEDEFLERİ BUL
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {isScanning && (
        <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500 border border-zinc-800/50 rounded-xl bg-black/50">
          <div className="relative w-32 h-32 mb-8">
            <div className="absolute inset-0 border-2 border-cyan-500/20 rounded-full"></div>
            <div className="absolute inset-2 border-2 border-cyan-500/40 rounded-full border-t-cyan-400 animate-spin"></div>
            <div className="absolute inset-8 border-2 border-cyan-500/40 rounded-full border-b-cyan-400 animate-[spin_2s_linear_infinite_reverse]"></div>
          </div>
          <p className="text-cyan-400 font-mono tracking-widest animate-pulse">Aktif HTTPX Doğrulaması Yapılıyor...</p>
          <p className="text-zinc-500 font-mono text-xs mt-2">OSINT listesi temizlendi, hedefler asenkron yoklanıyor.</p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500/50 text-red-400 p-4 rounded-lg font-mono text-sm text-center">
          {error}
        </div>
      )}

      {results && !isScanning && (
        <div className="animate-in slide-in-from-bottom-10 fade-in duration-500">
          <div className="flex justify-between items-end mb-6 border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white uppercase tracking-widest"><span className="text-cyan-500">{results.target}</span> İÇİN CANLI HEDEFLER</h2>
              <div className="flex gap-4 mt-2">
                <p className="text-zinc-500 font-mono text-xs border border-zinc-800 bg-zinc-900/50 px-2 py-1 rounded">
                  OSINT ile Bulunan: <span className="text-zinc-300 font-bold">{results.totalFound}</span>
                </p>
                <p className="text-cyan-400 font-mono text-xs border border-cyan-900/50 bg-cyan-900/10 px-2 py-1 rounded shadow-[0_0_8px_rgba(6,182,212,0.2)]">
                  CANLI (Yanıt Veren): <span className="font-bold">{results.totalAlive || 0}</span>
                </p>
              </div>
            </div>
            {(results.totalAlive > 0 || results.subdomains?.length > 0) && (
              <button 
                onClick={copyToClipboard}
                className="text-zinc-400 hover:text-cyan-400 flex items-center gap-2 text-sm font-mono border border-zinc-800 hover:border-cyan-500/50 bg-black px-4 py-2 rounded transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                CANLI LİSTEYİ KOPYALA
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Çökme Koruması: results.aliveHosts varsa dön, yoksa boş array */}
            {(results.aliveHosts || []).map((host, idx) => (
              <div key={idx} className="bg-black border border-zinc-800 hover:border-cyan-500/30 p-5 rounded-lg flex flex-col gap-3 group transition-all">
                
                <div className="flex justify-between items-start">
                  <a href={host.url} target="_blank" rel="noreferrer" className="text-cyan-400 font-mono text-sm hover:underline hover:text-cyan-300 truncate pr-4">
                    {host.url}
                  </a>
                  <span className={`font-mono text-xs px-2 py-1 rounded border font-bold ${getStatusColor(host.status)}`}>
                    [{host.status}]
                  </span>
                </div>

                <div className="bg-zinc-900/30 border border-zinc-800/50 rounded p-3 mt-1">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <span className="text-zinc-600 font-mono text-[10px] tracking-widest uppercase min-w-[50px] mt-0.5">Title:</span>
                      <span className="text-zinc-300 font-mono text-xs line-clamp-1" title={host.title}>{host.title}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-zinc-600 font-mono text-[10px] tracking-widest uppercase min-w-[50px] mt-0.5">Server:</span>
                      <span className="text-zinc-400 font-mono text-xs">{host.server}</span>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>

          {/* Eğer backend eski koddaysa ve sadece subdomains dönüyorsa, onları terminal gibi listele */}
          {!results.aliveHosts && results.subdomains && (
             <div className="bg-[#0a0a0a] border border-zinc-800 p-6 rounded-xl font-mono text-sm text-cyan-500/80 h-96 overflow-y-auto custom-scrollbar">
               <div className="text-amber-500 mb-4 text-xs tracking-widest border-b border-amber-900/50 pb-2">UYARI: Backend aktif doğrulama (HTTPX) sürümünde değil. Sadece OSINT listesi gösteriliyor.</div>
               {results.subdomains.map((sub, idx) => (
                 <div key={idx} className="py-1 hover:text-cyan-300 hover:bg-zinc-900/50 px-2 rounded cursor-default transition-colors">
                   {sub}
                 </div>
               ))}
             </div>
          )}

          {results.totalFound > 0 && results.totalAlive === 0 && (
             <div className="text-center py-10 text-zinc-500 font-mono text-sm border border-zinc-800 border-dashed rounded-lg mt-4">
               Hedefte pasif kayıtlar bulundu ancak hiçbir sunucu HTTP/HTTPS isteğine yanıt vermedi.
             </div>
          )}
        </div>
      )}

    </div>
  );
};

export default ReconPage;