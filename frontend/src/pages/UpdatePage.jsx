import React, { useState, useEffect } from 'react';

const UpdatePage = () => {
  const [outdatedApps, setOutdatedApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [logText, setLogText] = useState("Güncellemeler kontrol ediliyor...");

  // Sayfa açıldığında güncellemeleri çek
  const fetchUpdates = async () => {
    setLoading(true);
    setLogText("Winget veritabanı taranıyor...");
    try {
      const res = await fetch('http://localhost:3000/api/scan/updates/check');
      const json = await res.json();
      if (json.success) {
        setOutdatedApps(json.data);
      }
    } catch (error) {
      console.error("Fetch hatası:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  // Güncelleme İşlemini Başlat (Tekli veya Çoklu)
  const handleUpdate = async (id = null) => {
    setUpdating(true);
    setLogText(id ? `ID: ${id} güncelleniyor...` : "Tüm sistem güncelleniyor...");

    // Canlı Yayın (SSE) Bağlantısını Aç
    const eventSource = new EventSource('http://localhost:3000/api/scan/updates/stream');
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.text) setLogText(data.text); // Winget'in terminal çıktılarını ekrana bas
    };

    // İsteği Ateşle
    await fetch('http://localhost:3000/api/scan/updates/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });

    // İşlemin bitmesi için tahmini süre bekle veya canlı yayından bir "bitti" sinyali gelene kadar açık tut
    // Basitlik adına 15 saniye sonra veya eventSource kapanınca listeyi yeniliyoruz
    setTimeout(() => {
      eventSource.close();
      setUpdating(false);
      fetchUpdates(); // Listeyi tekrar çek, güncellenenler kaybolsun
    }, 15000); 
  };

  if (loading || updating) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-8 animate-in fade-in duration-1000">
        <div className="relative flex items-center justify-center w-64 h-64">
          <div className="absolute w-full h-full border-4 border-cyan-500/20 rounded-full animate-ping"></div>
          <div className="absolute w-56 h-56 border-t-4 border-cyan-400 rounded-full animate-spin"></div>
          <div className="text-cyan-400 font-black text-2xl tracking-widest text-center">
            {updating ? 'UPDATING' : 'CHECKING'}
          </div>
        </div>
        <div className="text-zinc-500 font-mono text-sm tracking-widest max-w-lg text-center h-10 overflow-hidden">
          {logText}
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 w-full max-w-6xl mx-auto animate-in fade-in zoom-in duration-500">
      
      {/* Üst Başlık ve Toplu Güncelleme Butonu */}
      <div className="flex justify-between items-center mb-10 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-widest uppercase mb-2">Yazılım Güncelleyici</h1>
          <p className="text-zinc-500 font-mono text-sm">Daha sorunsuz ve güvenli bir sistem için uygulamalarınızı güncel tutun.</p>
        </div>
        
        {outdatedApps.length > 0 && (
          <button 
            onClick={() => handleUpdate()}
            className="px-6 py-3 bg-cyan-900/20 hover:bg-cyan-900/50 text-cyan-400 border border-cyan-500/50 rounded-lg font-bold tracking-wider transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            TÜMÜNÜ GÜNCELLE ({outdatedApps.length})
          </button>
        )}
      </div>

      {/* Liste Alanı */}
      {outdatedApps.length === 0 ? (
        <div className="bg-zinc-900/50 border border-green-500/30 rounded-xl p-16 text-center shadow-[0_0_30px_rgba(34,197,94,0.1)]">
          <svg className="w-20 h-20 text-green-500 mx-auto mb-6 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-black text-green-400 tracking-widest uppercase">SİSTEM KUSURSUZ</h2>
          <p className="text-zinc-400 mt-2 font-mono">Bütün uygulamalarınız güncel.</p>
        </div>
      ) : (
        <div className="bg-black border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-900/80">
              <tr>
                <th className="p-5 text-zinc-500 font-bold tracking-wider text-xs uppercase border-b border-zinc-800">Uygulama Adı</th>
                <th className="p-5 text-zinc-500 font-bold tracking-wider text-xs uppercase border-b border-zinc-800 text-center">Mevcut Sürüm</th>
                <th className="p-5 text-zinc-500 font-bold tracking-wider text-xs uppercase border-b border-zinc-800 text-center">Yeni Sürüm</th>
                <th className="p-5 text-zinc-500 font-bold tracking-wider text-xs uppercase border-b border-zinc-800 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {outdatedApps.map((app, idx) => (
                <tr key={idx} className="hover:bg-zinc-900/50 transition-colors group">
                  <td className="p-5">
                    <div className="flex items-center gap-4">
                      {/* Sahte İkon Kutusu */}
                      <div className="w-10 h-10 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-cyan-400 font-bold font-mono group-hover:border-cyan-500/50 transition-colors">
                        {app.name.charAt(0)}
                      </div>
                      <span className="text-zinc-200 font-medium">{app.name}</span>
                    </div>
                  </td>
                  <td className="p-5 text-zinc-500 font-mono text-center">{app.currentVersion}</td>
                  <td className="p-5 text-green-400 font-mono text-center font-bold">{app.availableVersion}</td>
                  <td className="p-5 text-right">
                    <button 
                      onClick={() => handleUpdate(app.id)}
                      className="px-4 py-2 bg-zinc-800 hover:bg-cyan-900/40 text-cyan-400 border border-zinc-700 hover:border-cyan-500/50 rounded font-bold tracking-wider transition-all duration-300 text-xs"
                    >
                      GÜNCELLE
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UpdatePage;