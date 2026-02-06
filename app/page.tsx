'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Activity, Globe, Hash, ArrowUpRight } from 'lucide-react';

export default function HomePage() {
    return (
        <div className="flex flex-col gap-24">
            {/* Hero Section */}
            <section className="relative flex flex-col lg:flex-row items-center justify-between gap-16 pt-12">
                <div className="flex-1 max-w-3xl">
                    <h2 className="text-5xl md:text-6xl font-black text-brand-dark leading-[1.1] mb-8 tracking-tight">
                        Verifiable Execution Receipts for Solana <span className="text-brand-green">AI Agents</span>
                    </h2>
                    <div className="flex flex-col gap-8">
                        <div className="flex flex-wrap gap-4">
                            <Link
                                href="/verify"
                                className="inline-flex items-center justify-center px-10 py-5 bg-brand-green hover:bg-brand-green-dark text-white font-black rounded-2xl transition-all shadow-xl hover:shadow-2xl active:scale-[0.98] w-fit text-xl uppercase tracking-widest"
                            >
                                Verify Transaction
                            </Link>
                            <Link
                                href="/docs?section=quickstart"
                                className="inline-flex items-center justify-center px-10 py-5 bg-white border-2 border-brand-dark/10 hover:border-brand-green/30 text-brand-dark font-black rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98] w-fit text-xl uppercase tracking-widest"
                            >
                                Get Started
                            </Link>
                        </div>

                        <div className="flex flex-col gap-2">
                            <h3 className="text-xl font-bold text-brand-dark">Audit Infrastructure</h3>
                            <p className="text-gray-500 font-medium">The missing trust layer for autonomous agents.</p>
                        </div>
                    </div>
                </div>

                {/* Hero Illustration */}
                <div className="flex-1 relative w-full max-w-xl">
                    <div className="relative bg-white/50 backdrop-blur-md border border-gray-200 rounded-2xl shadow-xl p-6 font-mono text-sm overflow-hidden">
                        <div className="flex flex-col gap-2 text-gray-400">
                            <div className="flex gap-4">
                                <span>1 |</span>
                                <span className="text-brand-dark">{'>'} solana transaction --id 5A7C9...B3fD4</span>
                            </div>
                            <div className="flex gap-4">
                                <span>2 |</span>
                                <span className="text-brand-dark">{'>'} agent_execute()</span>
                            </div>
                            <div className="flex gap-4">
                                <span>3 |</span>
                                <span className="text-brand-dark">{'>'} proof: {'{'} HASH_6f2d...9e4c {'}'}</span>
                            </div>
                            <div className="flex gap-4">
                                <span>4 |</span>
                                <span className="text-brand-green font-bold">{'>'} status: VERIFIED</span>
                            </div>
                        </div>

                        {/* Status Card Pop-out */}
                        <div className="absolute -bottom-4 -right-4 bg-white border border-gray-100 rounded-xl shadow-2xl p-4 flex items-center gap-4 min-w-[240px] transform rotate-[-2deg]">
                            <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center overflow-hidden">
                                <span className="text-white text-[10px] font-black tracking-tighter">SOLANA</span>
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-black text-brand-dark mb-1 leading-none tracking-tight">5A7C9...B3fD4</div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-gray-400 font-black uppercase tracking-wider">INTELLIGENT AGENT</span>
                                    <span className="text-sm font-black text-brand-dark">0.05 SOL</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Live Feed Section */}
            <LiveTraceFeed />

            {/* Features Section */}
            <section id="features" className="grid md:grid-cols-3 gap-6">
                <FeatureCard
                    icon={<CheckIcon />}
                    title="Receipt Integrity"
                    desc="Cryptographically secure proof of every agent execution and transaction, immutable on the blockchain."
                />
                <FeatureCard
                    icon={<ClockIcon />}
                    title="Audit Timeline"
                    desc="Traceable history of actions with precise timestamps and verifiable sequence of events."
                />
                <FeatureCard
                    icon={<LockIcon />}
                    title="Programmable Trust Gate"
                    desc="Define and enforce custom execution conditions and verification logic for AI operations."
                />
            </section>

            {/* How it Works Section */}
            <section id="how-it-works" className="flex flex-col gap-12">
                <div className="flex flex-col gap-2">
                    <h3 className="text-3xl font-black text-brand-dark tracking-tight">How it Works</h3>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Four step Flow</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
                    <StepCard
                        number="1"
                        title="Agent Executes"
                        desc="AI Agent performs an action on the Solana network."
                        icon={<ActivityIcon />}
                    />
                    <StepCard
                        number="2"
                        title="Receipt Generated"
                        desc="SlotScribe captures execution details and generates a verifiable proof."
                        icon={<FileTextIcon />}
                    />
                    <StepCard
                        number="3"
                        title="Blockchain Anchoring"
                        desc="The proof is anchored to the Solana blockchain for immutability."
                        icon={<DatabaseIcon />}
                    />
                    <StepCard
                        number="4"
                        title="Verification & Audit"
                        desc="Users can instantly verify the execution integrity and timeline."
                        icon={<ShieldCheckIcon />}
                    />
                </div>
            </section>

            {/* For Developers Section */}
            <section id="docs" className="flex flex-col gap-12 bg-white/40 backdrop-blur-sm border border-gray-200 rounded-3xl p-8 md:p-12">
                <div className="flex flex-col gap-2">
                    <h3 className="text-3xl font-black text-brand-dark tracking-tight">For Developers</h3>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Developer-Friendly Integration</p>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="bg-[#EFEFE9] rounded-2xl p-6 md:p-8 font-mono text-sm relative border border-brand-green/30 group">
                        <pre className="text-brand-dark leading-relaxed overflow-x-auto">
                            {`// Import SlotScribe SDK
import { SlotScribeRecorder } from 'slotscribe';

// Initialize recorder for a swap intent
const recorder = new SlotScribeRecorder({ 
  intent: "Swap 1.5 SOL for USDC",
  cluster: "mainnet-beta" 
});

// Finalize and get the hash to anchor on-chain
const payloadHash = recorder.finalizePayloadHash();
console.log('Trace Hash:', payloadHash);`}
                        </pre>
                        <button className="absolute top-6 right-6 bg-brand-green text-white px-6 py-2.5 rounded-xl text-sm font-black hover:bg-brand-green-dark transition-all active:scale-95 flex items-center gap-2 shadow-md">
                            <span>Copy</span>
                        </button>
                    </div>

                    <div className="flex justify-center mt-4">
                        <Link
                            href="/docs?section=quickstart"
                            className="group flex items-center gap-3 bg-brand-dark text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl"
                        >
                            Explore Full Documentation
                            <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}

function LiveTraceFeed() {
    const [traces, setTraces] = useState<any[]>([]);

    useEffect(() => {
        const fetchTraces = async () => {
            try {
                const res = await fetch('/api/trace?list=true&limit=10');
                const data = await res.json();
                if (data.success) {
                    setTraces(data.traces);
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchTraces();
    }, []);

    if (traces.length === 0) return null;

    // Duplicate items to make seamless marquee animation
    const feedItems = [...traces, ...traces, ...traces];

    return (
        <section className="relative -mx-4 md:-mx-12 overflow-hidden py-12">
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-brand-beige to-transparent z-10 pointer-events-none"></div>
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-brand-beige to-transparent z-10 pointer-events-none"></div>

            <div className="flex items-center gap-2 px-4 md:px-12 mb-6">
                <div className="w-2 h-2 bg-brand-green rounded-full animate-pulse"></div>
                <span className="text-xs font-black text-brand-green uppercase tracking-[0.3em]">Live Verified Stream</span>
            </div>

            <div className="flex animate-marquee gap-6 whitespace-nowrap">
                {feedItems.map((trace, i) => (
                    <Link
                        key={`${trace.hash}-${i}`}
                        href={trace.signature ? `/report/${trace.signature}?cluster=${trace.cluster}` : `/verify?hash=${trace.hash}&cluster=${trace.cluster}`}
                        className="flex-shrink-0 bg-white/60 backdrop-blur-sm border border-white/40 px-8 py-5 rounded-2xl shadow-lg hover:bg-white transition-all hover:-translate-y-1 hover:shadow-xl group min-w-[300px]"
                    >
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Globe className="w-3 h-3" /> {trace.cluster}
                                </span>
                                <ArrowUpRight className="w-4 h-4 text-brand-green opacity-0 group-hover:opacity-100 transition-all" />
                            </div>
                            <div className="text-base font-black text-brand-dark group-hover:text-brand-green transition-colors truncate">
                                {trace.intent}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
                                <Hash className="w-3 h-3" /> {trace.hash.slice(0, 8)}...{trace.hash.slice(-4)}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">
            <div className="w-12 h-12 flex items-center justify-center text-brand-dark italic bg-gray-50 rounded-xl">
                {icon}
            </div>
            <h4 className="text-xl font-bold text-brand-dark">{title}</h4>
            <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
        </div>
    );
}

function StepCard({ number, title, desc, icon }: { number: string, title: string, desc: string, icon: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-6 relative p-8 border-2 border-brand-dark/10 rounded-2xl group hover:border-brand-green/30 transition-all hover:bg-white/40">
            <div className="text-lg font-bold text-brand-dark group-hover:text-brand-green transition-colors">
                {number}. {title}
            </div>
            <div className="w-16 h-16 bg-white border border-gray-100 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:shadow-md transition-all text-brand-dark group-hover:text-brand-green">
                {icon}
            </div>
            <p className="text-sm text-gray-500 italic leading-relaxed">
                "{desc}"
            </p>
        </div>
    );
}

// Icons
function CheckIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
    );
}

function ClockIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clock"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
    );
}

function LockIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lock"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
    );
}

function ActivityIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-activity"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
    );
}

function FileTextIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></svg>
    );
}

function DatabaseIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-database"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5V19A9 3 0 0 0 21 19V5" /><path d="M3 12A9 3 0 0 0 21 12" /></svg>
    );
}

function ShieldCheckIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shield-check"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></svg>
    );
}



