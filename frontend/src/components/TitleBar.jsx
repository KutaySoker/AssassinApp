import React from 'react';

function TitleBar() {
  return (
    // WebkitAppRegion: 'drag' -> Bu sayede barın üstünden tutup pencereyi sürükleyebilirsin!
    <div 
      className="w-full h-8 bg-slate-950 border-b border-cyan-900/50 flex justify-between items-center px-4 select-none fixed top-0 z-50"
      style={{ WebkitAppRegion: 'drag' }} 
    >
      {/* Sol: Uygulama Adı */}
      <div className="flex items-center gap-2 text-cyan-500 font-mono text-xs tracking-widest drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]">
        <span className="text-green-400">root@</span>ASSASINTHEAPP ~
      </div>

      {/* Sağ: Kontrol Butonları */}
      {/* WebkitAppRegion: 'no-drag' -> Butonlara basabilmek için o bölgede sürüklemeyi kapatıyoruz */}
      <div className="flex gap-2" style={{ WebkitAppRegion: 'no-drag' }}>
        
        {/* Küçült */}
        <button 
          onClick={() => window.electronAPI?.minimize()}
          className="w-8 h-6 flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition-colors font-bold"
        >
          _
        </button>

        {/* Tam Ekran */}
        <button 
          onClick={() => window.electronAPI?.maximize()}
          className="w-8 h-6 flex items-center justify-center text-slate-400 hover:text-green-400 hover:bg-slate-800 rounded transition-colors font-bold"
        >
          □
        </button>

        {/* EKSİKLİĞİNİ HİSSETTİĞİMİZ O MEŞHUR KAPAT BUTONU */}
        <button 
          onClick={() => window.electronAPI?.close()}
          className="w-8 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-600 rounded transition-all shadow-[0_0_10px_rgba(220,38,38,0)] hover:shadow-[0_0_15px_rgba(220,38,38,0.8)] font-bold"
        >
          X
        </button>

      </div>
    </div>
  );
}

export default TitleBar;