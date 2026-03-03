import React from 'react';

const ScanReport = ({ data, onReset }) => {
  // GÜVENLİK KİLİDİ: Veri gelmeden bu sayfa çizilmeye kalkarsa çökmeyi engeller
  if (!data) return null;

  return (
    <div className="w-full max-w-6xl flex flex-col items-center animate-in fade-in zoom-in duration-500">
      
      {/* Üst Başlık */}
      <div className="border-l-8 border-green-500 pl-6 mb-10 w-full text-left bg-zinc-900/20 py-4">
        <h1 className="text-5xl font-black text-white uppercase tracking-tighter">TARAMA SONUÇLARI</h1>
        <p className="text-cyan-500 font-bold uppercase text-[10px] tracking-[0.5em] mt-2">NVD REAL-TIME DATA ANALYSIS COMPLETED</p>
      </div>

      {/* İstatistik Paneli */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-1 mb-10 w-full">
        <div className="bg-zinc-900 border border-zinc-800 p-8">
          <h3 className="text-zinc-500 text-[10px] tracking-[0.3em] font-bold mb-3">İŞLEM TARİHİ</h3>
          <p className="text-4xl font-black text-zinc-100">{data.date}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-8">
          <h3 className="text-zinc-500 text-[10px] tracking-[0.3em] font-bold mb-3">TESPİT EDİLEN APP</h3>
          <p className="text-4xl font-black text-cyan-400">{data.scannedApps}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-8 border-l-red-500/50">
          <h3 className="text-zinc-500 text-[10px] tracking-[0.3em] font-bold mb-3">TOPLAM ZAFİYET</h3>
          <p className="text-4xl font-black text-red-500">{data.foundVulns}</p>
        </div>
      </div>

      {/* Zafiyet Listesi (Tablo) */}
      <div className="w-full bg-zinc-950 border border-zinc-800 shadow-2xl mb-8">
        <div className="overflow-x-auto max-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-zinc-900 z-10 border-b-2 border-zinc-800">
              <tr className="text-zinc-500 text-[10px] tracking-widest uppercase font-bold">
                <th className="p-5">Uygulama Adı</th>
                <th className="p-5">Versiyon</th>
                <th className="p-5">CVE Kimliği</th>
                <th className="p-5">CVSS Skoru</th>
                <th className="p-5 text-right">Risk Düzeyi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {data.vulnerabilities?.length > 0 ? (
                data.vulnerabilities.map((vuln, index) => (
                  <tr key={index} className="hover:bg-cyan-500/5 transition-all group">
                    <td className="p-5 text-zinc-100 font-bold group-hover:text-cyan-400">{vuln.app}</td>
                    <td className="p-5 text-zinc-500">{vuln.version}</td>
                    
                    {/* CVE ID'ye tıklayınca direkt NIST sayfasına uçar */}
                    <td className="p-5 text-cyan-500 hover:text-cyan-300 font-bold cursor-pointer" 
                        onClick={() => window.open(`https://nvd.nist.gov/vuln/detail/${vuln.cve}`)}>
                      {vuln.cve}
                    </td>
                    
                    <td className="p-5 text-zinc-300 font-mono">{vuln.score || 'N/A'}</td>
                    
                    <td className="p-5 text-right">
                      <span className={`px-4 py-1 text-[9px] font-black tracking-widest uppercase border ${
                        vuln.risk === 'HIGH' || vuln.risk === 'CRITICAL' ? 'bg-red-500/10 text-red-500 border-red-500' : 
                        vuln.risk === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500' : 
                        'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}>
                        {vuln.risk || 'INFO'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-10 text-center text-zinc-600 italic">Sistem tertemiz, herhangi bir zafiyet tespit edilemedi.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Yeniden Başlat Butonu */}
      <button 
        onClick={onReset}
        className="px-12 py-5 border-2 border-cyan-500/30 text-cyan-400 text-xs font-black tracking-[0.5em] uppercase hover:bg-cyan-500 hover:text-black hover:border-cyan-500 transition-all duration-300"
      >
        YENİ TARAMA PROTOKOLÜ BAŞLAT
      </button>
      
    </div>
  );
};

export default ScanReport;