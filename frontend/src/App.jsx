import React, { useState } from 'react';
import TitleBar from './components/TitleBar';
import ScanPage from './pages/ScanPage';
import ScanReport from './components/ScanReport';
import './index.css';
import Sidebar from './components/SideBar';
import UpdatePage from './pages/UpdatePage';
import HistoryPage from './components/HistoryPage'; // HARF HATASI DÜZELTİLDİ

function App() {
  const [activeTab, setActiveTab] = useState('scan'); // Varsayılan sayfa

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-gray-100 font-sans">
      {/* Özel Başlık Çubuğumuz */}
      <TitleBar />

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