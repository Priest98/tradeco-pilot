import React from 'react';
import Link from 'next/link';
import { ArrowRight, Bot, BarChart3, Shield, Zap } from 'lucide-react';
import { getSignals } from '@/lib/api';
import SignalCard from '@/components/SignalCard';

// Revalidate every 60 seconds
export const revalidate = 60;

export default async function LandingPage() {
    let recentSignals = [];
    try {
        recentSignals = await getSignals({ limit: 3 });
    } catch (error) {
        console.error('Failed to fetch initial signals', error);
    }

    return (
        <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-800 dark:text-white selection:bg-indigo-100 dark:selection:bg-indigo-900/30 overflow-hidden relative transition-colors duration-300">

            {/* Ambient Background Blobs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-200/40 dark:bg-indigo-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[128px] opacity-70 dark:opacity-40 animate-blob" />
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-200/40 dark:bg-emerald-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[128px] opacity-70 dark:opacity-40 animate-blob animation-delay-2000" />
                <div className="absolute bottom-[-10%] left-[20%] w-[500px] h-[500px] bg-amber-200/40 dark:bg-purple-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[128px] opacity-70 dark:opacity-40 animate-blob animation-delay-4000" />
            </div>

            {/* Grid Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0"></div>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 z-10">
                <div className="container mx-auto px-6 relative text-center">

                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 mb-8 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors animate-float">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-sm font-medium text-indigo-600 dark:text-indigo-300">New: Gemini 2.0 Integration Live</span>
                    </div>

                    {/* Headline */}
                    <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 text-slate-900 dark:text-white">
                        Institutional Grade <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-primary to-emerald-500 dark:from-indigo-400 dark:via-primary dark:to-emerald-400">
                            Quant Intelligence
                        </span>
                    </h1>

                    <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed font-light">
                        The first AI-native signal engine. Validated by Bayesian statistics,
                        powered by Monte Carlo simulations, and contextualized by Gemini.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <Link href="/signup" className="group relative px-8 py-4 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1">
                            <span className="relative z-10 flex items-center gap-2">
                                Start Trading Free <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </span>
                        </Link>

                        <Link href="/login" className="px-8 py-4 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm hover:shadow-md flex items-center gap-2">
                            <Zap className="w-5 h-5 text-amber-500" />
                            Live Demo for Institutions
                        </Link>
                    </div>

                    {/* Dashboard Preview / Signal Feed */}
                    <div className="mt-20 relative mx-auto max-w-6xl">
                        {/* Title for the feed */}
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
                                <BarChart3 className="w-6 h-6 text-emerald-500" />
                                Live Market Opportunities
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-2">Streaming real-time from our AlphaSentient V4 strategy</p>
                        </div>

                        {/* Recent Signals Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                            {recentSignals.slice(0, 3).map((signal: any) => (
                                <SignalCard key={signal.id} signal={signal} />
                            ))}

                            {recentSignals.length === 0 && (
                                <div className="col-span-3 text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-slate-500">No active signals at the moment. Market algorithms are analyzing opportunities...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Cards */}
            <section className="py-32 relative z-10 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<Bot className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />}
                            title="Gemini Context Engine"
                            description="Deep semantic analysis of market conditions using Google's Gemini 2.0 Flash model."
                            delay={0}
                            bgClass="bg-indigo-50 dark:bg-indigo-900/20"
                        />
                        <FeatureCard
                            icon={<BarChart3 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />}
                            title="Bayesian Probability"
                            description="Signals aren't guessed. They are statistically validated using historical win rates."
                            delay={100}
                            bgClass="bg-emerald-50 dark:bg-emerald-900/20"
                        />
                        <FeatureCard
                            icon={<Shield className="w-8 h-8 text-amber-600 dark:text-amber-400" />}
                            title="Risk Management"
                            description="Automated position sizing and risk-of-ruin calculations for every trade."
                            delay={200}
                            bgClass="bg-amber-50 dark:bg-amber-900/20"
                        />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-12 relative z-10">
                <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-200 dark:shadow-none">Q</div>
                        <span className="font-bold text-lg text-slate-900 dark:text-white">Quant101</span>
                    </div>
                    <div className="flex gap-6 text-sm text-slate-500 dark:text-slate-400">
                        <Link href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Privacy</Link>
                        <Link href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Terms</Link>
                        <Link href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">API</Link>
                    </div>
                    <div className="text-sm text-slate-400 dark:text-slate-500">
                        © 2026 TraderCopilot AI. All rights reserved.
                    </div>
                </div>
            </footer>
        </main>
    );
}

function FeatureCard({ icon, title, description, delay, bgClass }: { icon: any, title: string, description: string, delay: number, bgClass: string }) {
    return (
        <div className="group relative p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-indigo-100 dark:hover:border-indigo-900 hover:shadow-xl hover:shadow-indigo-900/5 dark:hover:shadow-indigo-900/20 transition-all duration-500 hover:-translate-y-2 overflow-hidden" style={{ animationDelay: `${delay}ms` }}>
            <div className={`w-14 h-14 rounded-xl ${bgClass} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}>
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{title}</h3>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                {description}
            </p>
        </div>
    )
}
