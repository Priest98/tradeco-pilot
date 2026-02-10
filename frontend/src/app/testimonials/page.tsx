
'use client';

import React from 'react';
import { Star, Quote } from 'lucide-react';

export default function TestimonialsPage() {
    const testimonials = [
        {
            id: 1,
            name: "Alex Thompson",
            role: "Portfolio Manager, Apex Capital",
            content: "The signal accuracy is unlike anything we've seen. The Gemini integration adds context that pure technical models always miss.",
            rating: 5,
            image: "https://i.pravatar.cc/150?u=alex"
        },
        {
            id: 2,
            name: "Sarah Chen",
            role: "Quantitative Analyst",
            content: "Finally, a platform that validates its signals with Bayesian probability. It's changed how I size my positions completely.",
            rating: 5,
            image: "https://i.pravatar.cc/150?u=sarah"
        },
        {
            id: 3,
            name: "Michael Ross",
            role: "Crypto Fund Lead",
            content: "The risk management features alone are worth the subscription. It saved us from the last major drawdown.",
            rating: 4,
            image: "https://i.pravatar.cc/150?u=michael"
        },
        {
            id: 4,
            name: "Elena Rodriguez",
            role: "Prop Trader",
            content: "I use the API to feed directly into my execution bot. Latency is low and the win rate has been consistent for 3 months.",
            rating: 5,
            image: "https://i.pravatar.cc/150?u=elena"
        },
        {
            id: 5,
            name: "David Kim",
            role: "Institutional Investor",
            content: "The dashboard is clean, fast, and gives me exactly what I need without the noise. Highly recommended for serious traders.",
            rating: 5,
            image: "https://i.pravatar.cc/150?u=david"
        },
        {
            id: 6,
            name: "Jessica Wu",
            role: "Hedge Fund Manager",
            content: "Quant101 has become an integral part of our daily workflow. The AI explanations are surprisingly insightful.",
            rating: 4,
            image: "https://i.pravatar.cc/150?u=jessica"
        }
    ];

    return (
        <main className="min-h-screen bg-white dark:bg-slate-950 pt-32 pb-20 px-6 transition-colors duration-300">
            <div className="container mx-auto max-w-6xl">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
                        Trusted by <span className="text-indigo-600 dark:text-indigo-400">Institutional Leaders</span>
                    </h1>
                    <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                        See what professional traders and quant funds are saying about our signal intelligence platform.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {testimonials.map((t) => (
                        <div key={t.id} className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-100 dark:hover:border-indigo-900 transition-all duration-300 group">
                            <div className="flex items-center gap-1 mb-6">
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        className={`w-5 h-5 ${i < t.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-700'}`}
                                    />
                                ))}
                            </div>

                            <Quote className="w-10 h-10 text-indigo-100 dark:text-indigo-900/30 mb-4 group-hover:text-indigo-200 dark:group-hover:text-indigo-800 transition-colors" />

                            <p className="text-slate-700 dark:text-slate-300 text-lg mb-6 leading-relaxed italic">
                                "{t.content}"
                            </p>

                            <div className="flex items-center gap-4 mt-auto">
                                <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                    {/* Placeholder avatar since external images might break without config */}
                                    <div className="w-full h-full flex items-center justify-center bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 font-bold">
                                        {t.name.charAt(0)}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white">{t.name}</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-500">{t.role}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
