'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DEFAULT_CLUSTER } from '@/lib/constants';
import {
    Search,
    CheckCircle2,
    XCircle,
    Share2,
    ShieldCheck,
    ChevronDown,
    ChevronUp,
    Copy,
    ExternalLink,
    FileText
} from 'lucide-react';

interface VerifyResponse {
    result: {
        ok: boolean;
        expectedHash?: string;
        computedHash?: string;
        reasons: string[];
    };
    trace?: {
        version: string;
        createdAt: string;
        payload: {
            intent: string;
            plan: { steps: string[] };
            toolCalls: Array<{
                name: string;
                input: unknown;
                output?: unknown;
                error?: string;
                startedAt: string;
                endedAt: string;
            }>;
            txSummary: {
                cluster: string;
                feePayer: string;
                to: string;
                lamports: number;
                programIds: string[];
            };
        };
        payloadHash: string;
    };
    txSummary?: {
        fee: number;
        programs: string[];
        to?: string;
        lamports?: number;
        slot?: number;
        blockTime?: number;
        status?: string;
        balanceChanges?: Array<{
            mint: string;
            change: number;
            symbol?: string;
        }>;
    };
    memoRaw?: string;
    onChainHash?: string;
    slot?: number;
    error?: string;
}

function VerifyContent() {
    const searchParams = useSearchParams();

    const [cluster, setCluster] = useState(DEFAULT_CLUSTER);
    const [signature, setSignature] = useState('');
    const [hash, setHash] = useState('');
    const [rpcSource, setRpcSource] = useState('default');
    const [rpcUrl, setRpcUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<VerifyResponse | null>(null);

    useEffect(() => {
        // 在客户端挂载后同步网络状态
        const saved = localStorage.getItem('slotscribe_cluster');
        const urlCluster = searchParams.get('cluster');
        const urlSig = searchParams.get('sig');
        const urlHash = searchParams.get('hash');
        const urlRpc = searchParams.get('rpcUrl');

        if (urlCluster || saved) {
            const val = (urlCluster || saved) as any;
            if (['mainnet-beta', 'devnet', 'testnet', 'localnet'].includes(val)) {
                setCluster(val);
            }
        }
        if (urlSig) setSignature(urlSig);
        if (urlHash) setHash(urlHash);
        if (urlRpc) setRpcUrl(urlRpc);

        if (urlSig || urlHash) {
            // 如果 URL 中有 sig 或 hash，触发验证流程
            setTimeout(() => handleVerify(urlSig || '', urlHash || ''), 100);
        }
    }, [searchParams]);

    // 监听 cluster 变化重新验证 (可选，但为了体验一致)
    useEffect(() => {
        if ((signature || hash) && !result && !loading) {
            handleVerify();
        }
    }, [cluster, signature, hash]);

    const handleVerify = async (forceSig?: string, forceHash?: string) => {
        const sigToUse = forceSig !== undefined ? forceSig : signature;
        const hashToUse = forceHash !== undefined ? forceHash : hash;

        if (!sigToUse.trim() && !hashToUse.trim()) return;
        setLoading(true);
        setResult(null);

        try {
            const params = new URLSearchParams({
                cluster,
            });
            if (sigToUse.trim()) params.set('signature', sigToUse.trim());
            if (hashToUse.trim()) params.set('hash', hashToUse.trim());
            if (rpcSource === 'custom' && rpcUrl.trim()) params.set('rpcUrl', rpcUrl.trim());

            const response = await fetch(`/api/verify?${params}`);
            const data = await response.json();
            setResult(data);
        } catch (err) {
            setResult({
                result: { ok: false, reasons: [`Request failed: ${err}`] },
                error: String(err),
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-px bg-gray-200 overflow-hidden shadow-2xl rounded-3xl border border-gray-200">
            {/* Sidebar */}
            <aside className="w-full lg:w-[380px] bg-brand-beige p-8 lg:p-10 flex flex-col gap-10">
                <div className="flex flex-col gap-2">
                    <h2 className="text-3xl font-bold text-brand-dark">Verify Transaction</h2>
                    <p className="text-sm text-gray-500 font-medium">Anchor AI Agent execution traces into Solana transactions.</p>
                </div>

                <div className="flex flex-col gap-8">
                    {/* Current Network Status */}
                    <div className="flex flex-col gap-3 p-5 bg-white/40 rounded-2xl border border-white/60">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                            Current Context
                        </label>
                        <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${cluster === 'mainnet-beta' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-brand-green shadow-[0_0_10px_rgba(34,197,94,0.5)]'}`}></div>
                            <span className="text-sm font-black text-brand-dark uppercase tracking-wider">
                                {cluster === 'mainnet-beta' ? 'Solana Mainnet' : 'Solana Devnet'}
                            </span>
                        </div>
                        <p className="text-[9px] text-gray-400 font-bold leading-tight">
                            Synced with global network setting in the header.
                        </p>
                    </div>

                    {/* Inputs */}
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-3">
                            <label className="text-sm font-bold text-brand-dark">Transaction Signature</label>
                            <textarea
                                value={signature}
                                onChange={(e) => setSignature(e.target.value)}
                                placeholder="5K7sX...9A2tQ"
                                className="w-full h-24 p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all text-sm font-mono resize-none shadow-inner"
                                suppressHydrationWarning
                            />
                        </div>

                        <div className="flex flex-col gap-3">
                            <label className="text-sm font-bold text-brand-dark">Payload Hash (Optional)</label>
                            <input
                                type="text"
                                value={hash}
                                onChange={(e) => setHash(e.target.value)}
                                placeholder="0xAbC...123dEf"
                                className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all text-sm font-mono shadow-inner"
                                suppressHydrationWarning
                            />
                        </div>

                        <div className="flex flex-col gap-4">
                            <label className="text-sm font-bold text-brand-dark">Trace Source</label>
                            <div className="flex flex-col gap-3">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="radio"
                                        checked={rpcSource === 'default'}
                                        onChange={() => setRpcSource('default')}
                                        className="w-4 h-4 accent-brand-green"
                                        suppressHydrationWarning
                                    />
                                    <span className="text-sm font-medium text-gray-600 group-hover:text-brand-dark">Auto-detect</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="radio"
                                        checked={rpcSource === 'custom'}
                                        onChange={() => setRpcSource('custom')}
                                        className="w-4 h-4 accent-brand-green"
                                        suppressHydrationWarning
                                    />
                                    <span className="text-sm font-medium text-gray-600 group-hover:text-brand-dark">Custom RPC</span>
                                </label>
                            </div>

                            {rpcSource === 'custom' && (
                                <input
                                    type="text"
                                    value={rpcUrl}
                                    onChange={(e) => setRpcUrl(e.target.value)}
                                    placeholder="https://api.mainnet-beta.solana.com"
                                    className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all text-sm font-mono shadow-inner mt-2"
                                    suppressHydrationWarning
                                />
                            )}
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => handleVerify()}
                    disabled={loading || !signature.trim()}
                    className="w-full py-4 bg-brand-green hover:bg-brand-green-dark disabled:bg-gray-300 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98] text-lg"
                    suppressHydrationWarning
                >
                    {loading ? 'Verifying...' : 'Verify'}
                </button>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 bg-white p-8 lg:p-12 overflow-y-auto">
                {!result && !loading ? (
                    <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-20">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <Search className="w-10 h-10 text-gray-300" />
                        </div>
                        <h3 className="text-2xl font-bold text-brand-dark">Ready to Verify</h3>
                        <p className="text-gray-500 max-w-sm text-sm">Enter a transaction signature on the left to start verifying the agent execution receipt against on-chain data.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-10">
                        {/* Status Header */}
                        {result && (
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                <div className="flex items-center gap-6">
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${result.result.ok ? 'bg-brand-green' : !signature ? 'bg-amber-500' : 'bg-red-500'} text-white shadow-xl`}>
                                        {result.result.ok ? <CheckCircle2 className="w-8 h-8" /> : !signature ? <ShieldCheck className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <h3 className={`text-3xl font-bold ${result.result.ok ? 'text-brand-green' : !signature || result.result.reasons[0]?.includes('not found') ? 'text-amber-500' : 'text-red-500'}`}>
                                            {result.result.ok ? 'Verified' : !signature ? 'Trace Loaded' : result.result.reasons[0]?.includes('not found on chain') ? 'Unanchored' : 'Verification Failed'}
                                        </h3>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-bold text-gray-400 uppercase tracking-widest border border-gray-200">
                                                On-Chain: {result.onChainHash?.slice(0, 8)}...
                                            </span>
                                            <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-bold text-gray-400 uppercase tracking-widest border border-gray-200">
                                                Computed: {result.result.computedHash?.slice(0, 8)}...
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Link
                                        href={`/report/${signature}`}
                                        className="flex items-center gap-2 px-6 py-3 bg-brand-dark text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-md active:scale-95"
                                    >
                                        <FileText className="w-4 h-4" />
                                        View Full Report
                                    </Link>
                                    <button
                                        suppressHydrationWarning
                                        className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-400 hover:text-brand-dark hover:border-gray-200 transition-all"
                                    >
                                        <Share2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {loading && (
                            <div className="py-20 flex flex-col items-center justify-center gap-4">
                                <div className="w-12 h-12 border-4 border-brand-green/20 border-t-brand-green rounded-full animate-spin"></div>
                                <p className="text-sm font-bold text-gray-400 animate-pulse">Scanning block {cluster}...</p>
                            </div>
                        )}

                        {/* Result Grid */}
                        {result && !loading && (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                {/* Transaction Summary */}
                                <div className="bg-white border border-gray-100 shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
                                    <div className="px-8 py-5 border-b border-gray-50 bg-gray-50/30">
                                        <h4 className="font-bold text-brand-dark uppercase tracking-widest text-sm">Transaction Summary</h4>
                                    </div>
                                    <div className="p-8 flex flex-col gap-4">
                                        <SummaryRow label="Slot" value={result.slot?.toString() || '---'} />
                                        <SummaryRow label="Time" value={result.txSummary?.blockTime ? new Date(result.txSummary.blockTime * 1000).toLocaleString() : '---'} />
                                        <SummaryRow label="Status" value={result.txSummary?.status || (result.result.ok ? 'Confirmed' : 'Error')} isStatus />
                                        <SummaryRow label="Fee" value={`${(result.txSummary?.fee || 0) / 1e9} SOL`} />
                                    </div>
                                </div>

                                {/* Token Balance Deltas */}
                                <div className="bg-white border border-gray-100 shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
                                    <div className="px-8 py-5 border-b border-gray-50 bg-gray-50/30">
                                        <h4 className="font-bold text-brand-dark uppercase tracking-widest text-sm">Token Balance Deltas</h4>
                                    </div>
                                    <div className="p-8 flex flex-col gap-4">
                                        {result.txSummary?.balanceChanges?.map((change, i) => (
                                            <BalanceRow key={i} symbol={change.symbol || change.mint.slice(0, 4)} amount={change.change} />
                                        )) || (
                                                <div className="flex flex-col gap-4">
                                                    <BalanceRow symbol="SOL (Lamports)" amount={-(result.txSummary?.lamports || 50000000)} />
                                                    <BalanceRow symbol="Recipient SOL" amount={result.txSummary?.lamports || 50000000} />
                                                </div>
                                            )}
                                    </div>
                                </div>

                                {/* Instructions Timeline - Full Width */}
                                <div className="xl:col-span-2 bg-white border border-gray-100 shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
                                    <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                                        <h4 className="font-bold text-brand-dark uppercase tracking-widest text-sm">Instructions & CPI Timeline</h4>
                                        <button
                                            suppressHydrationWarning
                                            className="text-gray-400 hover:text-brand-dark transition-colors"
                                        >
                                            <ChevronUp className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="p-8 bg-gray-900 border-t border-gray-800 font-mono text-sm leading-relaxed overflow-x-auto max-h-[500px]">
                                        <div className="flex flex-col gap-2">
                                            {result.trace?.payload.plan.steps.map((step, i) => (
                                                <TimelineRow key={i} line={String(i + 1)} content={`[ Plan ] ${step}`} isHeader />
                                            ))}
                                            {result.trace?.payload.toolCalls.map((call, i) => (
                                                <div key={i} className="mt-2">
                                                    <TimelineRow line="#" content={`[ Tool ] ${call.name}`} isHeader />
                                                    <TimelineRow line="" content={`> Input: ${JSON.stringify(call.input).slice(0, 100)}...`} />
                                                    {call.error && <TimelineRow line="!" content={`> Error: ${call.error}`} isError />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Reasons (If failed) */}
                                {!result.result.ok && result.result.reasons.length > 0 && (
                                    <div className="xl:col-span-2 p-8 bg-red-50 border border-red-100 rounded-3xl">
                                        <div className="flex items-center gap-3 mb-4">
                                            <XCircle className={`w-6 h-6 ${result.result.reasons[0]?.includes('not found') ? 'text-amber-600' : 'text-red-600'}`} />
                                            <h4 className={`${result.result.reasons[0]?.includes('not found') ? 'text-amber-700' : 'text-red-700'} font-bold uppercase tracking-widest text-sm`}>
                                                {result.result.reasons[0]?.includes('not found on chain') ? 'Anchoring Skipped' : 'Discrepancy Detected'}
                                            </h4>
                                        </div>
                                        <ul className="list-disc list-inside text-sm text-red-600 space-y-3 font-medium">
                                            {result.result.reasons.map((reason, i) => (
                                                <li key={i} className="pl-2">{reason}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
                }
            </main >
        </div >
    );
}

function SummaryRow({ label, value, isStatus }: { label: string, value: string, isStatus?: boolean }) {
    return (
        <div className="flex items-center justify-between text-sm py-1 border-b border-gray-50 last:border-0">
            <span className="text-gray-500 font-semibold">{label}</span>
            <span className={`font-mono font-bold ${isStatus ? 'text-brand-green' : 'text-brand-dark'}`}>{value}</span>
        </div>
    );
}

function BalanceRow({ symbol, amount }: { symbol: string, amount: number }) {
    const isNegative = amount < 0;
    return (
        <div className="flex items-center justify-between text-sm py-1 border-b border-gray-50 last:border-0 font-mono">
            <span className="text-brand-dark font-bold">{symbol}</span>
            <span className={`font-bold ${isNegative ? 'text-red-500' : 'text-brand-green'}`}>
                {isNegative ? '' : '+'}{amount.toLocaleString()}
            </span>
        </div>
    );
}

function TimelineRow({ line, content, isHeader, isError }: { line: string, content: string, isHeader?: boolean, isError?: boolean }) {
    return (
        <div className="flex gap-6 hover:bg-gray-800/50 py-1 transition-colors group">
            <span className="w-8 text-right text-gray-600 select-none font-mono">{line} |</span>
            <span className={`
                ${isHeader ? 'text-brand-green font-bold' : 'text-gray-400'}
                ${isError ? 'text-red-400 italic' : ''}
                font-mono group-hover:text-white transition-colors
            `}>
                {content}
            </span>
        </div>
    );
}

export default function VerifyPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[600px] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-brand-green/20 border-t-brand-green rounded-full animate-spin"></div>
            </div>
        }>
            <VerifyContent />
        </Suspense>
    );
}
