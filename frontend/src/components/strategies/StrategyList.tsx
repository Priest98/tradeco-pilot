import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { StrategyResponse } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const StrategyList = () => {
    const [strategies, setStrategies] = useState<StrategyResponse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStrategies = async () => {
            try {
                const response = await axios.get(`${API_URL}/strategies`);
                setStrategies(response.data);
            } catch (error) {
                console.error("Error fetching strategies:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStrategies();
    }, []);

    if (loading) return <div className="text-white">Loading strategies...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {strategies.map((strategy) => (
                <div key={strategy.id} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-blue-500/50 transition-all backdrop-blur-md">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-white">{strategy.name}</h3>
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            {strategy.type}
                        </span>
                    </div>
                    <p className="text-gray-400 text-sm mb-4 h-10 overflow-hidden text-ellipsis">
                        {strategy.description || "No description provided."}
                    </p>

                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Risk/Reward</span>
                            <span className="text-gray-300">
                                {strategy.rules.risk_management?.take_profit_pips} / {strategy.rules.risk_management?.stop_loss_pips} pips
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Rules</span>
                            <span className="text-gray-300">{strategy.rules.rules?.length || 0} conditions</span>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
                        <span className="text-xs text-gray-600">
                            ID: {strategy.id.substring(0, 8)}...
                        </span>
                        <div className="flex gap-2">
                            <button className="px-3 py-1.5 text-xs text-green-400 bg-green-500/10 hover:bg-green-500/20 rounded-lg transition-colors border border-green-500/20">
                                Active
                            </button>
                        </div>
                    </div>
                </div>
            ))}

            {strategies.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500 bg-white/5 rounded-xl border border-dashed border-white/10">
                    No strategies found. Create one to get started.
                </div>
            )}
        </div>
    );
};

export default StrategyList;
