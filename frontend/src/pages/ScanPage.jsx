import React, { useState } from 'react';
import ScanProgress from '../components/ScanProgress';
import ScanReport from '../components/ScanReport';

const ScanPage = () => {
  const [scanState, setScanState] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Sistem hazırlanıyor...');
  const [reportData, setReportData] = useState(null);

  const handleStartScan = async () => {
    setScanState('scanning');
    setProgress(0);
    setStatusText("Arka planda motorlar ateşleniyor...");

    const eventSource = new EventSource('http://localhost:3000/api/scan/stream');

    // 🔥 RADYO DİNLEYİCİSİ (Taramanın bitişini artık buradan anlıyoruz) 🔥
    eventSource.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      setProgress(data.percent);
      setStatusText(data.message);

      // EĞER BACKEND "BEN BİTTİM, AL BU DA ID" DERSE, RAPORU ÇEKMEYE GİDİYORUZ!
      if (data.isComplete && data.scanId) {
          eventSource.close(); // Taramayla işimiz bitti, radyoyu kapat
          
          try {
              const agentId = localStorage.getItem('assassin_agent_id') || 'GHOST-AGENT';
              const detailsRes = await fetch(`http://localhost:3000/api/scan/${data.scanId}`, {
                  headers: { 'X-Assassin-ID': agentId }
              });
              
              const detailsText = await detailsRes.text();
              const detailsJson = JSON.parse(detailsText);

              const scanInfo = detailsJson.data || {};
              const apps = scanInfo.apps || [];
              const allVulns = [];

              apps.forEach(app => {
                const vulns = app.vulnerabilities || [];
                vulns.forEach(v => {
                  allVulns.push({
                    app: app.name || 'Bilinmeyen App',
                    version: app.version || 'Bilinmiyor',
                    cve: v.cveId || 'Bilinmiyor',
                    score: v.score || 'N/A',
                    risk: v.severity || 'INFO'
                  });
                });
              });

              setReportData({
                date: new Date().toLocaleDateString('tr-TR'),
                scannedApps: apps.length,
                foundVulns: allVulns.length,
                vulnerabilities: allVulns
              });

              setTimeout(() => setScanState('completed'), 1000);
          } catch (err) {
              setStatusText(`Rapor Çekilemedi: ${err.message}`);
              setTimeout(() => { setScanState('idle'); setProgress(0); }, 5000);
          }
      }
    };

    try {
      const agentId = localStorage.getItem('assassin_agent_id') || 'GHOST-AGENT';
      
      // SADECE "BAŞLA" EMRİNİ VERİP ÇIKIYORUZ (AWAIT İLE BEKLEMEK YOK)
      await fetch('http://localhost:3000/api/scan/start', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'X-Assassin-ID': agentId }
      });
      // Buradan sonrası tamamen yukarıdaki eventSource.onmessage bloğuna emanet.

    } catch (err) {
      console.error("Başlatma Hatası:", err);
      eventSource.close();
      setStatusText(`Sunucuya ulaşılamadı: ${err.message}`);
      setTimeout(() => { setScanState('idle'); setProgress(0); }, 5000);
    }
  };

  return (
    <div className="w-full h-full min-h-[80vh] flex flex-col items-center justify-center p-8 text-gray-300 font-mono relative">
      {scanState === 'idle' && (
        <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500 w-full">
          <h1 className="text-5xl font-black mb-2 tracking-[0.2em] text-white uppercase drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            ASSASSINAPP
          </h1>
          <p className="text-zinc-600 mb-16 tracking-[0.4em] text-[10px] uppercase font-bold">
            Vulnerability Scanner v1.0.2
          </p>
          <button
            onClick={handleStartScan}
            className="flex items-center justify-center w-64 h-64 rounded-full border-2 border-cyan-500/30 bg-black text-cyan-400 text-3xl font-black tracking-widest uppercase transition-all duration-300 hover:border-cyan-500 hover:shadow-[0_0_50px_rgba(6,182,212,0.3)] hover:scale-105"
          >
            SCAN
          </button>
        </div>
      )}

      {scanState === 'scanning' && (
        <div className="w-full flex justify-center items-center">
          <ScanProgress progress={progress} statusText={statusText} />
        </div>
      )}

      {scanState === 'completed' && reportData && (
        <div className="w-full h-full overflow-y-auto">
          <ScanReport
            data={reportData}
            onReset={() => { setScanState('idle'); setReportData(null); setProgress(0); }}
          />
        </div>
      )}
    </div>
  );
};

export default ScanPage;