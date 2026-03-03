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
    setStatusText("Bağlantı kuruluyor...");

    // 1. CANLI YAYINA BAĞLAN (SSE)
    const eventSource = new EventSource('http://localhost:3000/api/scan/stream');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setProgress(data.percent);
      setStatusText(data.message);
    };

    try {
      // 2. TARAMAYI ATEŞLE (GET isteği)
      const startRes = await fetch('http://localhost:3000/api/scan/start', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!startRes.ok) throw new Error("Sunucu taramayı başlatamadı.");

      const startJson = await startRes.json();
      const scanId = startJson.data?.scanId;

      if (!scanId) throw new Error("Geçerli bir Scan ID alınamadı.");

      // 3. DETAYLARI ÇEK
      const detailsRes = await fetch(`http://localhost:3000/api/scan/${scanId}`);
      const detailsJson = await detailsRes.json();

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

      // 4. RAPORU HAZIRLA (foundVulns direkt tablonun satır sayısına eşit!)
      setReportData({
        date: scanInfo.startedAt ? new Date(scanInfo.startedAt).toLocaleDateString('tr-TR') : new Date().toLocaleDateString('tr-TR'),
        scannedApps: apps.length,
        foundVulns: allVulns.length,
        vulnerabilities: allVulns
      });

      eventSource.close(); // Radyoyu kapat

      setTimeout(() => {
        setScanState('completed');
      }, 1000);

    } catch (err) {
      console.error("Tarama Hatası:", err);
      eventSource.close();
      setStatusText(`HATA DETAYI: ${err.message}`);
      setTimeout(() => {
        setScanState('idle');
        setProgress(0);
      }, 6000);
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