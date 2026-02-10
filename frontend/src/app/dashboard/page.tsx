
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import SignalCard from '@/components/SignalCard';
import api from '@/lib/api';

export default function Dashboard() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [signals, setSignals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user) {
            fetchSignals();
            // Connect to WebSocket here in future
        }
    }, [user]);

    const fetchSignals = async () => {
        try {
            const response = await api.get('/signals/history');
            setSignals(response.data);
        } catch (error) {
            console.error('Failed to fetch signals:', error);
            // Fallback for demo if API fails
            setSignals([
                {
                    id: '1',
                    symbol: 'BTCUSDT',
                    direction: 'BUY',
                    entry_price: 45000,
                    stop_loss: 44000,
                    take_profit: 48000,
                    probability_score: 85,
                    signal_score: 9.2,
                    confidence_level: 'High',
                    risk_rating: 'Low',
                    trade_explanation: 'Strong bullish divergence on 4H timeframe with increased volume.',
                    position_sizing: 2.5,
                    created_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + 3600000).toISOString()
                },
                {
                    id: '2',
                    symbol: 'ETHUSDT',
                    direction: 'SELL',
                    entry_price: 2800,
                    stop_loss: 2900,
                    take_profit: 2600,
                    probability_score: 72,
                    signal_score: 7.5,
                    confidence_level: 'Medium',
                    risk_rating: 'Medium',
                    trade_explanation: 'Resistance rejection at key fib level.',
                    position_sizing: 1.5,
                    created_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + 3600000).toISOString()
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || !user) {
        return (
            <main className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 pt-24 transition-colors duration-300">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Signal Feed</h1>
                        <p className="text-slate-500 dark:text-slate-400">Real-time AI generated trading signals</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">System Active</span>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {signals.map((signal) => (
                            <SignalCard key={signal.id} signal={signal} />
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
