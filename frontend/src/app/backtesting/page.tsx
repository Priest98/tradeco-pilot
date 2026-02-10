
'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function BacktestingPage() {
    const [backtests, setBacktests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBacktests();
    }, []);

    const fetchBacktests = async () => {
        try {
            const data = await api.get('/backtests/');
            setBacktests(data);
        } catch (error) {
            console.error('Failed to fetch backtests:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-black text-white p-6 md:p-12">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500 mb-8">
                Backtesting Results
            </h1>

            {loading ? (
                <div className="text-center py-20 text-gray-500">Loading results...</div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {backtests.map((bt: any) => (
                        <div key={bt.id} className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-md hover:border-green-500/30 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-200">Strategy {bt.strategy_name || 'Unknown'}</h3>
                                    <p className="text-xs text-gray-500 font-mono">{new Date(bt.created_at).toLocaleString()}</p>
                                </div>
                                <div className={`px-3 py-1 rounded text-sm font-bold ${bt.metrics?.total_return > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                    }`}>
                                    {bt.metrics?.total_return?.toFixed(2)}%
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="text-center p-2 bg-black/30 rounded">
                                    <p className="text-xs text-gray-500">Sharpe</p>
                                    <p className="text-lg font-mono font-medium">{bt.metrics?.sharpe_ratio?.toFixed(2)}</p>
                                </div>
                                <div className="text-center p-2 bg-black/30 rounded">
                                    <p className="text-xs text-gray-500">Win Rate</p>
                                    <p className="text-lg font-mono font-medium">{bt.metrics?.win_rate?.toFixed(1)}%</p>
                                </div>
                                <div className="text-center p-2 bg-black/30 rounded">
                                    <p className="text-xs text-gray-500">Drawdown</p>
                                    <p className="text-lg font-mono font-medium text-red-400">{bt.metrics?.max_drawdown?.toFixed(2)}%</p>
                                </div>
                            </div>

                            <div className="text-xs text-gray-500 font-mono">
                                ID: {bt.id}
                            </div>
                        </div>
                    ))}

                    {backtests.length === 0 && (
                        <div className="col-span-full text-center py-20 text-gray-500 bg-white/5 rounded-xl border border-white/10 border-dashed">
                            No backtests run yet. Go to Strategies to run one.
                        </div>
                    )}
                </div>
            )}
        </main>
    );
}
