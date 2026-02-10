"""Context builder for Gemini AI analysis"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class ContextBuilder:
    """Builds comprehensive context for Gemini AI analysis"""
    
    @staticmethod
    def build_signal_context(
        strategy,
        backtest_result,
        market_data: Optional[Dict] = None,
        knowledge_items: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Build complete context for signal analysis.
        
        Args:
            strategy: Strategy model instance
            backtest_result: BacktestResult model instance
            market_data: Current market data (optional)
            knowledge_items: Relevant knowledge from vector DB
        
        Returns:
            Dict with signal_candidate, strategy_stats, market_conditions, knowledge
        """
        # Extract strategy statistics
        strategy_stats = {
            "name": strategy.name,
            "win_rate": float(backtest_result.win_rate) if backtest_result else 0.0,
            "sharpe": float(backtest_result.sharpe_ratio) if backtest_result else 0.0,
            "total_trades": backtest_result.total_trades if backtest_result else 0,
            "expectancy": float(backtest_result.expectancy) if backtest_result else 0.0,
            "profit_factor": float(backtest_result.profit_factor) if backtest_result else 0.0,
        }
        
        # Build market conditions
        market_conditions = ContextBuilder._build_market_conditions(market_data)
        
        # Format knowledge items
        relevant_knowledge = knowledge_items if knowledge_items else []
        
        return {
            "strategy_stats": strategy_stats,
            "market_conditions": market_conditions,
            "relevant_knowledge": relevant_knowledge
        }
    
    @staticmethod
    def _build_market_conditions(market_data: Optional[Dict]) -> Dict[str, Any]:
        """Extract market regime and conditions"""
        if not market_data:
            return {
                "regime": "unknown",
                "volatility": "normal",
                "session": ContextBuilder._get_current_session(),
                "recent_news": []
            }
        
        # TODO: Implement market regime detection
        # For now, return placeholder
        return {
            "regime": market_data.get("regime", "unknown"),
            "volatility": market_data.get("volatility", "normal"),
            "session": ContextBuilder._get_current_session(),
            "recent_news": market_data.get("news", [])
        }
    
    @staticmethod
    def _get_current_session() -> str:
        """Determine current trading session based on UTC time"""
        hour = datetime.utcnow().hour
        
        # Trading sessions (UTC)
        # Tokyo: 00:00 - 09:00
        # London: 08:00 - 16:00
        # New York: 13:00 - 22:00
        
        if 0 <= hour < 9:
            return "tokyo"
        elif 8 <= hour < 13:
            return "london"
        elif 13 <= hour < 22:
            return "new_york"
        else:
            return "after_hours"
    
    @staticmethod
    def format_signal_candidate(
        symbol: str,
        direction: str,
        entry: float,
        stop_loss: float,
        take_profit: float,
        probability_score: float,
        signal_score: float
    ) -> Dict[str, Any]:
        """Format signal candidate for Gemini analysis"""
        return {
            "symbol": symbol,
            "direction": direction,
            "entry": entry,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "probability_score": probability_score,
            "signal_score": signal_score,
            "risk_reward": abs((take_profit - entry) / (entry - stop_loss)) if entry != stop_loss else 0
        }


# Export singleton
context_builder = ContextBuilder()
