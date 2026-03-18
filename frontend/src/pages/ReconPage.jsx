import React, { useState } from 'react';

const ReconPage = () => {
    const [domain, setDomain] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    const handleRecon = async () => {
        if (!domain) return setError("Hedef domain belirtmelisin! (örn: google.com)");
        setLoading(true);
        setError(null);
        setResults(null);

        try {
            const agentId = localStorage.getItem('assassin_agent_id') || 'GHOST-AGENT';

            const response = await fetch('http://localhost:3000/api/scan/recon/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Assassin-ID': agentId
                },
                body: JSON.stringify({ domain })
            });

            const data = await response.json();
            if (data.success) {
                setResults(data);
            } else {
                setError(data.error || "İstihbarat motoru başarısız oldu.");
            }
        } catch (err) {
            setError("Sunucuya bağlanılamadı.");
        }
        setLoading(false);
    };

    return (
        <div className="p-10 w-full max-w-5xl mx-auto animate-in fade-in zoom-in duration-500">
            <h1 className="text-3xl font-black text-purple-400 tracking-widest uppercase mb-2">Pasif İstihbarat (OSINT)</h1>
            <p className="text-zinc-500 font-mono text-sm mb-10">Hedef domain üzerindeki gizli subdomainleri ve canlı sunucuları tespit et.</p>

            <div className="bg-black border border-zinc-800 p-6 rounded-xl flex gap-4 mb-8">
                <input
                    type="text"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="Hedef Domain (örn: tesla.com)"
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-purple-500 transition-colors"
                />
                <button
                    onClick={handleRecon}
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-lg font-bold tracking-wider disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                    {loading ? 'TARANIYOR...' : 'KEŞFE BAŞLA'}
                </button>
            </div>

            {error && <div className="text-red-500 font-mono mb-4 p-4 border border-red-500/30 bg-red-900/10 rounded-lg">{error}</div>}

            {loading && (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4"></div>
                    <span className="text-purple-400 font-mono tracking-widest animate-pulse">İSTİHBARAT AĞLARI TARANIYOR...</span>
                </div>
            )}

            {results && (
                <div className="flex flex-col gap-6">
                    {/* CANLI HEDEFLER */}
                    <div className="bg-black border border-purple-500/30 rounded-xl p-6">
                        <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-4">
                            <h2 className="text-xl font-bold text-white uppercase">Canlı Hedefler</h2>
                            <span className="text-purple-400 font-mono text-sm">{results.aliveCount} / {results.totalFound} Sistem Ayakta</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {results?.aliveHosts?.map((host, idx) => (
                                <div key={idx} className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg flex flex-col gap-2">
                                    <a href={host.url} target="_blank" rel="noreferrer" className="text-purple-400 hover:text-purple-300 font-mono text-sm truncate">
                                        {host.url}
                                    </a>
                                    <div className="flex justify-between items-center text-xs font-mono">
                                        <span className={
                                            host.status === 200 ? 'text-green-500' :
                                            host.status >= 400 && host.status < 500 ? 'text-red-500 font-bold' :
                                            'text-amber-500'
                                        }>
                                            HTTP {host.status}
                                        </span>
                                        <span className="text-zinc-500 truncate max-w-[150px]">{host.server}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* TÜM BULUNANLAR (RAW LİSTE) */}
                    {results?.rawSubdomains && results.rawSubdomains.length > 0 && (
                        <div className="bg-black border border-zinc-800 rounded-xl p-6">
                            <h2 className="text-sm font-bold text-zinc-400 border-b border-zinc-800 pb-2 mb-4 uppercase">
                                Tüm Keşfedilen Hedefler ({results.rawSubdomains.length})
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto font-mono text-xs text-zinc-500 custom-scrollbar pr-2">
                                {results.rawSubdomains.map((sub, i) => (
                                    <div key={i} className="truncate hover:text-zinc-300 transition-colors">{sub}</div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
            
        </div>
    );
};

export default ReconPage;