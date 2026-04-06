import React, { useState, useEffect, useRef } from 'react';

const ReconPage = () => {
    const [domain, setDomain] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const [logs, setLogs] = useState([]); // 🔥 CANLI LOGLAR
    
    const terminalEndRef = useRef(null);
    const scrollToBottom = () => terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });

    useEffect(() => { scrollToBottom(); }, [logs]);

    const handleRecon = async () => {
        if (!domain) return setError("Hedef domain belirtmelisin! (örn: google.com)");
        
        setLoading(true);
        setError(null);
        setResults(null);
        setLogs([{ status: 'info', message: 'İstihbarat motorları ateşleniyor...' }]);

        const agentId = localStorage.getItem('assassin_agent_id') || 'GHOST-AGENT';

        // 1. CANLI YAYIN (SSE) BAĞLANTISI
        const eventSource = new EventSource('http://localhost:3000/api/scan/recon/stream');
        
        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setLogs((prev) => [...prev, data]);
            if (data.done) eventSource.close();
        };

        eventSource.onerror = () => {
            eventSource.close();
        };

        // 2. MOTORU BAŞLAT
        try {
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
                setLoading(false);
                eventSource.close();
            } else {
                setError(data.error || "İstihbarat motoru başarısız oldu.");
                setLoading(false);
                eventSource.close();
            }
        } catch (err) {
            setError("Sunucuya bağlanılamadı.");
            setLoading(false);
            eventSource.close();
        }
    };

    return (
        <div className="p-10 w-full max-w-5xl mx-auto animate-in fade-in zoom-in duration-500">
            <h1 className="text-3xl font-black text-purple-400 tracking-widest uppercase mb-2">Ağ Keşfi & İstihbarat</h1>
            <p className="text-zinc-500 font-mono text-sm mb-10">OSINT + Active DNS Permutation motoru ile hedef yüzeyi haritala.</p>

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
                    {loading ? 'SİSTEM MEŞGUL...' : 'OPERASYONU BAŞLAT'}
                </button>
            </div>

            {error && <div className="text-red-500 font-mono mb-4 p-4 border border-red-500/30 bg-red-900/10 rounded-lg">{error}</div>}

            {/* 🔥 CANLI TERMİNAL EKRANI (İşlem bitse de ekranda kalır) 🔥 */}
            {logs.length > 0 && (
                <div className="mb-8 animate-in slide-in-from-top-4 duration-500">
                    <div className="bg-black border border-purple-500/20 rounded-xl p-4 h-64 overflow-y-auto font-mono text-xs scrollbar-thin scrollbar-thumb-purple-900 pr-2">
                        {logs.map((log, i) => (
                            <div key={i} className={`mb-1 ${
                                log.status === 'found' ? 'text-green-400 font-bold' : 
                                log.status === 'error' ? 'text-red-500' : 
                                log.status === 'info' ? 'text-purple-300' : 'text-zinc-500'
                            }`}>
                                <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString()}]</span>
                                {log.message || (log.data?.subdomain || log.data?.url)} 
                                {log.data?.ips ? ` -> [${log.data.ips.join(', ')}]` : ''}
                                {log.data?.httpStatus ? ` [HTTP ${log.data.httpStatus}]` : ''}
                            </div>
                        ))}
                        <div ref={terminalEndRef} />
                    </div>
                </div>
            )}

            {results && (
                <div className="flex flex-col gap-6">
                    {/* CANLI HEDEFLER (HTTP 200/403 vs) */}
                    <div className="bg-black border border-purple-500/30 rounded-xl p-6 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
                        <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-4">
                            <h2 className="text-xl font-bold text-white uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-400">Canlı Sistemler</h2>
                            <span className="text-purple-400 font-mono text-sm">{results.aliveCount} / {results.totalFound} Aktif Host</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {results?.aliveHosts?.map((host, idx) => (
                                <div key={idx} className="bg-zinc-900/30 border border-zinc-800 hover:border-purple-500/50 transition-all p-4 rounded-lg flex flex-col gap-2 group">
                                    <a href={host.url} target="_blank" rel="noreferrer" className="text-purple-400 group-hover:text-purple-300 font-mono text-sm truncate underline decoration-purple-500/30">
                                        {host.url}
                                    </a>
                                    <div className="flex justify-between items-center text-xs font-mono">
                                        <span className={host.status === 200 ? 'text-green-500' : 'text-amber-500'}>
                                            HTTP {host.status}
                                        </span>
                                        <span className="text-zinc-600 truncate max-w-[150px]">{host.server}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 🔥 TÜM BULUNANLAR (RAW LİSTE) GERİ GELDİ 🔥 */}
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