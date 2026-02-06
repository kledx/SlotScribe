import type { Metadata } from 'next';
import Link from 'next/link';
import { Github } from 'lucide-react';
import './globals.css';
import NetworkSwitcher from '../components/NetworkSwitcher';

export const metadata: Metadata = {
    title: 'SlotScribe - Agent 飞行记录器',
    description: 'Agent 黑盒 / 飞行记录器 - 在 Solana 交易中锚定 AI Agent 操作轨迹的 SHA256 哈希',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className="antialiased overflow-x-hidden">
                <div className="min-h-screen flex flex-col bg-brand-beige selection:bg-brand-green/30 relative">
                    {/* 背景装饰层 */}
                    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-green/10 blur-[120px] animate-blob"></div>
                        <div className="absolute top-[20%] right-[-10%] w-[35%] h-[35%] rounded-full bg-brand-green-dark/10 blur-[120px] animate-blob animation-delay-2000"></div>
                        <div className="absolute bottom-[-10%] left-[20%] w-[30%] h-[30%] rounded-full bg-brand-green/5 blur-[120px] animate-blob animation-delay-4000"></div>
                    </div>

                    <header className="relative z-50 w-full py-8 px-6 md:px-16">
                        <div className="max-w-[1600px] mx-auto flex flex-col gap-6 lg:flex-row lg:items-center">
                            <div className="flex items-center gap-4">
                                <Link href="/" className="flex items-center group">
                                    <span className="text-3xl font-black text-brand-dark flex items-center tracking-tighter">
                                        SlotScribe<span className="text-brand-green group-hover:animate-bounce">.</span>
                                    </span>
                                </Link>
                            </div>

                            <div className="flex flex-wrap items-center gap-6 lg:gap-8 lg:flex-1 lg:justify-end">
                                <nav className="hidden xl:flex flex-wrap items-center gap-6 text-brand-dark font-bold text-xs uppercase tracking-widest">
                                    <Link href="/" className="hover:text-brand-green transition-colors">Home</Link>
                                    <Link href="/verify" className="hover:text-brand-green transition-colors">Verify</Link>
                                    <Link href="/explorer" className="hover:text-brand-green transition-colors">Explorer</Link>
                                    <Link href="/docs?section=installation" className="hover:text-brand-green transition-colors">Docs</Link>
                                </nav>

                                <div className="flex items-center gap-3">
                                    <div className="hidden sm:flex items-center gap-2 p-1.5 bg-white/40 backdrop-blur-md border border-brand-dark/5 rounded-2xl shadow-sm">
                                        <NetworkSwitcher />
                                        <div className="w-px h-4 bg-brand-dark/10"></div>
                                        <Link
                                            href="https://github.com/kledx/SlotScribe"
                                            target="_blank"
                                            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white text-brand-dark transition-all active:scale-95"
                                            title="View on GitHub"
                                            suppressHydrationWarning
                                        >
                                            <Github className="w-5 h-5" />
                                        </Link>
                                    </div>

                                    <Link
                                        href="/docs?section=installation"
                                        className="bg-brand-dark hover:bg-black text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-brand-green/10 active:scale-95 text-[11px]"
                                    >
                                        Get Started
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </header>

                    <main className="flex-grow relative z-10 max-w-[1600px] mx-auto w-full px-4 md:px-12 py-8">
                        {children}
                    </main>

                    <footer className="relative z-10 py-12 border-t border-brand-dark/5">
                        <div className="max-w-[1600px] mx-auto px-4 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6 font-medium">
                            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6">
                                <span className="text-gray-500 text-sm">
                                    ? 2026 SlotScribe
                                </span>
                                <span className="hidden md:block w-px h-3 bg-brand-dark/10"></span>
                                <span className="text-gray-400 text-xs uppercase tracking-widest font-black">
                                    Built for Solana AI Agents
                                </span>
                            </div>
                            <div className="flex items-center gap-8 text-sm text-gray-500">
                                <Link href="/docs#privacy" className="hover:text-brand-green transition-colors">Privacy Policy</Link>
                                <Link href="/docs#terms" className="hover:text-brand-green transition-colors">Terms of Service</Link>
                                <Link href="https://x.com/SlotScribe" target="_blank" className="hover:text-brand-green transition-colors font-bold text-brand-dark">Twitter / X</Link>
                            </div>
                        </div>
                    </footer>
                </div>
            </body>
        </html>
    );
}


