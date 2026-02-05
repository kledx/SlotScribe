'use client';

import { useState, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';

export default function NetworkSwitcher() {
    const [isOpen, setIsOpen] = useState(false);
    const [cluster, setCluster] = useState('devnet');

    useEffect(() => {
        // 优先从 localStorage 获取，否则用环境变量
        const saved = localStorage.getItem('slotscribe_cluster');
        const defaultCluster = saved || process.env.NEXT_PUBLIC_DEFAULT_CLUSTER || 'devnet';
        setCluster(defaultCluster);
    }, []);

    const handleSwitch = (id: string) => {
        setCluster(id);
        localStorage.setItem('slotscribe_cluster', id);
        setIsOpen(false);
        // 刷新页面以应用全局变更到所有组件
        window.location.reload();
    };

    const networks = [
        { id: 'mainnet-beta', name: 'Mainnet', color: 'text-red-500' },
        { id: 'devnet', name: 'Devnet', color: 'text-indigo-500' },
    ];

    const currentNetwork = networks.find(n => n.id === cluster) || networks[1];

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/50 hover:bg-white border border-gray-200 rounded-full transition-all group"
            >
                <Globe className={`w-3.5 h-3.5 ${currentNetwork.color}`} />
                <span className="text-[11px] font-black uppercase tracking-widest text-brand-dark">
                    {currentNetwork.name}
                </span>
                <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-2 border-b border-gray-50 mb-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Network</span>
                    </div>
                    {networks.map((net) => (
                        <button
                            key={net.id}
                            onClick={() => handleSwitch(net.id)}
                            className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold transition-colors ${cluster === net.id ? 'text-brand-green bg-brand-green/5' : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${net.id === 'mainnet-beta' ? 'bg-red-500' : 'bg-indigo-500'}`}></span>
                                {net.name}
                            </span>
                            {cluster === net.id && <Check className="w-3.5 h-3.5" />}
                        </button>
                    ))}
                    <div className="px-4 py-2 mt-1 bg-gray-50 text-[9px] text-gray-400 font-medium leading-tight">
                        Switching refreshes the session to sync RPC settings.
                    </div>
                </div>
            )}
        </div>
    );
}
