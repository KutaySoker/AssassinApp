import React from 'react';

const ScanProgress = ({ progress, statusText }) => {
  // MATEMATİK ARTIK SADECE BURADA (Güvenli Hesaplama)
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const safeProgress = Number.isNaN(progress) ? 0 : Math.min(Math.max(progress, 0), 100);
  const strokeDashoffset = circumference - (safeProgress / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full text-center">
      <h1 className="text-4xl font-bold mb-2 tracking-widest text-white uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
        ASSASSINAPP SCANNER
      </h1>
      <p className="text-gray-500 mb-12 italic text-xs tracking-widest">Sistem zafiyet analiz protokolü v1.0.2</p>

      <div className="relative flex items-center justify-center w-80 h-80">
        <div className="relative w-full h-full flex items-center justify-center">
          <svg viewBox="0 0 256 256" className="w-full h-full transform -rotate-90">
            <circle cx="128" cy="128" r={radius} stroke="#111" strokeWidth="12" fill="transparent" />
            <circle 
              cx="128" cy="128" r={radius} 
              stroke="#22c55e" 
              strokeWidth="12" 
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-300 ease-out" 
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-5xl font-black text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]">
              {Math.round(safeProgress)}%
            </span>
          </div>
        </div>
      </div>

      <div className="mt-10 h-8 text-cyan-400 text-lg tracking-[0.2em] font-bold animate-pulse">
        {`> ${statusText}`}
      </div>
    </div>
  );
};

export default ScanProgress;