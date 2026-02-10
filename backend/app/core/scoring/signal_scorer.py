"""Multi-Factor Signal Scoring Engine"""

from typing import Dict, Any
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


class SignalScorer:
    """
    Multi-factor signal scoring system.
    
    Combines multiple factors to produce a signal quality score (0-10).
    """
    
    # Default weights for scoring factors
    WEIGHTS = {
        "probability_score": 0.35,      # 35% - Direct probability
        "backtest_performance": 0.25,    # 25% - Historical performance
        "market_regime_match": 0.20,     # 20% - Regime compatibility
        "risk_reward_ratio": 0.15,       # 15% - Risk/reward
        "volatility_match": 0.05,        # 5% - Volatility compatibility
    }
    
    def __init__(self, weights: Dict[str, float] = None):
        """
        Initialize scorer with optional custom weights.
        
        Args:
            weights: Custom weights dict (must sum to 1.0)
        """
        if weights:
            total = sum(weights.values())
            if abs(total - 1.0) > 0.01:
                raise ValueError(f"Weights must sum to 1.0, got {total}")
            self.weights = weights
        else:
            self.weights = self.WEIGHTS
    
    def calculate_signal_score(
        self,
        probability_score: float,
        backtest_metrics: Dict[str, Any],
        market_regime: str,
        strategy_regime_performance: Dict[str, float],
        risk_reward_ratio: float,
        current_volatility: str,
        optimal_volatility: str
    ) -> float:
        """
        Calculate overall signal score (0-10).
        
        Args:
            probability_score: Probability score (0-100)
            backtest_metrics: Dict with win_rate, sharpe, etc.
            market_regime: Current market regime
            strategy_regime_performance: Strategy performance by regime
            risk_reward_ratio: Reward/Risk ratio
            current_volatility: Current volatility level
            optimal_volatility: Strategy's optimal volatility
        
        Returns:
            Signal score (0-10)
        """
        try:
            # Factor 1: Probability Score (normalized to 0-10)
            prob_factor = (probability_score / 100.0) * 10.0
            
            # Factor 2: Backtest Performance (normalized 0-10)
            perf_factor = self._calculate_performance_factor(backtest_metrics)
            
            # Factor 3: Market Regime Match (0-10)
            regime_factor = self._calculate_regime_factor(
                market_regime,
                strategy_regime_performance
            )
            
            # Factor 4: Risk/Reward Ratio (normalized 0-10)
            rr_factor = self._calculate_risk_reward_factor(risk_reward_ratio)
            
            # Factor 5: Volatility Match (0-10)
            vol_factor = self._calculate_volatility_factor(
                current_volatility,
                optimal_volatility
            )
            
            # Weighted sum
            score = (
                prob_factor * self.weights["probability_score"] +
                perf_factor * self.weights["backtest_performance"] +
                regime_factor * self.weights["market_regime_match"] +
                rr_factor * self.weights["risk_reward_ratio"] +
                vol_factor * self.weights["volatility_match"]
            )
            
            # Final score multiplied by 10 to get 0-10 scale
            final_score = score
            
            # Clamp to valid range
            final_score = max(0.0, min(10.0, final_score))
            
            logger.debug(
                f"Signal score calculated: {final_score:.2f} "
                f"(prob={prob_factor:.2f}, perf={perf_factor:.2f}, "
                f"regime={regime_factor:.2f}, rr={rr_factor:.2f}, vol={vol_factor:.2f})"
            )
            
            return round(final_score, 1)
            
        except Exception as e:
            logger.error(f"Signal scoring error: {e}")
            return 5.0  # Return neutral score on error
    
    def _calculate_performance_factor(self, metrics: Dict[str, Any]) -> float:
        """Calculate performance factor from backtest metrics (0-10)"""
        try:
            win_rate = float(metrics.get("win_rate", 50.0))
            sharpe = float(metrics.get("sharpe_ratio", 0.0))
            
            # Normalize win rate (50% = 5.0, 100% = 10.0)
            win_component = (win_rate / 100.0) * 10.0
            
            # Normalize Sharpe (0-3 range, where 3+ is excellent)
            sharpe_component = min(sharpe / 3.0, 1.0) * 10.0
            
            # Average the two components
            performance = (win_component + sharpe_component) / 2.0
            
            return max(0.0, min(10.0, performance))
            
        except Exception as e:
            logger.error(f"Performance factor error: {e}")
            return 5.0
    
    def _calculate_regime_factor(
        self,
        current_regime: str,
        regime_performance: Dict[str, float]
    ) -> float:
        """Calculate regime compatibility factor (0-10)"""
        try:
            # Get strategy's win rate in current regime
            regime_win_rate = regime_performance.get(current_regime, 50.0)
            
            # Normalize to 0-10 scale
            factor = (regime_win_rate / 100.0) * 10.0
            
            return max(0.0, min(10.0, factor))
            
        except Exception as e:
            logger.error(f"Regime factor error: {e}")
            return 5.0
    
    def _calculate_risk_reward_factor(self, rr_ratio: float) -> float:
        """Calculate risk/reward factor (0-10)"""
        try:
            # Risk/reward sweet spot is 2-4
            # 1:1 = 3.0
            # 2:1 = 7.0
            # 3:1 = 10.0
            # 4:1+ = 10.0
            
            if rr_ratio >= 3.0:
                return 10.0
            elif rr_ratio >= 2.0:
                return 7.0 + ((rr_ratio - 2.0) * 3.0)  # Scale 7-10
            elif rr_ratio >= 1.0:
                return 3.0 + ((rr_ratio - 1.0) * 4.0)  # Scale 3-7
            else:
                return max(0.0, rr_ratio * 3.0)  # Scale 0-3
                
        except Exception as e:
            logger.error(f"Risk/reward factor error: {e}")
            return 5.0
    
    def _calculate_volatility_factor(
        self,
        current: str,
        optimal: str
    ) -> float:
        """Calculate volatility match factor (0-10)"""
        try:
            # Perfect match = 10
            # Adjacent = 7
            # Opposite = 3
            
            volatility_scale = {
                "very_low": 1,
                "low": 2,
                "normal": 3,
                "high": 4,
                "very_high": 5
            }
            
            current_level = volatility_scale.get(current, 3)
            optimal_level = volatility_scale.get(optimal, 3)
            
            difference = abs(current_level - optimal_level)
            
            if difference == 0:
                return 10.0
            elif difference == 1:
                return 7.0
            elif difference == 2:
                return 5.0
            else:
                return 3.0
                
        except Exception as e:
            logger.error(f"Volatility factor error: {e}")
            return 5.0


# Export instance
signal_scorer = SignalScorer()
