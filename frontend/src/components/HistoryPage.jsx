import React, { useState, useEffect } from 'react';

const HistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // YÜZEN EKRAN (MODAL) STATE'LERİ
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [cveData, setCveData] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/scan/operations/history');
      if (!res.ok) throw new Error("Ağ hatası");
      const data = await res.json();
      setHistory(data);
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
      await fetch('http://localhost:3000/api/scan/operations/history', { method: 'DELETE' });
      setHistory([]); 
    } catch (error) {
      console.error("Geçmiş silinemedi:", error);
    }
  };

  // KARTA TIKLANINCA PRISMA'DAN GERÇEK VERİYİ ÇEKEN KISIM
  const handleOpenDetails = async (record) => {
    // Sadece tarama loglarına tıklanabilsin
    if (record.status !== 'SCANNED') return; 

    setSelectedRecord(record);
    setDetailsLoading(true);
    setCveData([]); 

    try {
      // record.id artık veritabanındaki gerçek ID
      const res = await fetch(`http://localhost:3000/api/scan/${record.id}`);
      const rawData = await res.json();
      
      console.log("🔥 PRİSMA'DAN GELEN HAM VERİ:", rawData);

      let foundCves = [];

      // Prisma'nın döndüğü yapı: { success: true, data: { apps: [ { vulnerabilities: [...] } ] } }
      if (rawData.success && rawData.data && rawData.data.apps) {
        rawData.data.apps.forEach(app => {
          if (app.vulnerabilities && app.vulnerabilities.length > 0) {
            // Zafiyetin yanına hangi uygulamadan (örn: VLC, 7-Zip) geldiğini de ekliyoruz
            const vulnsWithAppName = app.vulnerabilities.map(v => ({
              ...v,
              appName: app.name 
            }));
            foundCves = [...foundCves, ...vulnsWithAppName];
          }
        });
      }
      
      setCveData(foundCves); 
    } catch (error) {
      console.error("Detaylar çekilemedi:", error);
    }
    setDetailsLoading(false);
  };

  const closeModal = () => {
    setSelectedRecord(null);
  };

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
      
      {/* Üst Başlık */}
      <div className="flex justify-between items-center mb-12 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-widest uppercase mb-2">Operasyon Geçmişi</h1>
          <p className="text-zinc-500 font-mono text-sm">Sistem üzerinde yapılan geçmiş tarama ve güncelleme kayıtları.</p>
        </div>
        
        {history.length > 0 && (
          <button 
            onClick={handleClear}
            className="px-4 py-2 bg-zinc-900/50 hover:bg-red-900/20 text-zinc-500 hover:text-red-400 border border-zinc-800 hover:border-red-500/50 rounded font-bold tracking-wider transition-all duration-300 text-xs flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            KAYITLARI TEMİZLE
          </button>
        )}
      </div>

      {/* Zaman Çizelgesi */}
      <div className="relative border-l border-zinc-800 ml-4 space-y-12 pb-10">
        {history.map((record, idx) => {
          const isClickable = record.status === 'SCANNED';

          return (
            <div key={idx} className="relative pl-10 group">
              <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-black ${
                record.status === 'UPDATED' ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]' : 
                record.status === 'CLEAN' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 
                'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]'
              }`}></div>

              <div 
                onClick={() => handleOpenDetails(record)}
                className={`bg-black border border-zinc-800/80 rounded-xl p-6 transition-all shadow-lg 
                  ${isClickable ? 'cursor-pointer hover:border-amber-500/50 hover:bg-zinc-900/40 hover:shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'group-hover:border-zinc-700'}`
                }
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-zinc-500 font-mono text-xs font-bold bg-zinc-900 px-2 py-1 rounded">
                        {record.id} 
                      </span>
                      <span className="text-zinc-400 font-mono text-sm">{record.date}</span>
                      
                      {isClickable && (
                        <span className="text-amber-500/50 font-mono text-[10px] tracking-widest border border-amber-500/20 px-2 py-0.5 rounded animate-pulse">
                          ZAFİYETLERİ GÖR
                        </span>
                      )}
                    </div>
                    <h3 className={`text-lg font-bold tracking-wide uppercase mt-2 ${
                      record.status === 'UPDATED' ? 'text-cyan-400' : record.status === 'CLEAN' ? 'text-green-400' : 'text-amber-400'
                    }`}>
                      {record.status === 'UPDATED' ? 'GÜNCELLEME TAMAMLANDI' : record.status === 'CLEAN' ? 'SİSTEM KUSURSUZDU' : 'TARAMA YAPILDI'}
                    </h3>
                    <p className="text-zinc-500 mt-1 text-sm">{record.message}</p>
                  </div>
                </div>

                {/* İşlem Gören Uygulamalar (Update verisi için) */}
                {record.apps && record.apps.length > 0 && (
                  <div className="mt-6 bg-zinc-900/50 rounded-lg p-4 border border-zinc-800/50">
                    <h4 className="text-zinc-600 font-bold text-xs uppercase tracking-widest mb-3 border-b border-zinc-800 pb-2">İŞLEM GÖRENLER</h4>
                    <ul className="space-y-2">
                      {record.apps.map((app, appIdx) => (
                        <li key={appIdx} className="flex justify-between items-center text-sm">
                          <span className="text-zinc-300 font-medium flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-700"></div>{app.name}
                          </span>
                          <div className="font-mono flex items-center gap-2 text-xs">
                            {(app.oldVer || app.currentVersion) && (
                              <><span className="text-zinc-500">{app.oldVer || app.currentVersion}</span><span className="text-zinc-600">→</span></>
                            )}
                            <span className="text-cyan-500">{app.newVer || app.availableVersion}</span>
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

        {history.length === 0 && <div className="pl-10 text-zinc-500 font-mono text-sm italic">Henüz kaydedilmiş bir operasyon bulunmuyor.</div>}
      </div>

      {/* --- YÜZEN EKRAN (MODAL) --- */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-amber-500/50 rounded-xl shadow-[0_0_50px_rgba(245,158,11,0.15)] w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/30">
              <div>
                <h2 className="text-xl font-black text-amber-400 tracking-widest">ZAFİYET RAPORU DETAYI</h2>
                <p className="text-zinc-500 font-mono text-xs mt-1">REFERANS: {selectedRecord.id} | {selectedRecord.date}</p>
              </div>
              <button onClick={closeModal} className="text-zinc-500 hover:text-white bg-zinc-900 hover:bg-red-500/20 hover:border-red-500/50 border border-zinc-800 p-2 rounded transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {detailsLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-12 h-12 border-t-2 border-amber-400 border-r-2 border-transparent rounded-full animate-spin mb-4"></div>
                  <span className="text-amber-400/50 font-mono text-sm tracking-widest animate-pulse">VERİTABANINDAN ÇEKİLİYOR...</span>
                </div>
              ) : cveData.length > 0 ? (
                <div className="space-y-4">
                  {cveData.map((cve, idx) => (
                    <div key={idx} className="bg-black border border-red-500/20 p-4 rounded-lg hover:border-red-500/50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-red-400 font-bold font-mono">
                            {cve.cveId || cve.id || cve.name || `ZAFİYET SİNYALİ #${idx+1}`}
                          </span>
                          {/* HEDEF UYGULAMA (PRISMA'DAN ÇEKİLDİ) */}
                          {cve.appName && (
                            <span className="ml-3 text-zinc-500 text-xs font-mono">
                              Hedef: <span className="text-zinc-300">{cve.appName}</span>
                            </span>
                          )}
                        </div>
                        {cve.severity && <span className="bg-red-900/30 text-red-500 text-[10px] px-2 py-1 rounded uppercase tracking-wider font-bold border border-red-500/20">{cve.severity}</span>}
                      </div>
                      <p className="text-zinc-400 text-sm mt-2">{cve.description || "Açıklama bulunamadı."}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-zinc-500 font-mono">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  Bu taramaya ait kaydedilmiş detaylı zafiyet (CVE) kaydı bulunamadı.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default HistoryPage;