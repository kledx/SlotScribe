'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Search,
    Activity,
    ShieldCheck,
    Calendar,
    Hash,
    Globe,
    ChevronRight,
    Filter,
    ArrowUpRight
} from 'lucide-react';

interface TraceSummary {
    hash: string;
    version: string;
    createdAt: string;
    intent: string;
    cluster: string;
    signature?: string;
}

export default function ExplorerPage() {
    const [traces, setTraces] = useState<TraceSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [globalCluster, setGlobalCluster] = useState('devnet');

    useEffect(() => {
        // 同步全局偏好
        const saved = localStorage.getItem('slotscribe_cluster');
        if (saved) setGlobalCluster(saved);

        fetchTraces();

        // 开启自动刷新（轮询机制）
        const interval = setInterval(() => {
            fetchTraces(false); // 传入 false 表示静默刷新，不显示 loading 状态动画
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const fetchTraces = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const res = await fetch('/api/trace?list=true&limit=100');
            const data = await res.json();
            if (data.success) {
                setTraces(data.traces);
            }
        } catch (err) {
            console.error('Failed to fetch traces:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredTraces = traces.filter(t => {
        const matchesSearch = t.hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.intent.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCluster = t.cluster === globalCluster;
        return matchesSearch && matchesCluster;
    });

    return (
        <div className="flex flex-col gap-12 max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="flex flex-col gap-3">
                    <h1 className="text-4xl font-black text-brand-dark tracking-tight">Trace Explorer</h1>
                    <p className="text-gray-500 font-medium text-lg italic">
                        Viewing audit logs for <span className={globalCluster === 'mainnet-beta' ? 'text-amber-600 font-bold' : 'text-brand-green font-bold'}>
                            {globalCluster === 'mainnet-beta' ? 'Mainnet' : 'Devnet'}
                        </span> (Synced with global switcher)
                    </p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative group" suppressHydrationWarning>
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-green transition-colors" />
                <input
                    type="text"
                    placeholder="Search by Hash or Intent (e.g. 'Transfer SOL', 'Swap')..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-16 pr-8 py-6 bg-white border-2 border-brand-dark/5 rounded-3xl shadow-xl focus:border-brand-green focus:outline-none transition-all text-brand-dark font-medium text-lg placeholder:text-gray-300"
                    suppressHydrationWarning
                />
            </div>

            {/* Trace List */}
            <div className="flex flex-col gap-6">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <div className="w-12 h-12 border-4 border-brand-green/20 border-t-brand-green rounded-full animate-spin"></div>
                        <p className="text-sm font-bold text-gray-400 animate-pulse uppercase tracking-widest">Hydrating Trace Stream...</p>
                    </div>
                ) : filteredTraces.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
                        {filteredTraces.map((trace) => (
                            <Link
                                key={trace.hash}
                                href={trace.signature ? `/report/${trace.signature}?cluster=${trace.cluster}&hash=${trace.hash}` : `/report/unverified?hash=${trace.hash}&cluster=${trace.cluster}`}
                                className="group block glass-card rounded-3xl border border-white/20 bg-white/40 hover:bg-white/60 transition-all p-6 md:p-8 hover:shadow-2xl hover:-translate-y-1"
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                    <div className="flex items-start gap-6">
                                        <div className="w-14 h-14 bg-brand-green/10 rounded-2xl flex items-center justify-center group-hover:bg-brand-green group-hover:text-white transition-all text-brand-green">
                                            <Activity className="w-7 h-7" />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter border ${trace.cluster === 'mainnet-beta'
                                                    ? 'bg-red-50 text-red-600 border-red-100'
                                                    : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                                    }`}>
                                                    {trace.cluster === 'mainnet-beta' ? 'Mainnet' : 'Devnet'}
                                                </span>
                                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                                                    {new Date(trace.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h3 className="text-xl font-bold text-brand-dark group-hover:text-brand-green transition-colors">
                                                {trace.intent}
                                            </h3>
                                        </div>
                                    </div>

                                    <div className="flex flex-col lg:items-end gap-2">
                                        <div className="flex items-center gap-2 bg-gray-100/50 px-4 py-2 rounded-xl border border-gray-200 group-hover:border-brand-green/20 transition-all">
                                            <Hash className="w-4 h-4 text-gray-400" />
                                            <span className="font-mono text-sm text-gray-500">
                                                {trace.hash.slice(0, 16)}...{trace.hash.slice(-8)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-brand-green font-black text-sm uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                            View Report
                                            <ArrowUpRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center bg-white/20 rounded-3xl border border-dashed border-gray-300">
                        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-400">No traces found</h3>
                        <p className="text-gray-500 mt-2">Try adjusting your search filters.</p>
                    </div>
                )}
            </div>

            {/* Stats Footer */}
            <div className="flex justify-between items-center py-8 border-t border-brand-dark/5 text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">
                <div>v1.2.0 - Network Monitor Active</div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-brand-green rounded-full animate-pulse"></span>
                    Live Updates
                </div>
            </div>
        </div>
    );
}
