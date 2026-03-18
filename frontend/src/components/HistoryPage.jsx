import React, { useState, useEffect } from 'react';

const HistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('scans'); 
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [cveData, setCveData] = useState([]);
  const [subdomainData, setSubdomainData] = useState([]); 
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const agentId = localStorage.getItem('assassin_agent_id') || 'GHOST-AGENT';
      
      const res = await fetch('http://localhost:3000/api/scan/operations/history', {
        headers: { 'X-Assassin-ID': agentId }
      });
      
      if (!res.ok) throw new Error("Ağ hatası");
      const data = await res.json();
      setHistory(data.history || data || []);
    } catch (error) {
      console.error("Geçmiş çekilemedi:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleClear = async () => {
    try {
      const agentId = localStorage.getItem('assassin_agent_id') || 'GHOST-AGENT';
      await fetch('http://localhost:3000/api/scan/operations/history', { 
        method: 'DELETE',
        headers: { 'X-Assassin-ID': agentId } 
      });
      setHistory([]); 
    } catch (error) {
      console.error("Geçmiş silinemedi:", error);
    }
  };

  const handleOpenDetails = async (record) => {
    setSelectedRecord(record);
    setDetailsLoading(true);
    setCveData([]); 
    setSubdomainData([]);

    // SCAN (ZAFİYET) DETAYLARI İÇİN DB'YE SOR
    if (activeTab === 'scans') {
      try {
        const res = await fetch(`http://localhost:3000/api/scan/${record.id}`, {
          headers: { 'X-Assassin-ID': localStorage.getItem('assassin_agent_id') || 'GHOST-AGENT' }
        });
        const rawData = await res.json();
        let foundCves = [];

        if (rawData.success && rawData.data && rawData.data.apps) {
          rawData.data.apps.forEach(app => {
            if (app.vulnerabilities && app.vulnerabilities.length > 0) {
              const vulnsWithAppName = app.vulnerabilities.map(v => ({ ...v, appName: app.name }));
              foundCves = [...foundCves, ...vulnsWithAppName];
            }
          });
        }
        setCveData(foundCves); 
      } catch (error) {
        console.error("Zafiyet detayları çekilemedi:", error);
      }
    } 
    // RECON (KEŞİF) DETAYLARI İÇİN DB'DEN GELEN JSON'U KULLAN
    else if (activeTab === 'recon') {
      // Prisma bazen JSON objesini string olarak döndürebilir, bu yüzden parse kontrolü yapıyoruz
      let targets = [];
      if (typeof record.apps === 'string') {
          try { targets = JSON.parse(record.apps); } catch(e) {}
      } else {
          targets = record.apps || record.subdomains || [];
      }
      setSubdomainData(targets);
    }

    setDetailsLoading(false);
  };

  const closeModal = () => {
    setSelectedRecord(null);
  };

  // --- AKILLI SINIFLANDIRMA (SMART CATEGORIZATION) MOTORU ---
  // Backend statüyü veya ID'yi farklı atsa bile, kelimelerden doğru sekmeyi bulur
  const getCategory = (log) => {
    const id = log.id?.toUpperCase() || '';
    const status = log.status?.toUpperCase() || '';
    const msg = log.message?.toLowerCase() || '';

    if (id.startsWith('RECON') || msg.includes('istihbarat') || msg.includes('keşif') || status === 'RECON') return 'recon';
    if (id.startsWith('UP') || status === 'UPDATED' || status === 'CLEAN' || msg.includes('güncelleme') || msg.includes('versiyon')) return 'updates';
    return 'scans'; // Yukarıdakilere uymayan her şey (SCAN-123, COMPLETED vs.) zafiyet taramasıdır.
  };

  const reconLogs = history.filter(log => getCategory(log) === 'recon');
  const updateLogs = history.filter(log => getCategory(log) === 'updates');
  const scanLogs = history.filter(log => getCategory(log) === 'scans');

  const displayLogs = activeTab === 'scans' ? scanLogs : activeTab === 'recon' ? reconLogs : updateLogs;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full animate-in fade-in duration-1000 mt-20">
        <div className="text-cyan-400 font-mono tracking-widest animate-pulse border border-cyan-500/30 bg-cyan-900/10 px-6 py-3 rounded-lg">
          İSTİHBARAT RAPORLARI ÇEKİLİYOR...
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 w-full max-w-6xl mx-auto animate-in fade-in zoom-in duration-500 relative">
      <div className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-widest uppercase mb-2">Operasyon Geçmişi</h1>
          <p className="text-zinc-500 font-mono text-sm">Sistem üzerinde yapılan zafiyet, keşif ve versiyon tarama kayıtları.</p>
        </div>
        
        {history.length > 0 && (
          <button onClick={handleClear} className="px-4 py-2 bg-zinc-900/50 hover:bg-red-900/20 text-zinc-500 hover:text-red-400 border border-zinc-800 hover:border-red-500/50 rounded font-bold tracking-wider transition-all duration-300 text-xs flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            KAYITLARI TEMİZLE
          </button>
        )}
      </div>

      <div className="flex gap-4 mb-10">
        <button onClick={() => setActiveTab('scans')} className={`flex-1 py-3 px-4 rounded-lg font-mono text-sm tracking-widest uppercase transition-all border ${activeTab === 'scans' ? 'bg-amber-900/20 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'}`}>
          Zafiyet Taramaları ({scanLogs.length})
        </button>
        <button onClick={() => setActiveTab('recon')} className={`flex-1 py-3 px-4 rounded-lg font-mono text-sm tracking-widest uppercase transition-all border ${activeTab === 'recon' ? 'bg-purple-900/20 border-purple-500/50 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'}`}>
          Subdomain Keşifleri ({reconLogs.length})
        </button>
        <button onClick={() => setActiveTab('updates')} className={`flex-1 py-3 px-4 rounded-lg font-mono text-sm tracking-widest uppercase transition-all border ${activeTab === 'updates' ? 'bg-cyan-900/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'}`}>
          Versiyon Taramaları ({updateLogs.length})
        </button>
      </div>

      <div className="relative border-l border-zinc-800 ml-4 space-y-12 pb-10">
        {displayLogs.map((record, idx) => {
          // Update sekmesi hariç hepsi tıklanabilir yapıldı
          const isClickable = activeTab === 'scans' || activeTab === 'recon';
          
          // Json parse garantisi
          let appList = [];
          if (record.apps) {
              try { appList = typeof record.apps === 'string' ? JSON.parse(record.apps) : record.apps; } catch(e){}
          }

          return (
            <div key={idx} className="relative pl-10 group animate-in slide-in-from-left-4 fade-in duration-300">
              <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-black ${activeTab === 'recon' ? 'bg-purple-500' : activeTab === 'updates' ? 'bg-cyan-500' : 'bg-amber-500'}`}></div>

              <div onClick={() => isClickable ? handleOpenDetails(record) : null} className={`bg-black border border-zinc-800/80 rounded-xl p-6 transition-all shadow-lg ${isClickable ? 'cursor-pointer hover:border-amber-500/50 hover:bg-zinc-900/40' : 'group-hover:border-zinc-700'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-zinc-500 font-mono text-xs font-bold bg-zinc-900 px-2 py-1 rounded">{record.id || 'SİSTEM'}</span>
                      <span className="text-zinc-400 font-mono text-sm">{new Date(record.createdAt || Date.now()).toLocaleString('tr-TR')}</span>
                      
                      {isClickable && activeTab === 'scans' && <span className="text-amber-500/50 font-mono text-[10px] tracking-widest border border-amber-500/20 px-2 py-0.5 rounded animate-pulse">ZAFİYETLERİ GÖR</span>}
                      {isClickable && activeTab === 'recon' && <span className="text-purple-500/50 font-mono text-[10px] tracking-widest border border-purple-500/20 px-2 py-0.5 rounded animate-pulse">HEDEFLERİ GÖR</span>}
                    </div>
                    <h3 className={`text-lg font-bold tracking-wide uppercase mt-2 ${activeTab === 'recon' ? 'text-purple-400' : activeTab === 'updates' ? 'text-cyan-400' : 'text-amber-400'}`}>
                      {activeTab === 'recon' ? 'PASİF İSTİHBARAT (OSINT)' : activeTab === 'updates' ? 'GÜNCELLEME VE VERSİYON KONTROLÜ' : 'SİSTEM ZAFİYET TARAMASI'}
                    </h3>
                    <p className="text-zinc-500 mt-1 text-sm">{record.message}</p>
                  </div>
                </div>

                {/* UPDATE EKRANINDAKİ VERSİYON DEĞİŞİKLİKLERİ LİSTESİ */}
                {activeTab === 'updates' && appList && appList.length > 0 && (
                  <div className="mt-6 bg-zinc-900/50 rounded-lg p-4 border border-zinc-800/50">
                    <h4 className="text-zinc-600 font-bold text-xs uppercase tracking-widest mb-3 border-b border-zinc-800 pb-2">KONTROL EDİLEN UYGULAMALAR</h4>
                    <ul className="space-y-2">
                      {appList.map((app, appIdx) => (
                        <li key={appIdx} className="flex justify-between items-center text-sm">
                          <span className="text-zinc-300 font-medium flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-700"></div>{app.name || 'Bilinmeyen Uygulama'}</span>
                          <div className="font-mono flex items-center gap-2 text-xs">
                            {(app.oldVer || app.currentVersion) && <><span className="text-zinc-500">{app.oldVer || app.currentVersion}</span><span className="text-zinc-600">→</span></>}
                            <span className="text-cyan-500">{app.newVer || app.availableVersion || 'Güncel'}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {displayLogs.length === 0 && <div className="pl-10 text-zinc-500 font-mono text-sm italic">Bu kategoride henüz kaydedilmiş bir operasyon bulunmuyor.</div>}
      </div>

      {/* MODAL (DETAY PENCERESİ) */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`bg-[#0a0a0a] border rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 ${activeTab === 'recon' ? 'border-purple-500/50' : 'border-amber-500/50'}`}>
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/30">
              <div>
                <h2 className={`text-xl font-black tracking-widest ${activeTab === 'recon' ? 'text-purple-400' : 'text-amber-400'}`}>{activeTab === 'recon' ? 'KEŞFEDİLEN HEDEFLER RAPORU' : 'ZAFİYET RAPORU DETAYI'}</h2>
                <p className="text-zinc-500 font-mono text-xs mt-1">REFERANS: {selectedRecord.id}</p>
              </div>
              <button onClick={closeModal} className="text-zinc-500 hover:text-white bg-zinc-900 border border-zinc-800 p-2 rounded transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {detailsLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className={`w-12 h-12 border-t-2 border-r-2 border-transparent rounded-full animate-spin mb-4 ${activeTab === 'recon' ? 'border-t-purple-400' : 'border-t-amber-400'}`}></div>
                </div>
              ) : activeTab === 'scans' ? (
                 // ZAFİYET EKRANI KONTROLÜ
                 cveData.length > 0 ? (
                  <div className="space-y-4">
                    {cveData.map((cve, idx) => (
                      <div key={idx} className="bg-black border border-red-500/20 p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div><span className="text-red-400 font-bold font-mono">{cve.cveId || cve.name}</span><span className="ml-3 text-zinc-500 text-xs font-mono">Hedef: <span className="text-zinc-300">{cve.appName}</span></span></div>
                          {cve.severity && <span className="bg-red-900/30 text-red-500 text-[10px] px-2 py-1 rounded">{cve.severity}</span>}
                        </div>
                        <p className="text-zinc-400 text-sm mt-2">{cve.description}</p>
                      </div>
                    ))}
                  </div>
                 ) : (
                  <div className="text-center py-20">
                      <div className="inline-block bg-green-900/20 border border-green-500/50 text-green-400 font-mono px-6 py-4 rounded-lg">
                          🎉 Sistem temiz! Kayıtlı bir zafiyet bulunamadı.
                      </div>
                  </div>
                 )
              ) : activeTab === 'recon' && subdomainData.length > 0 ? (
                // RECON EKRANI
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subdomainData.map((host, idx) => (
                    <div key={idx} className="bg-black border border-purple-500/20 p-4 rounded-lg flex flex-col gap-2">
                      <span className="text-purple-400 font-mono text-sm font-bold truncate pr-4">{host.name || host.url}</span>
                      <div className="text-zinc-400 text-xs font-mono"><span className="text-zinc-600 mr-2">BİLGİ:</span><span className="text-zinc-300">{host.version || host.status}</span></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-zinc-500 font-mono">Gösterilecek detay bulunamadı.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;