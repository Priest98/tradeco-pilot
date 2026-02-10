import React, { useState } from 'react';
import axios from 'axios';
import { StrategyResponse } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface StrategyFormProps {
    onSuccess?: (strategy: StrategyResponse) => void;
}

const StrategyForm: React.FC<StrategyFormProps> = ({ onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        rules: JSON.stringify([
            {
                "type": "technical",
                "condition": "rsi_oversold",
                "parameters": { "threshold": 30 }
            }
        ], null, 2),
        risk_management: JSON.stringify({
            "stop_loss_pips": 20,
            "take_profit_pips": 40
        }, null, 2)
    });

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            // Parse JSON fields
            const rules = JSON.parse(formData.rules);
            const risk_management = JSON.parse(formData.risk_management);

            const payload = {
                name: formData.name,
                description: formData.description,
                strategy_type: 'json',
                config: {
                    rules,
                    risk_management
                },
                executable_code: ""
            };

            const response = await axios.post(`${API_URL}/strategies`, payload);
            if (response.status === 201) {
                // Reset form
                setFormData({
                    name: '',
                    description: '',
                    rules: JSON.stringify([
                        { "type": "technical", "condition": "rsi_oversold", "parameters": { "threshold": 30 } }
                    ], null, 2),
                    risk_management: JSON.stringify({
                        "stop_loss_pips": 20,
                        "take_profit_pips": 40
                    }, null, 2)
                });
                if (onSuccess) onSuccess(response.data);
            }
        } catch (err: any) {
            console.error("Error creating strategy:", err);
            setError(err.response?.data?.detail || err.message || "Failed to create strategy");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white/5 border border-white/10 p-6 rounded-xl backdrop-blur-md">
            <div>
                <h3 className="text-lg font-bold text-white mb-4">Create New Strategy</h3>
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-sm">
                        {error}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Strategy Name</label>
                    <input
                        type="text"
                        required
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. RSI Momentum Scalper"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                    <textarea
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 h-20"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Describe your strategy logic..."
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Rules (JSON)</label>
                        <textarea
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-green-400 font-mono text-xs focus:outline-none focus:border-blue-500 h-40"
                            value={formData.rules}
                            onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                        />
                        <p className="text-xs text-gray-500 mt-1">Define entry conditions like price action or indicators.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Risk Management (JSON)</label>
                        <textarea
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-green-400 font-mono text-xs focus:outline-none focus:border-blue-500 h-40"
                            value={formData.risk_management}
                            onChange={(e) => setFormData({ ...formData, risk_management: e.target.value })}
                        />
                        <p className="text-xs text-gray-500 mt-1">Set SL/TP and position sizing parameters.</p>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button
                    type="submit"
                    disabled={submitting}
                    className={`px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {submitting ? 'Creating...' : 'Create Strategy'}
                </button>
            </div>
        </form>
    );
};

export default StrategyForm;
