import React, { useState } from 'react';

const ScanPage = () => {
  const [scanState, setScanState] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Sistem hazırlanıyor...');
  const [reportData, setReportData] = useState(null);

  const handleStartScan = () => {
    setScanState('scanning');
    setProgress(0);

    const steps = [
      "Sistemdeki uygulamalar taranıyor...",
      "Uygulama sürümleri analiz ediliyor...",
      "NVD veritabanı ile bağlantı kuruluyor...",
      "CVE eşleştirmeleri yapılıyor...",
      "Rapor oluşturuluyor..."
    ];

    let currentProgress = 0;
    let stepIndex = 0;

    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 5) + 2;
      
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        
        setTimeout(() => {
          setReportData({
            date: new Date().toLocaleDateString('tr-TR'),
            scannedApps: 78,
            foundVulns: 6,
            vulnerabilities: [
              { app: "Dell SupportAssist", version: "5.5.15.1", cve: "CVE-2025-46684", score: 6.6, risk: "MEDIUM" },
              { app: "Dell SupportAssist", version: "5.5.15.1", cve: "CVE-2025-46685", score: 7.5, risk: "HIGH" },
              { app: "Steam", version: "2.10.91.91", cve: "CVE-2015-7985", score: 0, risk: "UNKNOWN" },
              { app: "Steam", version: "2.10.91.91", cve: "CVE-2020-15530", score: 7.8, risk: "HIGH" },
              { app: "Alienware Command", version: "6.10.15.0", cve: "CVE-2025-46368", score: 6.6, risk: "MEDIUM" },
              { app: "Alienware Command", version: "6.10.15.0", cve: "CVE-2025-46369", score: 7.8, risk: "HIGH" },
            ]
          });
          setScanState('completed');
        }, 1000);
      }

      setProgress(currentProgress);
      
      if (currentProgress > (stepIndex + 1) * 20 && stepIndex < steps.length - 1) {
        stepIndex++;
        setStatusText(steps[stepIndex]);
      }

    }, 300);
  };

  // Tam Kusursuz Çember Hesaplaması
  const radius = 100;
  const circumference = 2 * Math.PI * radius; // Yaklaşık 628.32
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="min-h-screen bg-black text-gray-300 font-mono p-8 flex flex-col items-center justify-center">
      
      {/* ---------------- BAŞLANGIÇ & YÜKLEME EKRANI ---------------- */}
      {scanState !== 'completed' && (
        <div className="flex flex-col items-center justify-center flex-1 w-full text-center">
          <h1 className="text-4xl font-bold mb-2 tracking-widest text-white uppercase">Sistem Tarayıcı</h1>
          <p className="text-gray-500 mb-12">Zafiyet tespit protokolü hazır.</p>

          <div className="relative flex items-center justify-center w-72 h-72">
            {scanState === 'idle' ? (
              // Idle Durumu: Tam Ortalanmış Buton
              <button 
                onClick={handleStartScan}
                className="w-56 h-56 rounded-full border-2 border-cyan-500 text-cyan-400 text-2xl font-bold tracking-widest uppercase transition-all duration-300 hover:bg-cyan-900/20 hover:shadow-[0_0_40px_rgba(6,182,212,0.6)] focus:outline-none flex items-center justify-center"
              >
                Scan
              </button>
            ) : (
              // Scanning Durumu: Kusursuz SVG Çember
              <div className="relative flex flex-col items-center justify-center w-full h-full">
                <svg viewBox="0 0 256 256" className="w-full h-full transform -rotate-90">
                  <circle cx="128" cy="128" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-800" />
                  <circle 
                    cx="128" cy="128" r={radius} 
                    stroke="currentColor" 
                    strokeWidth="8" 
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round" // Çizginin uçlarını yumuşatır
                    className="text-green-400 transition-all duration-300 ease-out drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]" 
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-5xl font-bold text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]">{progress}%</span>
                </div>
              </div>
            )}
          </div>

          <div className={`mt-8 h-8 text-cyan-400 animate-pulse text-lg ${scanState === 'scanning' ? 'opacity-100' : 'opacity-0'}`}>
            &gt; _ {statusText}
          </div>
        </div>
      )}


      {/* ---------------- RAPOR EKRANI ---------------- */}
      {scanState === 'completed' && reportData && (
        <div className="w-full max-w-6xl flex flex-col items-center animate-fade-in text-center">
          
          <div className="border-b-4 border-green-500 pb-4 mb-8 w-full flex flex-col items-center">
            <h1 className="text-4xl font-bold text-white uppercase tracking-wider">Güvenlik Taraması</h1>
            <p className="text-cyan-400 mt-2">Sisteminizdeki uygulamalar NVD veritabanı ile karşılaştırıldı.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 w-full max-w-4xl mx-auto">
            <div className="border border-gray-800 bg-gray-900/50 p-6 flex flex-col items-center justify-center">
              <h3 className="text-gray-500 uppercase tracking-widest text-sm mb-2">Tarama Tarihi</h3>
              <p className="text-2xl text-white font-bold">{reportData.date}</p>
            </div>
            <div className="border border-gray-800 bg-gray-900/50 p-6 flex flex-col items-center justify-center">
              <h3 className="text-gray-500 uppercase tracking-widest text-sm mb-2">Taranan Uygulama</h3>
              <p className="text-2xl text-cyan-400 font-bold">{reportData.scannedApps}</p>
            </div>
            <div className="border border-green-900 bg-gray-900/50 p-6 flex flex-col items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.15)]">
              <h3 className="text-gray-500 uppercase tracking-widest text-sm mb-2">Bulunan Zafiyet</h3>
              <p className="text-3xl text-green-400 font-bold drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]">{reportData.foundVulns}</p>
            </div>
          </div>

          <div className="w-full flex flex-col items-center">
            <h2 className="text-2xl text-white font-bold mb-6 uppercase border-b border-gray-800 pb-2 inline-block">Zafiyet Detayları</h2>
            <div className="overflow-x-auto w-full flex justify-center">
              <table className="w-full max-w-5xl text-center border-collapse">
                <thead>
                  <tr className="border-b border-cyan-900/50 bg-gray-900/30">
                    <th className="py-4 px-4 text-cyan-500 font-normal uppercase text-sm tracking-wider text-center">Uygulama</th>
                    <th className="py-4 px-4 text-cyan-500 font-normal uppercase text-sm tracking-wider text-center">Versiyon</th>
                    <th className="py-4 px-4 text-cyan-500 font-normal uppercase text-sm tracking-wider text-center">CVE ID</th>
                    <th className="py-4 px-4 text-cyan-500 font-normal uppercase text-sm tracking-wider text-center">Puan (CVSS)</th>
                    <th className="py-4 px-4 text-cyan-500 font-normal uppercase text-sm tracking-wider text-center">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.vulnerabilities.map((vuln, index) => (
                    <tr key={index} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                      <td className="py-3 px-4 text-white text-center">{vuln.app}</td>
                      <td className="py-3 px-4 text-gray-400 text-center">{vuln.version}</td>
                      <td className="py-3 px-4 text-cyan-300 text-center">{vuln.cve}</td>
                      <td className="py-3 px-4 text-center">{vuln.score}</td>
                      <td className={`py-3 px-4 font-bold tracking-wider text-center ${
                        vuln.risk === 'HIGH' || vuln.risk === 'CRITICAL' ? 'text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]' : 
                        vuln.risk === 'MEDIUM' ? 'text-yellow-500' : 'text-gray-500'
                      }`}>
                        {vuln.risk}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-12 flex justify-center w-full">
             <button 
                onClick={() => setScanState('idle')}
                className="px-8 py-3 border-2 border-cyan-500 text-cyan-400 font-bold tracking-widest uppercase hover:bg-cyan-500 hover:text-black transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] rounded-none"
              >
                Yeni Tarama Başlat
              </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanPage;