import React, { useState, useEffect } from 'react';
import TitleBar from './components/TitleBar';
import ScanPage from './pages/ScanPage';
import ScanReport from './components/ScanReport';
import './index.css';
import Sidebar from './components/SideBar';
import UpdatePage from './pages/UpdatePage';
import HistoryPage from './components/HistoryPage';


function App() {
  const [activeTab, setActiveTab] = useState('scan'); // Varsayılan sayfa
  const [agentId, setAgentId] = useState(null); // YENİ: Ajan Kimliği State'i

  // --- YENİ EKLENEN: UYGULAMA AÇILINCA KİMLİĞİ ÇEK ---
  useEffect(() => {
    const fetchIdentity = async () => {
      // Electron ortamında mıyız ve köprü çalışıyor mu kontrol et
      if (window.electronAPI && window.electronAPI.getMachineId) {
        try {
          const id = await window.electronAPI.getMachineId();
          setAgentId(id);
          
          // API İsteklerinde (HistoryPage vs.) kullanılmak üzere localStorage'a aynala
          localStorage.setItem('assassin_agent_id', id); 
          
          console.log("🛡️ [REACT] İşletim Sisteminden Gelen Kripto Kimlik:", id);
        } catch (error) {
          console.error("Kimlik alınırken hata:", error);
        }
      } else {
        console.warn("⚠️ Electron API bulunamadı! Tarayıcıda çalışıyor olabilirsin.");
      }
    };

    fetchIdentity();
  }, []);

  return (
    // 'relative' class'ı eklendi ki AJAN ID yazısını sağ üste sabitleyebilelim
    <div className="flex min-h-screen bg-[#0a0a0a] text-gray-100 font-sans relative">
      {/* Özel Başlık Çubuğumuz */}
      <TitleBar />

      {/* --- YENİ EKLENEN: AJAN KİMLİĞİ GÖSTERGESİ --- */}
      {agentId && (
        <div className="absolute top-12 right-6 z-50 text-[10px] font-mono text-zinc-600 border border-zinc-800/50 bg-black/50 px-2 py-1 rounded select-none pointer-events-none flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.8)]"></div>
          AJAN ID: {agentId.substring(0, 8)}...
        </div>
      )}

      {/* Sol Menü */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* TÜM SAYFALAR BURANIN İÇİNDE OLACAK! 
        pl-24: Sidebar'ın alanından kaçmak için sol boşluk eklendi 
      */}
      <main className="flex-1 pl-24 pt-10 h-screen overflow-y-auto custom-scrollbar">
        
        {/* TARAMA SEKME İÇERİĞİ */}
        {activeTab === 'scan' && (
          <>
            <ScanPage />
            <ScanReport data={null} onReset={() => {}} /> 
          </>
        )}
        
        {/* GÜNCELLEME SEKME İÇERİĞİ */}
        {activeTab === 'update' && <UpdatePage />}

        {/* GEÇMİŞ (KARA KUTU) SEKME İÇERİĞİ - Artık sadece tıklandığında açılacak */}
        {activeTab === 'history' && <HistoryPage />}

      </main>
    </div>
  );
}

export default App;