import React, { useState, useEffect } from 'react';
import ScanProgress from '../components/ScanProgress';
import ScanReport from '../components/ScanReport';

const ScanPage = () => {
  const [scanState, setScanState] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Sistem hazırlanıyor...');
  const [reportData, setReportData] = useState(null);

  // Yapay ilerleme (Sadece backend cevap verene kadar 90'da bekletir)
  useEffect(() => {
    let interval;
    if (scanState === 'scanning' && progress < 90) {
      interval = setInterval(() => {
        setProgress((prev) => (prev >= 90 ? 90 : prev + 1));
      }, 500);
    }
    return () => clearInterval(interval);
  }, [scanState, progress]);

  const handleStartScan = async () => {
    console.log("🟢 1. TARAMA BUTONUNA BASILDI, SİSTEM ATEŞLENİYOR...");
    setScanState('scanning');
    setProgress(5);
    setStatusText("API'ye istek atılıyor...");

    try {
      console.log("🟢 2. POST /api/scan/start İSTEĞİ ATILIYOR...");
      const startRes = await fetch('http://localhost:3000/api/scan/start', { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      console.log("🟢 3. START İSTEĞİNDEN CEVAP GELDİ. HTTP STATUS:", startRes.status);
      if (!startRes.ok) throw new Error(`HTTP Hatası: Sunucu ${startRes.status} döndürdü.`);

      const startJson = await startRes.json();
      
      if (!startJson || !startJson.success) {
        throw new Error(startJson?.error || "Backend 'start' işlemi için success=false döndürdü.");
      }

      const scanId = startJson.data?.scanId;
      if (!scanId) throw new Error("Backend 'scanId' göndermedi! Gelen veri hatalı.");

      setStatusText("Tarama bitti, detaylar veritabanından çekiliyor...");
      console.log(`🟢 4. GET /api/scan/${scanId} İSTEĞİ ATILIYOR...`);

      const detailsRes = await fetch(`http://localhost:3000/api/scan/${scanId}`);
      if (!detailsRes.ok) throw new Error(`HTTP Hatası (Details): Sunucu ${detailsRes.status} döndürdü.`);

      const detailsJson = await detailsRes.json();
      if (!detailsJson || !detailsJson.success) {
        throw new Error(detailsJson?.error || "Backend 'details' işlemi için success=false döndürdü.");
      }

      console.log("🟢 5. JSON VERİSİ TABLO İÇİN PARÇALANIYOR...");
      
      let finalReport;
      try {
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

        // NİHAİ DÜZELTME: foundVulns artık direkt tablodaki (allVulns) satır sayısını alıyor.
        finalReport = {
          date: scanInfo.startedAt ? new Date(scanInfo.startedAt).toLocaleDateString('tr-TR') : new Date().toLocaleDateString('tr-TR'),
          scannedApps: apps.length,
          foundVulns: allVulns.length, 
          vulnerabilities: allVulns
        };
      } catch (parseErr) {
        throw new Error("Backend'den gelen veri formata uymuyor: " + parseErr.message);
      }

      setReportData(finalReport);
      setProgress(100);
      setStatusText("Analiz tamamlandı, ekrana geçiliyor...");

      setTimeout(() => {
        setScanState('completed');
      }, 1000);

    } catch (err) {
      console.error("🔴 KRİTİK İŞLEM HATASI:", err);
      setStatusText(`HATA DETAYI: ${err.message}`);
      setTimeout(() => {
        setScanState('idle');
        setProgress(0);
      }, 10000); 
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-300 font-mono p-8 flex flex-col items-center justify-center">
      
      {scanState === 'idle' && (
        <div className="flex flex-col items-center animate-in fade-in duration-500">
           <h1 className="text-5xl font-black mb-2 tracking-[0.2em] text-white uppercase drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            ASSASSINAPP
          </h1>
          <p className="text-zinc-600 mb-16 tracking-[0.4em] text-[10px] uppercase font-bold">
            Vulnerability Scanner v1.0.2
          </p>
          <button 
            onClick={handleStartScan} 
            className="w-64 h-64 rounded-full border-2 border-cyan-500/30 bg-black text-cyan-400 text-3xl font-black tracking-widest uppercase transition-all duration-300 hover:border-cyan-500 hover:shadow-[0_0_50px_rgba(6,182,212,0.3)]"
          >
            SCAN
          </button>
        </div>
      )}

      {scanState === 'scanning' && (
        <ScanProgress progress={progress} statusText={statusText} />
      )}

      {scanState === 'completed' && reportData && (
        <ScanReport 
          data={reportData} 
          onReset={() => { setScanState('idle'); setReportData(null); setProgress(0); }} 
        />
      )}
      
    </div>
  );
};

export default ScanPage;