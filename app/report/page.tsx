'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Search, FileText } from 'lucide-react';

function ReportHomeContent() {
    const [signature, setSignature] = useState('');
    const router = useRouter();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (signature.trim()) {
            router.push(`/report/${signature.trim()}`);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-20 px-6 text-center">
            <div className="mb-10 flex justify-center">
                <div className="bg-brand-green/10 p-5 rounded-3xl animate-pulse">
                    <FileText className="w-12 h-12 text-brand-green" />
                </div>
            </div>

            <h1 className="text-4xl font-black text-brand-dark mb-4 tracking-tight">Verification Reports</h1>
            <p className="text-lg text-gray-500 mb-12 font-medium">
                Enter a transaction signature to retrieve its permanent, <span className="text-brand-green">on-chain encrypted</span> audit report.
            </p>

            <form onSubmit={handleSearch} className="relative group">
                <input
                    type="text"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder="Solana Transaction Signature..."
                    className="w-full px-8 py-5 bg-white border-2 border-brand-dark/5 rounded-[2rem] text-brand-dark shadow-2xl focus:border-brand-green focus:outline-none transition-all pr-16 font-mono text-sm"
                />
                <button
                    type="submit"
                    disabled={!signature.trim()}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-brand-green text-white rounded-2xl hover:bg-brand-green-dark disabled:bg-gray-200 transition-all shadow-lg active:scale-95"
                >
                    <Search className="w-6 h-6" />
                </button>
            </form>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div className="p-6 bg-white rounded-2xl border border-gray-50 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-2">Audit Proof</h3>
                    <p className="text-sm text-gray-500">Every report serves as a cryptographically signed proof of AI agent execution.</p>
                </div>
                <div className="p-6 bg-white rounded-2xl border border-gray-50 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-2">Public Access</h3>
                    <p className="text-sm text-gray-500">Shareable reports for stakeholders to verify compliance and transparency.</p>
                </div>
            </div>
        </div>
    );
}

export default function ReportHomePage() {
    return (
        <div className="min-h-[600px]">
            <Suspense fallback={null}>
                <ReportHomeContent />
            </Suspense>
        </div>
    );
}
