"""Monte Carlo Simulation Engine"""

import numpy as np
from typing import Dict, List, Tuple
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class MonteCarloSimulator:
    """Monte Carlo simulation for strategy performance prediction"""
    
    def __init__(self, n_simulations: int = None):
        self.n_simulations = n_simulations or settings.MONTE_CARLO_SIMULATIONS
    
    def simulate_strategy_performance(
        self,
        win_rate: float,
        avg_win: float,
        avg_loss: float,
        n_trades: int = 100,
        initial_capital: float = 10000.0
    ) -> Dict[str, any]:
        """
        Run Monte Carlo simulations of strategy performance.
        
        Args:
            win_rate: Historical win rate (0-100)
            avg_win: Average winning trade return (%)
            avg_loss: Average losing trade return (%)
            n_trades: Number of trades to simulate
            initial_capital: Starting capital
        
        Returns:
            Dict with profit probabilities and distribution stats
        """
        try:
            # Convert win rate to probability
            p_win = win_rate / 100.0
            
            # Run simulations
            final_capitals = []
            
            for _ in range(self.n_simulations):
                capital = initial_capital
                
                for _ in range(n_trades):
                    # Generate random trade outcome
                    if np.random.random() < p_win:
                        # Winning trade
                        profit = capital * (avg_win / 100.0)
                    else:
                        # Losing trade
                        profit = capital * (avg_loss / 100.0)
                    
                    capital += profit
                    
                    # Check for ruin
                    if capital <= 0:
                        capital = 0
                        break
                
                final_capitals.append(capital)
            
            # Calculate statistics
            final_capitals = np.array(final_capitals)
            
            # Probability of profit
            prob_profit = np.sum(final_capitals > initial_capital) / self.n_simulations * 100
            
            # Percentiles
            percentiles = np.percentile(final_capitals, [5, 25, 50, 75, 95])
            
            # Risk of ruin
            risk_of_ruin = np.sum(final_capitals <= initial_capital * 0.5) / self.n_simulations * 100
            
            result = {
                "probability_of_profit": round(prob_profit, 2),
                "expected_final_capital": round(float(np.mean(final_capitals)), 2),
                "median_final_capital": round(float(np.median(final_capitals)), 2),
                "risk_of_ruin": round(risk_of_ruin, 2),
                "percentile_5": round(float(percentiles[0]), 2),
                "percentile_25": round(float(percentiles[1]), 2),
                "percentile_50": round(float(percentiles[2]), 2),
                "percentile_75": round(float(percentiles[3]), 2),
                "percentile_95": round(float(percentiles[4]), 2),
                "std_dev": round(float(np.std(final_capitals)), 2)
            }
            
            logger.info(f"Monte Carlo simulation completed: {prob_profit:.1f}% profit probability")
            
            return result
            
        except Exception as e:
            logger.error(f"Monte Carlo simulation error: {e}")
            return {
                "probability_of_profit": 50.0,
                "expected_final_capital": initial_capital,
                "error": str(e)
            }
    
    def simulate_single_trade_outcome(
        self,
        win_rate: float,
        risk_reward_ratio: float,
        n_simulations: int = 1000
    ) -> Tuple[float, Dict]:
        """
        Simulate outcomes for a single trade setup.
        
        Args:
            win_rate: Probability of winning (0-100)
            risk_reward_ratio: Reward/Risk ratio
            n_simulations: Number of simulations
        
        Returns:
            Tuple of (expected_value, distribution_stats)
        """
        p_win = win_rate / 100.0
        
        # Simulate outcomes
        outcomes = []
        for _ in range(n_simulations):
            if np.random.random() < p_win:
                # Win: positive return
                outcomes.append(risk_reward_ratio)
            else:
                # Loss: -1R
                outcomes.append(-1.0)
        
        outcomes = np.array(outcomes)
        
        # Expected value (in R multiples)
        expected_value = np.mean(outcomes)
        
        stats = {
            "expected_value_r": round(float(expected_value), 3),
            "probability_positive": round(np.sum(outcomes > 0) / n_simulations * 100, 2),
            "mean_outcome": round(float(np.mean(outcomes)), 3),
            "std_outcome": round(float(np.std(outcomes)), 3)
        }
        
        return expected_value, stats


# Export instance
monte_carlo_engine = MonteCarloSimulator()
