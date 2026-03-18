import React, { useState } from 'react';

// YENİ: activeTab ve setActiveTab proplarını ekledik ki sayfaları değiştirebilelim
const Sidebar = ({ activeTab, setActiveTab }) => {
    const [isOpen, setIsOpen] = useState(false);

    // Menü öğeleri listemiz
    const menuItems = [
        {
            id: 'scan',
            label: 'YENİ TARAMA',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            )
        },
        // --- YENİ EKLENEN: PASİF İSTİHBARAT (RECON) ---
        {
            id: 'recon',
            label: 'PASİF İSTİHBARAT',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                </svg>
            )
        },
        // Winget Güncelleme Sayfası Butonu
        {
            id: 'update',
            label: 'YAZILIM GÜNCELLE',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            )
        },
        {
            id: 'history',
            label: 'GEÇMİŞ RAPORLAR',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            )
        },
        {
            id: 'settings',
            label: 'SİSTEM AYARLARI',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            )
        }
    ];

    return (
        <div className={`fixed left-0 top-10 h-[calc(100vh-40px)] bg-black border-r border-zinc-800 transition-all duration-300 z-50 flex flex-col ${isOpen ? 'w-64' : 'w-20'}`}>
            {/* MENÜ AÇMA/KAPAMA BUTONU */}
            <div className="h-20 flex items-center justify-center border-b border-zinc-800">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="text-zinc-400 hover:text-cyan-400 focus:outline-none transition-colors duration-300 p-2 rounded-lg hover:bg-zinc-900"
                >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {isOpen ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /> // Çift ok sol
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /> // Hamburger menü
                        )}
                    </svg>
                </button>
            </div>

            {/* MENÜ LİSTESİ */}
            <nav className="flex-1 py-8 flex flex-col gap-4 px-3">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)} // YENİ: Tıklanınca App.jsx'teki state'i değiştirir
                        className={`flex items-center gap-4 px-3 py-3 rounded-lg transition-all duration-300 group ${
                            activeTab === item.id 
                                ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-500/30' // Aktif sekme parlak cyan olur
                                : 'text-zinc-500 hover:bg-zinc-900 hover:text-cyan-300' // Diğerleri soluk kalır
                        }`}
                        title={!isOpen ? item.label : ""}
                    >
                        <div className="min-w-[24px] group-hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] transition-all">
                            {item.icon}
                        </div>
                        {isOpen && (
                            <span className="font-mono font-bold tracking-wider text-sm whitespace-nowrap animate-in fade-in duration-300">
                                {item.label}
                            </span>
                        )}
                    </button>
                ))}
            </nav>

            {/* ALT VERSİYON BİLGİSİ */}
            {isOpen && (
                <div className="p-4 border-t border-zinc-800 text-center animate-in fade-in">
                    {/* Ekran görüntüne uygun olarak V1.0.2 yaptık */}
                    <span className="text-[10px] text-zinc-600 font-mono tracking-widest uppercase">v1.0.2</span>
                </div>
            )}
        </div>
    );
};

export default Sidebar;