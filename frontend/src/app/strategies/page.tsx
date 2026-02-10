'use client';

import React from 'react';
import StrategyList from '@/components/strategies/StrategyList';
import StrategyForm from '@/components/strategies/StrategyForm';
import { StrategyResponse } from '@/lib/types';

export default function StrategiesPage() {
    const handleStrategyCreated = (strategy: StrategyResponse) => {
        // Simple reload for now to refresh list
        // In a real app we'd update the list state
        window.location.reload();
    };

    return (
        <main className="min-h-screen bg-black text-white p-6 md:p-12">
            <div className="max-w-7xl mx-auto space-y-12">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                            Strategy Engine
                        </h1>
                        <p className="text-gray-400 mt-2">
                            Design, test, and deploy algorithmic trading strategies.
                        </p>
                    </div>
                </div>

                {/* Strategy Creation Form */}
                <section>
                    <StrategyForm onSuccess={handleStrategyCreated} />
                </section>

                {/* Strategy List */}
                <section>
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <span className="w-2 h-8 bg-blue-500 rounded-full"></span>
                        Active Strategies
                    </h2>
                    <StrategyList />
                </section>
            </div>
        </main>
    );
}
