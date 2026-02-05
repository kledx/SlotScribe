'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    Search,
    ChevronRight,
    ChevronDown,
    Copy,
    Lightbulb,
    AlertTriangle,
    Menu,
    X,
    ExternalLink,
    FileText,
    ShieldCheck
} from 'lucide-react';

// Documentation content structure
const DOCS_NAV = [
    {
        title: 'Introduction',
        items: [
            { id: 'overview', title: 'Why SlotScribe' },
        ]
    },
    {
        title: 'Getting Started',
        items: [
            { id: 'installation', title: 'Installation' },
            { id: 'quickstart', title: 'Quickstart' },
        ]
    },
    {
        title: 'SDK Integration',
        items: [
            { id: 'sdk-usage', title: 'Basic Usage' },
            { id: 'custom-traces', title: 'Recording Steps' },
            { id: 'anchoring', title: 'On-chain Anchoring' },
        ]
    },
    {
        title: 'Core Concepts',
        items: [
            { id: 'trace-schema', title: 'Trace Schema' },
            { id: 'verification-loop', title: 'Verification Loop' },
        ]
    },
    {
        title: 'Production',
        items: [
            { id: 'production-testing', title: 'Production Testing' },
            { id: 'wallet-import', title: 'Wallet Importing' },
        ]
    }
];

export default function DocsPage() {
    const [activeId, setActiveId] = useState('overview');
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const renderContent = () => {
        switch (activeId) {
            case 'overview':
                return (
                    <div className="space-y-12">
                        <section>
                            <div className="text-sm font-bold text-brand-green uppercase tracking-widest mb-4">Introduction</div>
                            <h1 className="text-4xl md:text-5xl font-black text-brand-dark tracking-tight mb-8">
                                Why SlotScribe?
                            </h1>
                            <p className="text-lg text-gray-500 font-medium leading-relaxed mb-8">
                                As AI Agents take custody of assets and execute complex on-chain logic, **transparency is no longer optional**.
                            </p>

                            <div className="grid gap-6">
                                <div className="p-8 bg-white/50 border border-brand-dark/5 rounded-3xl shadow-sm hover:shadow-md transition-all">
                                    <h3 className="text-xl font-black text-brand-dark mb-4 group flex items-center gap-2">
                                        <div className="w-1.5 h-6 bg-brand-green rounded-full"></div>
                                        The "Black Box" Problem
                                    </h3>
                                    <p className="text-gray-500 font-medium leading-relaxed">
                                        Agent execution typically happens in off-chain environments. When an agent swaps tokens or opens a lending position, the blockchain only records the final transaction, leaving the internal reasoning and tool calls invisible.
                                    </p>
                                </div>
                                <div className="p-8 bg-brand-green/5 border border-brand-green/10 rounded-3xl shadow-sm hover:shadow-md transition-all">
                                    <h3 className="text-xl font-black text-brand-dark mb-4 group flex items-center gap-2">
                                        <div className="w-1.5 h-6 bg-brand-green rounded-full"></div>
                                        Our Solution: Trustless Auditing
                                    </h3>
                                    <p className="text-gray-500 font-medium leading-relaxed">
                                        SlotScribe turns the agent's internal state into a **verifiable commitment**. By anchoring the hash of the execution trace to the Solana blockchain via Memo, we create an immutable link between off-chain reasoning and on-chain action.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <div className="bg-brand-dark p-10 rounded-[2.5rem] text-white overflow-hidden relative group">
                            <div className="relative z-10">
                                <h3 className="text-2xl font-black mb-4">Infrastructure for the Agentic Era</h3>
                                <p className="text-white/60 font-medium max-w-xl leading-relaxed">
                                    SlotScribe is designed to be the "Flight Recorder" for the Next Billion Users—Agents. Whether you are building an autonomous fund, a social agent, or a DeFi automation tool, SlotScribe provides the verifiable proof required for institutional and retail trust.
                                </p>
                            </div>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-green/20 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
                        </div>
                    </div>
                );
            case 'quickstart':
                return (
                    <div className="space-y-12">
                        <section>
                            <div className="text-sm font-bold text-brand-green uppercase tracking-widest mb-4">Getting Started</div>
                            <h1 className="text-4xl md:text-5xl font-black text-brand-dark tracking-tight mb-8">
                                Quickstart
                            </h1>
                            <p className="text-lg text-gray-500 font-medium leading-relaxed">
                                Choose the integration pattern that best fits your agent's infrastructure.
                            </p>
                        </section>

                        <div className="grid grid-cols-1 gap-12">
                            {/* Pattern 1: Explicit Helper */}
                            <section className="space-y-6">
                                <h2 className="text-2xl font-black text-brand-dark flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-full bg-brand-green text-white text-sm flex items-center justify-center">1</span>
                                    Explicit Helper (Recommended)
                                </h2>
                                <p className="text-gray-500 font-medium">
                                    Best for most developers. Balanced between transparency and convenience.
                                </p>
                                <div className="bg-[#1E1E1E] rounded-2xl overflow-hidden border border-white/5 shadow-2xl p-6 md:p-8">
                                    <pre className="font-mono text-xs md:text-sm text-gray-300 leading-relaxed overflow-x-auto">
                                        {`const signature = await recorder.sendTransaction(
  connection, 
  transaction, 
  [payer]
);`}
                                    </pre>
                                </div>
                                <div className="flex flex-wrap gap-4 text-sm text-gray-500 font-medium">
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-brand-green/5 text-brand-green rounded-full">✅ Auto-injects Memo</span>
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-brand-green/5 text-brand-green rounded-full">✅ Auto-uploads Trace</span>
                                </div>
                            </section>

                            <hr className="border-brand-dark/5" />

                            {/* Pattern 2: Third-Party Sync */}
                            <section className="space-y-6">
                                <h2 className="text-2xl font-black text-brand-dark flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-full bg-brand-dark text-white text-sm flex items-center justify-center">2</span>
                                    Third-Party Sync (Anchor/Jupiter)
                                </h2>
                                <p className="text-gray-500 font-medium">
                                    If you use other SDKs to send transactions, use <code>syncOnChain</code> to handle the disclosure.
                                </p>
                                <div className="bg-[#1E1E1E] rounded-2xl overflow-hidden border border-white/5 shadow-2xl p-6 md:p-8">
                                    <pre className="font-mono text-xs md:text-sm text-gray-300 leading-relaxed overflow-x-auto">
                                        {`// 1. Manually add memo before sending
tx.add(buildMemoIx(\`SS1 payload=\${hash}\`));

// 2. Send via third-party SDK
const sig = await program.methods.swap().rpc();

// 3. Sync and upload (Async)
recorder.syncOnChain(sig, connection);`}
                                    </pre>
                                </div>
                            </section>

                            <hr className="border-brand-dark/5" />

                            {/* Pattern 3: Invisible Plugin */}
                            <section className="space-y-6">
                                <h2 className="text-2xl font-black text-brand-dark flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-full bg-gray-200 text-brand-dark text-sm flex items-center justify-center">3</span>
                                    Invisible Plugin (Proxy)
                                </h2>
                                <p className="text-gray-500 font-medium">
                                    Zero logic change. Just wrap your connection. Ideal for massive legacy agents.
                                </p>
                                <div className="bg-[#1E1E1E] rounded-2xl overflow-hidden border border-white/5 shadow-2xl p-6 md:p-8">
                                    <pre className="font-mono text-xs md:text-sm text-gray-300 leading-relaxed overflow-x-auto">
                                        {`const connection = withSlotScribe(new Connection(rpc), {
  cluster: 'mainnet-beta',
  autoUpload: true
});

// All subsequent calls automatically recorded
await connection.sendTransaction(tx, [payer]);`}
                                    </pre>
                                </div>
                            </section>
                        </div>
                    </div>
                );
            case 'installation':
                return (
                    <div className="space-y-12">
                        <section>
                            <div className="text-sm font-bold text-brand-green uppercase tracking-widest mb-4">Getting Started</div>
                            <h1 className="text-4xl md:text-5xl font-black text-brand-dark tracking-tight mb-8">
                                Installation
                            </h1>
                            <p className="text-lg text-gray-500 font-medium leading-relaxed">
                                Install the SlotScribe SDK in your project to start recording agent traces.
                            </p>
                        </section>

                        <section className="space-y-6">
                            <h2 className="text-2xl font-black text-brand-dark tracking-tight">Package Managers</h2>
                            <div className="flex flex-col gap-4">
                                <div className="bg-[#1E1E1E] rounded-2xl overflow-hidden border border-white/5 shadow-2xl p-6 font-mono text-sm">
                                    <div className="text-gray-500 mb-2"># Using PNPM</div>
                                    <code className="text-brand-green">$ pnpm add @slotscribe/sdk</code>
                                </div>
                                <div className="bg-[#1E1E1E] rounded-2xl overflow-hidden border border-white/5 shadow-2xl p-6 font-mono text-sm">
                                    <div className="text-gray-500 mb-2"># Using NPM</div>
                                    <code className="text-brand-green">$ npm install @slotscribe/sdk</code>
                                </div>
                                <div className="bg-[#1E1E1E] rounded-2xl overflow-hidden border border-white/5 shadow-2xl p-6 font-mono text-sm">
                                    <div className="text-gray-500 mb-2"># Using YARN</div>
                                    <code className="text-brand-green">$ yarn add @slotscribe/sdk</code>
                                </div>
                            </div>
                        </section>

                        <div className="bg-brand-dark p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center gap-8 shadow-2xl">
                            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                                <span className="text-2xl font-black text-brand-green">npx</span>
                            </div>
                            <div>
                                <h4 className="text-xl font-black mb-2">Can I use npx?</h4>
                                <p className="text-white/60 text-sm font-medium leading-relaxed">
                                    `npx` is used for **running tools**, while `npm install` is for **integrating libraries**. Since your Agent needs SlotScribe for recording runtime logic, it must be installed as a local dependency.
                                </p>
                            </div>
                        </div>

                        <div className="bg-brand-green/5 border border-brand-green/20 rounded-2xl p-6 md:p-8 flex items-start gap-4">
                            <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center text-brand-green flex-shrink-0">
                                <Lightbulb className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-black text-brand-dark mb-1 text-sm uppercase tracking-widest">[ NOTE ]</h4>
                                <p className="text-gray-500 text-sm font-medium leading-relaxed">
                                    If you are contributing to the SlotScribe core repo, use local imports from <code className="bg-brand-beige px-1 rounded">src/slotscribe</code>.
                                </p>
                            </div>
                        </div>
                    </div>
                );
            case 'sdk-usage':
                return (
                    <div className="space-y-12">
                        <section>
                            <div className="text-sm font-bold text-brand-green uppercase tracking-widest mb-4">SDK Integration</div>
                            <h1 className="text-4xl md:text-5xl font-black text-brand-dark tracking-tight mb-8">
                                Basic Usage
                            </h1>
                            <p className="text-lg text-gray-500 font-medium leading-relaxed mb-6">
                                The SDK facilitates recording agent intent and state commitments without complicating your existing logic.
                            </p>
                        </section>

                        <section className="space-y-6">
                            <div className="bg-[#1E1E1E] rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
                                <pre className="p-8 font-mono text-xs md:text-sm leading-relaxed text-gray-300 overflow-x-auto">
                                    <code>
                                        {`import { SlotScribeRecorder } from '@slotscribe/sdk';

// 1. Initialize recorder for an intent
// cluster: "devnet" | "mainnet-beta"
const recorder = new SlotScribeRecorder({ 
  intent: "Swap 1.5 SOL for USDC",
  cluster: "devnet" // Mandatory: affects hash integrity
});

// 2. Optional: record high-level plan steps
recorder.addPlanSteps(["check price", "execute swap"]);

// 3. Finalize payload hash (SHA-256)
const payloadHash = recorder.finalizePayloadHash();

console.log('Trace Hash:', payloadHash);`}
                                    </code>
                                </pre>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="p-6 border border-brand-dark/5 rounded-2xl bg-white/50">
                                    <h4 className="font-black text-brand-dark text-xs uppercase tracking-widest mb-2 flex items-center gap-2 text-brand-green">
                                        <span className="w-1.5 h-1.5 rounded-full bg-brand-green"></span>
                                        Cluster Normalization
                                    </h4>
                                    <p className="text-xs text-gray-500 font-medium">
                                        The SDK automatically normalizes cluster names. You can use "mainnet", "devnet", or "localnet", and it will map them to the proper Solana identifiers.
                                    </p>
                                </div>
                                <div className="p-6 border border-brand-dark/5 rounded-2xl bg-white/50">
                                    <h4 className="font-black text-brand-dark text-xs uppercase tracking-widest mb-2 flex items-center gap-2 text-gray-400">
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                                        Steps [Optional]
                                    </h4>
                                    <p className="text-xs text-gray-500 font-medium">
                                        Adding plan steps is highly recommended to improve audit quality and transparency in the report.
                                    </p>
                                </div>
                            </div>
                        </section>
                    </div>
                );
            case 'custom-traces':
                return (
                    <div className="space-y-12">
                        <section>
                            <div className="text-sm font-bold text-brand-green uppercase tracking-widest mb-4">SDK Integration</div>
                            <h1 className="text-4xl md:text-5xl font-black text-brand-dark tracking-tight mb-8">
                                Recording Steps
                            </h1>
                            <p className="text-lg text-gray-500 font-medium leading-relaxed mb-6">
                                To provide high-fidelity audits, you can record specific tool calls and reasoning steps before finalizing the transaction.
                            </p>
                        </section>

                        <section className="space-y-6">
                            <div className="bg-[#1E1E1E] rounded-2xl overflow-hidden border border-white/5 shadow-2xl p-8">
                                <pre className="font-mono text-sm text-gray-300 leading-relaxed">
                                    {`// Record a sequence of tool calls
recorder.addAuditStep({
  name: "Jupiter Swap",
  status: "success",
  details: "Swapped 1.5 SOL for 210.5 USDC via Orca Whirlpool"
});

recorder.addAuditStep({
  name: "DB Log",
  status: "success",
  details: "Updated internal ledger for user_42"
});`}
                                </pre>
                            </div>

                            <div className="p-8 bg-brand-green/5 border border-brand-green/10 rounded-3xl">
                                <h3 className="text-sm font-black text-brand-dark mb-4 uppercase tracking-widest">Why record steps?</h3>
                                <p className="text-gray-500 font-medium leading-relaxed text-sm">
                                    Steps are included in the hashed payload. By recording them, you prove exactly **how** the agent arrived at a specific on-chain action, not just **that** it performed it.
                                </p>
                            </div>
                        </section>
                    </div>
                );
            case 'anchoring':
                return (
                    <div className="space-y-12">
                        <section>
                            <div className="text-sm font-bold text-brand-green uppercase tracking-widest mb-4">SDK Integration</div>
                            <h1 className="text-4xl md:text-5xl font-black text-brand-dark tracking-tight mb-8">
                                On-chain Anchoring
                            </h1>
                            <p className="text-lg text-gray-500 font-medium leading-relaxed mb-6">
                                SlotScribe anchors the trace commitment to the Solana blockchain via a Memo instruction.
                            </p>
                        </section>

                        <section className="space-y-6">
                            <h2 className="text-2xl font-black text-brand-dark tracking-tight">Adding Memo to Transaction</h2>
                            <div className="bg-[#1E1E1E] rounded-2xl overflow-hidden border border-white/5 shadow-2xl p-8">
                                <pre className="font-mono text-sm text-gray-300 leading-relaxed">
                                    {`import { buildMemoIx } from '@slotscribe/sdk';
const tx = new Transaction();
// ... add your instructions

// Add SlotScribe Memo (Single helper call)
tx.add(buildMemoIx(\`SS1 payload=\${payloadHash}\`));`}
                                </pre>
                            </div>

                            <div className="bg-brand-green/5 border border-brand-green/20 rounded-2xl p-6 md:p-8 flex items-start gap-4 shadow-sm">
                                <div className="w-10 h-10 bg-brand-green/20 rounded-xl flex items-center justify-center text-brand-green flex-shrink-0">
                                    <Copy className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-black text-brand-dark mb-2 text-sm uppercase tracking-widest">[ IMPORTANT: CLOSING THE LOOP ]</h4>
                                    <p className="text-gray-500 text-sm font-medium leading-relaxed">
                                        After anchoring the hash on-chain, you **MUST** upload the JSON trace to a data store (API/S3/DB). Without the off-chain data, verifiers can see the commitment but cannot prove its contents.
                                    </p>
                                </div>
                            </div>
                        </section>
                    </div>
                );
            case 'trace-schema':
                return (
                    <div className="space-y-12">
                        <section>
                            <div className="text-sm font-bold text-brand-green uppercase tracking-widest mb-4">Core Concepts</div>
                            <h1 className="text-4xl md:text-5xl font-black text-brand-dark tracking-tight mb-8">
                                Trace Schema
                            </h1>
                            <p className="text-lg text-gray-500 font-medium leading-relaxed mb-6">
                                All traces are stored in a standard JSON format to ensure high-fidelity audits.
                            </p>
                        </section>

                        <section className="space-y-6">
                            <div className="bg-white/50 border border-brand-dark/5 rounded-2xl p-8 font-mono text-sm space-y-4">
                                <div className="flex justify-between border-b border-brand-dark/5 pb-2">
                                    <span className="text-brand-green font-black">intent</span>
                                    <span className="text-gray-400">string</span>
                                </div>
                                <div className="flex justify-between border-b border-brand-dark/5 pb-2">
                                    <span className="text-brand-green font-black">steps</span>
                                    <span className="text-gray-400">AuditStep[]</span>
                                </div>
                                <div className="flex justify-between border-b border-brand-dark/5 pb-2">
                                    <span className="text-brand-green font-black">txSummary</span>
                                    <span className="text-gray-400">TxSummary</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-brand-green font-black">onChain</span>
                                    <span className="text-gray-400">OnChainReference</span>
                                </div>
                            </div>
                        </section>
                    </div>
                );
            case 'verification-loop':
                return (
                    <div className="space-y-12">
                        <section>
                            <div className="text-sm font-bold text-brand-green uppercase tracking-widest mb-4">Core Concepts</div>
                            <h1 className="text-4xl md:text-5xl font-black text-brand-dark tracking-tight mb-8">
                                Verification Loop
                            </h1>
                            <p className="text-lg text-gray-500 font-medium leading-relaxed mb-6">
                                SlotScribe relies on a "Commit-Reveal-Verify" pattern to ensure agent integrity.
                            </p>
                        </section>

                        <div className="grid gap-4">
                            {[
                                { title: "1. Commit", desc: "Agent produces a SHA-256 hash of its execution trace and signs it into a Solana transaction Memo." },
                                { title: "2. Reveal", desc: "The full JSON trace is uploaded to SlotScribe's verifiable storage layer (R2/S3)." },
                                { title: "3. Verify", desc: "A verifier fetches the on-chain Memo, re-hashes the uploaded JSON, and checks for a 100% match." }
                            ].map(step => (
                                <div key={step.title} className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                    <h4 className="font-black text-brand-dark mb-2">{step.title}</h4>
                                    <p className="text-sm text-gray-500 font-medium leading-relaxed">{step.desc}</p>
                                </div>
                            ))}
                        </div>

                        <div className="p-8 bg-brand-dark rounded-3xl text-white">
                            <h3 className="text-xl font-black mb-4 flex items-center gap-2">
                                <ShieldCheck className="w-6 h-6 text-brand-green" />
                                Mathematical Certainty
                            </h3>
                            <p className="text-white/60 font-medium leading-relaxed text-sm">
                                Because SHA-256 is collision-resistant, even a single character change in the Agent's reasoning would produce a different hash, causing the Verification Loop to fail.
                            </p>
                        </div>
                    </div>
                );
            case 'production-testing':
                return (
                    <div className="space-y-12">
                        <section>
                            <div className="text-sm font-bold text-brand-green uppercase tracking-widest mb-4">Production</div>
                            <h1 className="text-4xl md:text-5xl font-black text-brand-dark tracking-tight mb-8">
                                Production Testing
                            </h1>
                            <p className="text-lg text-gray-500 font-medium leading-relaxed">
                                Once your agent is ready for mainnet, you need to ensure the end-to-end verification flow works with live transactions.
                            </p>
                        </section>

                        <section className="space-y-8">
                            <div className="bg-brand-dark p-8 rounded-3xl text-white">
                                <h3 className="text-xl font-black mb-4 flex items-center gap-2 text-brand-green">
                                    <ShieldCheck className="w-6 h-6" />
                                    Safe Mainnet Testing
                                </h3>
                                <p className="text-white/60 text-sm font-medium leading-relaxed mb-6">
                                    We recommend using **Self-Transfers** for mainnet testing. This anchors your trace on-chain without sending funds to third parties.
                                </p>
                                <div className="bg-white/10 p-4 rounded-xl font-mono text-xs text-brand-green">
                                    pnpm tsx scripts/test-online-production.ts --cluster mainnet-beta --on-chain
                                </div>
                            </div>

                            <div className="grid gap-6">
                                <div className="p-8 border border-brand-dark/5 rounded-3xl">
                                    <h4 className="font-black text-brand-dark mb-2 uppercase tracking-widest text-xs">Self-Transfer Mode</h4>
                                    <p className="text-sm text-gray-500">
                                        By default, our test scripts use the sender's address as the recipient if no <code>--to</code> is provided. This is the cheapest way to verify mainnet connectivity.
                                    </p>
                                </div>
                                <div className="p-8 border border-brand-dark/5 rounded-3xl">
                                    <h4 className="font-black text-brand-dark mb-2 uppercase tracking-widest text-xs">Full Visibility</h4>
                                    <p className="text-sm text-gray-500">
                                        Even a 0.0001 SOL self-transfer creates a valid Memo instruction that can be verified by the SlotScribe engine.
                                    </p>
                                </div>
                            </div>
                        </section>
                    </div>
                );
            case 'wallet-import':
                return (
                    <div className="space-y-12">
                        <section>
                            <div className="text-sm font-bold text-brand-green uppercase tracking-widest mb-4">Production</div>
                            <h1 className="text-4xl md:text-5xl font-black text-brand-dark tracking-tight mb-8">
                                Wallet Importing
                            </h1>
                            <p className="text-lg text-gray-500 font-medium leading-relaxed">
                                SlotScribe tools support multiple ways to manage your signing identity.
                            </p>
                        </section>

                        <div className="space-y-6">
                            <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-4">
                                <h4 className="font-black text-brand-dark">Environment Variable (Base58)</h4>
                                <p className="text-sm text-gray-500">Perfect for CI/CD or ephemeral cloud environments.</p>
                                <code className="block p-4 bg-brand-beige rounded-xl text-xs font-mono">
                                    SOLANA_PRIVATE_KEY="2fbS..." pnpm tsx scripts/test.ts
                                </code>
                            </div>

                            <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-4">
                                <h4 className="font-black text-brand-dark">Keypair File (JSON)</h4>
                                <p className="text-sm text-gray-500">Use your existing Solana CLI or local wallet files.</p>
                                <code className="block p-4 bg-brand-beige rounded-xl text-xs font-mono">
                                    pnpm tsx scripts/test.ts --keypair ./id.json
                                </code>
                            </div>
                        </div>

                        <div className="bg-orange-50/50 border border-orange-200 rounded-2xl p-6 md:p-8 flex items-start gap-4">
                            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 flex-shrink-0">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-black text-orange-700 mb-1 text-sm uppercase tracking-widest">[ CAUTION ]</h4>
                                <p className="text-orange-950/70 text-sm font-medium leading-relaxed">
                                    Always use a dedicated **Hot Wallet** with minimal funds for automated testing. Never import your primary seed or high-value keys.
                                </p>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-200px)] -mt-12 -mx-4 md:-mx-12 scroll-smooth">
            {/* Sidebar Navigation */}
            <aside
                suppressHydrationWarning
                className={`
                fixed inset-0 z-50 lg:relative lg:z-0 lg:block
                w-full lg:w-72 bg-brand-beige lg:bg-transparent
                border-r border-brand-dark/5 overflow-y-auto pt-24 lg:pt-12 px-6
                ${isMobileNavOpen ? 'block' : 'hidden lg:block'}
            `}>
                <div className="lg:hidden absolute top-6 right-6">
                    <button onClick={() => setIsMobileNavOpen(false)}>
                        <X className="w-8 h-8 text-brand-dark" />
                    </button>
                </div>

                <div className="mb-8 p-1 px-3 bg-white/50 backdrop-blur-sm rounded-xl border border-brand-dark/5 flex items-center gap-2 group focus-within:border-brand-green/30 transition-all">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search docs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 text-sm py-2 font-medium"
                        suppressHydrationWarning
                    />
                </div>

                <nav className="flex flex-col gap-8 pb-12">
                    {DOCS_NAV.map((section) => (
                        <div key={section.title} className="flex flex-col gap-3">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 px-3">
                                {section.title}
                            </h3>
                            <div className="flex flex-col gap-1">
                                {section.items.map((item) => (
                                    <button
                                        key={item.id}
                                        suppressHydrationWarning
                                        onClick={() => {
                                            setActiveId(item.id);
                                            setIsMobileNavOpen(false);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className={`
                                            flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all
                                            ${activeId === item.id
                                                ? 'bg-white shadow-sm text-brand-green border border-brand-dark/5'
                                                : 'text-gray-500 hover:text-brand-dark hover:bg-white/50'}
                                        `}
                                    >
                                        {item.title}
                                        {activeId === item.id && <ChevronRight className="w-4 h-4" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>
            </aside>

            {/* Mobile Header */}
            <div className="lg:hidden flex items-center justify-between px-6 py-4 bg-white/50 backdrop-blur-md sticky top-0 z-40 border-b border-brand-dark/5">
                <button
                    suppressHydrationWarning
                    onClick={() => setIsMobileNavOpen(true)}
                    className="flex items-center gap-2 text-brand-dark font-bold"
                >
                    <Menu className="w-6 h-6" />
                    Docs Menu
                </button>
                <div className="text-brand-green font-black">SlotScribe</div>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 px-6 md:px-12 lg:px-20 py-12 max-w-4xl bg-white/30 backdrop-blur-[2px]">
                {renderContent()}
            </main>

            {/* Right TOC Sidebar */}
            <aside className="hidden xl:block w-64 pt-24 px-8 border-l border-brand-dark/5">
                <div className="sticky top-24">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-6">On this page</h4>
                    <nav className="flex flex-col gap-4 border-l-2 border-brand-dark/5">
                        <a href="#overview" className="pl-4 text-sm font-bold text-brand-green border-l-2 border-brand-green -ml-[2px] transition-all">Overview</a>
                        <a href="#basic" className="pl-4 text-sm font-bold text-gray-400 hover:text-brand-dark transition-all">Basic Integration</a>
                        <a href="#advanced" className="pl-4 text-sm font-bold text-gray-400 hover:text-brand-dark transition-all">Advanced Configuration</a>
                        <a href="#troubleshooting" className="pl-4 text-sm font-bold text-gray-400 hover:text-brand-dark transition-all">Troubleshooting</a>
                    </nav>

                    <div className="mt-12 p-6 bg-brand-green rounded-2xl text-white shadow-xl shadow-brand-green/20">
                        <h5 className="font-black text-sm mb-2 uppercase tracking-widest">Need help?</h5>
                        <p className="text-xs font-medium text-white/80 mb-4 pb-4 border-b border-white/20 leading-relaxed">Our support team is always ready to help you.</p>
                        <Link href="mailto:support@slotscribe.xyz" className="text-xs font-black flex items-center gap-2 hover:translate-x-1 transition-transform">
                            Contact Support <ExternalLink className="w-3 h-3" />
                        </Link>
                    </div>
                </div>
            </aside>
        </div>
    );
}
