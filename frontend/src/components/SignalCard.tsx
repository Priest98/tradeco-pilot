
'use client'

import { Badge } from '@/components/ui/Badge'
import { TrendingUp, TrendingDown, Clock, Target, Zap } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Signal {
    id: string
    symbol: string
    direction: 'BUY' | 'SELL'
    entry_price: number
    stop_loss: number
    take_profit: number
    probability_score: number
    signal_score: number
    confidence_level: string
    risk_rating: string
    trade_explanation: string
    position_sizing: number
    created_at: string
    expires_at: string
}

export default function SignalCard({ signal }: { signal: Signal }) {
    const isBuy = signal.direction === 'BUY'
    const riskReward = Math.abs((signal.take_profit - signal.entry_price) / (signal.entry_price - signal.stop_loss))

    return (
        <div className="group bg-white dark:bg-slate-900 rounded-xl p-6 shadow-xl border border-slate-100 dark:border-slate-800 hover:shadow-2xl hover:shadow-indigo-900/5 dark:hover:shadow-indigo-900/20 transition-all duration-300 relative overflow-hidden">
            {/* Background gradient effect */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 dark:group-hover:opacity-10 transition-opacity duration-300 ${isBuy ? 'bg-gradient-to-br from-emerald-500 to-transparent' : 'bg-gradient-to-br from-red-500 to-transparent'
                }`}></div>

            {/* Content */}
            <div className="relative">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{signal.symbol}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant={isBuy ? 'success' : 'danger'} className="flex items-center gap-1">
                                {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {signal.direction}
                            </Badge>
                            <Badge variant="outline" className="text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700">
                                <Clock className="w-3 h-3 mr-1" />
                                {formatDistanceToNow(new Date(signal.created_at), { addSuffix: true })}
                            </Badge>
                        </div>
                    </div>

                    {/* Signal Score Circle */}
                    <div className="relative">
                        <svg className="w-16 h-16 transform -rotate-90">
                            <circle
                                cx="32"
                                cy="32"
                                r="28"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                                className="text-slate-100 dark:text-slate-800"
                            />
                            <circle
                                cx="32"
                                cy="32"
                                r="28"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                                strokeDasharray={`${2 * Math.PI * 28}`}
                                strokeDashoffset={`${2 * Math.PI * 28 * (1 - signal.signal_score / 10)}`}
                                className={signal.signal_score >= 8 ? 'text-emerald-500' : signal.signal_score >= 6 ? 'text-amber-500' : 'text-indigo-500'}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-lg font-bold text-slate-800 dark:text-white">{signal.signal_score.toFixed(1)}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">SCORE</span>
                        </div>
                    </div>
                </div>

                {/* Prices */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <PriceBox label="Entry" value={signal.entry_price} color="text-indigo-600 dark:text-indigo-400" />
                    <PriceBox label="Stop Loss" value={signal.stop_loss} color="text-red-500 dark:text-red-400" />
                    <PriceBox label="Take Profit" value={signal.take_profit} color="text-emerald-500 dark:text-emerald-400" />
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <MetricBox
                        icon={<Zap className="w-4 h-4" />}
                        label="Probability"
                        value={`${signal.probability_score}%`}
                        color="text-indigo-600 dark:text-indigo-400"
                    />
                    <MetricBox
                        icon={<Target className="w-4 h-4" />}
                        label="R:R Ratio"
                        value={`1:${riskReward.toFixed(1)}`}
                        color="text-amber-500 dark:text-amber-400"
                    />
                </div>

                {/* Confidence & Risk */}
                <div className="flex gap-2 mb-4">
                    <Badge variant={
                        signal.confidence_level === 'High' ? 'success' :
                            signal.confidence_level === 'Medium' ? 'warning' : 'danger'
                    }>
                        {signal.confidence_level} Confidence
                    </Badge>
                    <Badge variant="outline" className="text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                        {signal.risk_rating} Risk
                    </Badge>
                    <Badge variant="outline" className="text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                        {signal.position_sizing}% Size
                    </Badge>
                </div>

                {/* Explanation */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {signal.trade_explanation}
                    </p>
                </div>
            </div>
        </div>
    )
}

function PriceBox({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2 border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-sm font-bold ${color}`}>{value.toFixed(5)}</p>
        </div>
    )
}

function MetricBox({ icon, label, value, color }: any) {
    return (
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2">
            <div className={color}>{icon}</div>
            <div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">{label}</p>
                <p className={`text-sm font-semibold ${color}`}>{value}</p>
            </div>
        </div>
    )
}
