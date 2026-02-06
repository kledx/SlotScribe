'use client';

import { useState, useEffect, Suspense, use, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    CheckCircle,
    XCircle,
    Link as LinkIcon,
    ChevronDown,
    ChevronUp,
    Copy,
    ShieldCheck,
    ExternalLink,
    Search,
    Share2
} from 'lucide-react';
import Link from 'next/link';
import { DEFAULT_CLUSTER } from '@/lib/constants';

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
    };
    onChainHash?: string;
    error?: string;
}

function ReportContent({ signature }: { signature: string }) {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState<VerifyResponse | null>(null);
    const [isTechnicalVisible, setIsTechnicalVisible] = useState(true);
    const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
    const [isCopyToastVisible, setIsCopyToastVisible] = useState(false);
    const shareMenuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const rpcUrl = searchParams.get('rpcUrl');
                const hash = searchParams.get('hash');
                let cluster = searchParams.get('cluster') || DEFAULT_CLUSTER;

                // 在客户端环境下尝试同步本地偏好
                if (typeof window !== 'undefined') {
                    const savedCluster = localStorage.getItem('slotscribe_cluster');
                    if (!searchParams.get('cluster') && savedCluster) {
                        cluster = savedCluster;
                    }
                }

                let url = `/api/verify?cluster=${cluster}`;
                if (signature !== 'unverified') {
                    url += `&signature=${signature}`;
                }
                if (hash) url += `&hash=${hash}`;
                if (rpcUrl) url += `&rpcUrl=${encodeURIComponent(rpcUrl)}`;

                const response = await fetch(url);
                const data = await response.json();
                setResult(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [signature, searchParams]);

    useEffect(() => {
        if (!isShareMenuOpen) return;

        const handleOutsideClick = (event: MouseEvent) => {
            const target = event.target as Node | null;
            if (shareMenuRef.current && target && !shareMenuRef.current.contains(target)) {
                setIsShareMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isShareMenuOpen]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const buildShareText = () => {
        const shareUrl = window.location.href;
        const cluster = (searchParams.get('cluster') || DEFAULT_CLUSTER).toUpperCase();
        const statusLabel = result?.result.ok ? 'VERIFIED' : signature === 'unverified' ? 'RECORDED' : 'FLAGGED';
        const shortSig = signature === 'unverified'
            ? 'unverified-trace'
            : `${signature.slice(0, 8)}...${signature.slice(-8)}`;
        const text = `SlotScribe report — ${statusLabel} on ${cluster} • ${shortSig}`;
        return { shareUrl, text };
    };

    const copyReportLink = () => {
        const { shareUrl } = buildShareText();
        copyToClipboard(shareUrl);
        setIsShareMenuOpen(false);
        setIsCopyToastVisible(true);
        window.setTimeout(() => setIsCopyToastVisible(false), 2000);
    };

    const shareToX = () => {
        const { shareUrl, text } = buildShareText();
        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
        setIsShareMenuOpen(false);
        const win = window.open(tweetUrl, '_blank', 'noopener,noreferrer');
        if (!win) {
            setIsCopyToastVisible(true);
            window.setTimeout(() => setIsCopyToastVisible(false), 2000);
        }
    };

    const downloadTraceJson = () => {
        if (!result?.trace) return;
        const payload = {
            signature: signature === 'unverified' ? undefined : signature,
            cluster: searchParams.get('cluster') || DEFAULT_CLUSTER,
            onChainHash: result.onChainHash,
            computedHash: result.result.computedHash,
            trace: result.trace,
            txSummary: result.txSummary,
            exportedAt: new Date().toISOString(),
        };
        const json = JSON.stringify(payload, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        const safeSig = signature === 'unverified' ? 'unverified' : signature.slice(0, 12);
        anchor.href = url;
        anchor.download = `slotscribe-trace-${safeSig}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 space-y-4">
                <div className="w-12 h-12 border-4 border-brand-green/30 border-t-brand-green rounded-full animate-spin"></div>
                <p className="text-gray-500 font-medium animate-pulse tracking-widest uppercase text-sm">Generating Audit Report...</p>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="py-40 text-center">
                <h2 className="text-2xl font-bold text-gray-900 italic">Report not found</h2>
                <p className="text-gray-500 mt-2">Could not retrieve verification data for this signature.</p>
                <Link href="/verify" className="mt-6 inline-block text-brand-green font-bold hover:underline">Go to Verify Tool</Link>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-1000 max-w-5xl mx-auto py-12 px-6">
            {/* Status Header */}
            <div className="flex flex-col items-center mb-16">
                <div className="relative mb-8">
                    {result.result.ok ? (
                        <div className="bg-brand-green p-7 rounded-full shadow-2xl shadow-brand-green/40 relative z-0">
                            <CheckCircle className="w-16 h-16 text-white" />
                            <div className="absolute inset-0 bg-brand-green rounded-full animate-ping opacity-20 -z-10"></div>
                        </div>
                    ) : (
                        <div className="bg-red-500 p-7 rounded-full shadow-2xl shadow-red-500/40">
                            <XCircle className="w-16 h-16 text-white" />
                        </div>
                    )}
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white px-5 py-1.5 rounded-full border border-gray-100 shadow-xl whitespace-nowrap">
                        <span className={`text-sm font-black uppercase tracking-[0.2em] ${result.result.ok ? 'text-brand-green' : signature === 'unverified' ? 'text-amber-500' : 'text-red-500'}`}>
                            {result.result.ok ? 'TRUSTED EXECUTION' : signature === 'unverified' ? 'TRACE RECORDED' : 'INVALID STATE'}
                        </span>
                    </div>
                </div>
                <h1 className="text-2xl font-bold mt-2 text-center text-brand-dark max-w-2xl leading-relaxed">
                    {result.result.ok
                        ? 'This transaction matches the expected state transition anchor.'
                        : signature === 'unverified'
                            ? 'This trace has been recorded but not yet anchored on-chain.'
                            : result.result.reasons?.some(r => r.includes('not found'))
                                ? 'Transaction not found on the selected network.'
                                : 'Security Alert: This transaction failed cryptographical state verification.'}
                </h1>
                <div className="flex items-center gap-4 mt-8">
                    <div className="relative" ref={shareMenuRef}>
                        <button
                            onClick={() => setIsShareMenuOpen((open) => !open)}
                            className="flex items-center space-x-2 px-8 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-brand-green hover:shadow-md transition-all active:scale-95"
                        >
                            <Share2 className="w-4 h-4" />
                            <span>Share Report</span>
                        </button>
                        {isCopyToastVisible && (
                            <div className="absolute top-full left-0 mt-2 px-3 py-1.5 rounded-lg bg-white/80 border border-gray-100 text-xs font-semibold text-gray-600 tracking-widest shadow-sm backdrop-blur-md">
                                LINK COPIED
                            </div>
                        )}
                        {isShareMenuOpen && (
                            <div className="absolute top-full left-0 mt-3 w-56 bg-white rounded-2xl border border-gray-100 shadow-xl p-2 z-20">
                                <button
                                    onClick={copyReportLink}
                                    className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold text-brand-dark hover:bg-brand-green/10 transition-colors"
                                >
                                    Copy Link
                                </button>
                                <button
                                    onClick={shareToX}
                                    className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold text-brand-dark hover:bg-brand-green/10 transition-colors"
                                >
                                    Share to X
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Executive Summary */}
            <div className="glass-card rounded-[2.5rem] overflow-hidden mb-8">
                <div className="px-10 py-6 border-b border-white/20 bg-white/30">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-[0.3em]">Official Audit Receipt</h2>
                </div>
                <div className="p-10">
                    <div className="flex flex-col md:flex-row items-start gap-8 mb-12">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-3xl font-black text-brand-dark tracking-tight mb-3">
                                {result.trace?.payload.intent || 'Generic Action'}
                            </h3>
                            <div className="flex items-center gap-2 group cursor-pointer min-w-0" onClick={() => signature !== 'unverified' && copyToClipboard(signature)}>
                                <span className={`text-xs font-mono max-w-full break-all ${signature === 'unverified' ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-gray-400 bg-gray-100/50 border-gray-100'} px-3 py-1 rounded-lg border group-hover:border-brand-green/30 transition-all`}>
                                    {signature === 'unverified' ? 'TX: PENDING ANCHOR' : `SIG: ${signature.slice(0, 16)}...${signature.slice(-16)}`}
                                </span>
                                {signature !== 'unverified' && <Copy className="w-3 h-3 text-gray-300 group-hover:text-brand-green" />}
                            </div>
                        </div>
                        <div className="md:ml-auto text-left md:text-right flex flex-col md:items-end gap-3 max-w-full">
                            <div>
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Block Cluster</p>
                                <p className="text-lg font-bold text-brand-green break-words">
                                    {result.trace?.payload.txSummary.cluster.toUpperCase() || searchParams.get('cluster')?.toUpperCase() || 'DEVNET'}
                                </p>
                            </div>
                            {signature !== 'unverified' && (
                                <a
                                    href={`https://explorer.solana.com/tx/${signature}?cluster=${searchParams.get('cluster') || 'devnet'}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-500 hover:text-brand-green hover:border-brand-green/30 transition-all shadow-sm"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                    SOLANA EXPLORER
                                </a>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Token Deltas */}
                        <div>
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] mb-6">Balance Delta Verification</h4>
                            <div className="space-y-3 font-mono">
                                <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                                    <span className="text-sm text-gray-600 font-bold">Source Outflow:</span>
                                    <span className="text-sm font-bold text-red-500">-{result.txSummary?.lamports || 0} LAMPORT</span>
                                </div>
                                <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                                    <span className="text-sm text-gray-600 font-bold">Target Inflow:</span>
                                    <span className="text-sm font-bold text-brand-green">+{result.txSummary?.lamports || 0} LAMPORT</span>
                                </div>
                                <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                                    <span className="text-sm text-gray-600 font-bold">Network Fees:</span>
                                    <span className="text-sm font-bold text-brand-dark">{result.txSummary?.fee || 0} LAMPORT</span>
                                </div>
                            </div>
                        </div>

                        {/* Risk Assessment */}
                        <div className="flex flex-col justify-center">
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] mb-6">Security Assessment</h4>
                            <div className="flex flex-wrap gap-2 mb-6">
                                <span className="px-5 py-2 bg-brand-green/10 text-brand-green text-sm font-black rounded-xl uppercase tracking-widest border border-brand-green/20">Secured</span>
                                <span className="px-5 py-2 bg-brand-dark/5 text-brand-dark text-sm font-black rounded-xl uppercase tracking-widest border border-brand-dark/10">Deterministic</span>
                            </div>
                            <div className={`p-6 rounded-[2rem] border transition-all ${result.result.ok ? 'bg-brand-green/5 border-brand-green/10' : 'bg-red-50 border-red-100'}`}>
                                <div className="flex items-start space-x-4">
                                    <ShieldCheck className={`w-6 h-6 ${result.result.ok ? 'text-brand-green' : 'text-red-500'} mt-0.5`} />
                                    <div className="space-y-2">
                                        <p className={`text-sm leading-relaxed font-bold ${result.result.ok ? 'text-brand-dark' : 'text-red-700'}`}>
                                            {result.result.ok
                                                ? 'Account modifications perfectly align with the intended logic. No anomalous activity detected.'
                                                : 'CRITICAL: The on-chain hash does not match the off-chain execution trace. Modification suspected.'
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Technical Evidence */}
            <div className="glass-card rounded-[2.5rem] overflow-hidden mb-8">
                <button
                    onClick={() => setIsTechnicalVisible(!isTechnicalVisible)}
                    className="w-full px-10 py-6 flex items-center justify-between bg-white/20 hover:bg-white/40 transition-colors"
                >
                    <div className="flex items-center space-x-3">
                        <h2 className="text-sm font-black text-gray-900 uppercase tracking-[0.3em]">Technical Proof</h2>
                        {isTechnicalVisible ? <ChevronUp className="w-5 h-5 text-brand-green" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </div>
                    <span className="text-sm text-brand-green font-black tracking-[0.2em] uppercase">Immutable Records</span>
                </button>

                {isTechnicalVisible && (
                    <div className="p-8 border-t border-white/20 bg-white/10">
                        {/* Hash Comparison */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center mb-8 relative">
                            <div>
                                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">On-Chain Anchor</h4>
                                <div className="p-5 bg-brand-dark rounded-2xl font-mono text-sm text-brand-green/80 break-all border border-white/10 shadow-inner">
                                    {(result.onChainHash || 'N/A')}
                                </div>
                            </div>
                            <div className="absolute left-1/2 top-[55%] -translate-x-1/2 hidden md:flex flex-col items-center z-10">
                                <div className="bg-brand-green p-2 rounded-full shadow-lg shadow-brand-green/20">
                                    <CheckCircle className="w-5 h-5 text-white" />
                                </div>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Computed Trace Hash</h4>
                                <div className="p-5 bg-brand-dark rounded-2xl font-mono text-sm text-brand-green/80 break-all border border-white/10 shadow-inner">
                                    {(result.result.computedHash || 'N/A')}
                                </div>
                            </div>
                        </div>

                        {/* Raw Trace */}
                        <div>
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Execution Sequence</h4>
                            <div className="bg-white/40 border border-white/20 rounded-[2rem] overflow-hidden p-8 max-h-[500px] overflow-y-auto font-mono text-sm shadow-inner">
                                {result.trace?.payload.plan.steps.map((step, idx) => (
                                <div key={idx} className="flex space-x-6 py-2.5 border-b border-brand-dark/5 last:border-0 group min-w-0">
                                    <span className="text-gray-300 text-sm w-4 select-none font-bold">{idx + 1}</span>
                                    <span className="text-brand-dark font-medium group-hover:text-brand-green transition-colors uppercase tracking-tight break-words">{step}</span>
                                </div>
                            ))}
                                {(result.trace?.payload.toolCalls || []).map((call, idx) => (
                                    <div key={`call-${idx}`} className="flex space-x-6 py-4 border-b border-brand-dark/5 last:border-0 items-start group">
                                        <span className="text-brand-green/30 text-sm w-4 select-none font-black pt-1">#</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center space-x-3 mb-1">
                                                <span className="text-brand-green font-black uppercase text-sm tracking-widest">{call.name}</span>
                                                <span className="px-2 py-0.5 bg-gray-100 rounded text-sm text-gray-400 font-bold">{call.startedAt.split('T')[1].split('.')[0]}</span>
                                            </div>
                                            <p className="text-gray-500 text-sm italic leading-relaxed break-all">
                                                Captured Input: {JSON.stringify(call.input).substring(0, 100)}...
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div className="mt-8 pt-8 border-t border-brand-dark/5 text-sm text-gray-400 flex flex-col md:flex-row justify-between items-center gap-4">
                                    <span className="italic font-medium break-words text-center md:text-left">SlotScribe Verifiable Trace Engine v1.0.4 - Deterministic Audit Mode</span>
                                    <button
                                        onClick={downloadTraceJson}
                                        disabled={!result.trace}
                                        className="flex items-center space-x-2 px-4 py-2 bg-brand-dark text-white rounded-xl hover:bg-black transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <span>Download Trace JSON</span>
                                        <ExternalLink className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Reproduction Steps */}
            <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-2xl shadow-brand-green/5">
                <div className="px-10 py-6 border-b border-white/20 bg-white/30 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-[0.3em]">Independent Audit</h2>
                    <span className="text-sm font-black text-white bg-brand-dark px-3 py-1 rounded-full uppercase tracking-widest">CLI v1.2</span>
                </div>
                <div className="p-10">
                    <div className="relative group">
                        <div className="p-6 pr-16 bg-brand-dark rounded-2xl font-mono text-sm text-brand-green overflow-x-auto border border-white/5 shadow-2xl">
                            <span className="text-brand-green/40 mr-2">$</span> pnpm verify {signature !== 'unverified' ? `--sig ${signature}` : `--hash ${searchParams.get('hash')}`} --cluster {searchParams.get('cluster') || 'mainnet-beta'}
                        </div>
                        <button
                            onClick={() => copyToClipboard(`pnpm verify ${signature !== 'unverified' ? `--sig ${signature}` : `--hash ${searchParams.get('hash')}`} --cluster ${searchParams.get('cluster') || 'mainnet-beta'}`)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-brand-green text-white rounded-xl transition-all opacity-0 group-hover:opacity-100 shadow-xl active:scale-90"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="mt-6 text-center text-sm text-gray-400 font-bold uppercase tracking-widest">
                        Run the command above to independently verify this proof using the SlotScribe CLI.
                    </p>
                </div>
            </div>

            {/* Footer / Meta */}
            <div className="mt-20 text-center pb-20">
                <div className="flex justify-center mb-6">
                    <div className="w-10 h-1 border-t-2 border-brand-green/20"></div>
                </div>
                <p className="text-sm font-black tracking-[0.2em] md:tracking-[0.4em] uppercase text-brand-dark/30 mb-2 break-words">SlotScribe Cryptographical Truth Engine</p>
                <p className="text-sm font-medium text-gray-400 break-words">Securely anchored on {result.trace?.createdAt || new Date().toISOString()}</p>
            </div>
        </div>
    );
}

export default function ReportPage({ params }: { params: Promise<{ sig: string }> }) {
    const { sig } = use(params);
    return (
        <Suspense fallback={
            <div className="min-h-[600px] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-brand-green/20 border-t-brand-green rounded-full animate-spin"></div>
            </div>
        }>
            <ReportContent signature={sig} />
        </Suspense>
    );
}
