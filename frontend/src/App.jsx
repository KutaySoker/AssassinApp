import React, { useState } from 'react';
import TitleBar from './components/TitleBar';
import ScanPage from './pages/ScanPage';
import ScanReport from './components/ScanReport';
import './index.css';
import Sidebar from './components/SideBar';
import UpdatePage from './pages/UpdatePage';

function App() {
  const [activeTab, setActiveTab] = useState('scan'); // Varsayılan sayfa

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-gray-100 font-sans">
      {/* Özel Başlık Çubuğumuz */}
      <TitleBar />

      {/* Sol Menü */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Ana İçerik Alanı: 
        pl-20 -> Sidebar'ın genişliği kadar soldan ittirir (Ezilmesin diye)
        pt-10 -> TitleBar'ın yüksekliği kadar üstten ittirir (Başlığın altında kalmasın diye)
      */}
      <main className="flex-1 pl-20 pt-10 h-screen overflow-y-auto custom-scrollbar">
        {activeTab === 'scan' && (
          <>
            <ScanPage />
            {/* Not: ScanReport normalde ScanPage içinden veri alır. Eğer boşsa ekranda görünmez. */}
            <ScanReport data={null} onReset={() => {}} /> 
          </>
        )}
        
        {/* İŞTE KRİTİK DÜZELTME: 'updates' değil, 'update' olacak! */}
        {activeTab === 'update' && <UpdatePage />}
      </main>
    </div>
  );
}

export default App;