"""Bayesian Probability Engine"""

import numpy as np
from typing import Dict, Any
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


class BayesianProbability:
    """Bayesian probability calculator for signal confidence"""
    
    @staticmethod
    def calculate_posterior_probability(
        prior_win_rate: float,
        current_conditions: Dict[str, Any],
        historical_performance: Dict[str, Any]
    ) -> float:
        """
        Calculate posterior probability using Bayes' theorem.
        
        P(Success|Conditions) = P(Conditions|Success) × P(Success) / P(Conditions)
        
        Args:
            prior_win_rate: Historical win rate (0-100)
            current_conditions: Current market conditions
            historical_performance: Historical performance in similar conditions
        
        Returns:
            Posterior probability (0-100)
        """
        try:
            # Prior probability (base win rate)
            p_success = prior_win_rate / 100.0
            
            # Likelihood: probability of these conditions given success
            p_conditions_given_success = BayesianProbability._calculate_likelihood(
                current_conditions,
                historical_performance,
                outcome="success"
            )
            
            # Probability of these conditions given failure
            p_conditions_given_failure = BayesianProbability._calculate_likelihood(
                current_conditions,
                historical_performance,
                outcome="failure"
            )
            
            # Marginal probability of conditions
            p_conditions = (
                p_conditions_given_success * p_success +
                p_conditions_given_failure * (1 - p_success)
            )
            
            # Avoid division by zero
            if p_conditions == 0:
                return prior_win_rate
            
            # Bayes' theorem
            p_success_given_conditions = (
                p_conditions_given_success * p_success / p_conditions
            )
            
            # Convert to percentage
            posterior = p_success_given_conditions * 100.0
            
            # Clamp to valid range
            return max(0.0, min(100.0, posterior))
            
        except Exception as e:
            logger.error(f"Bayesian calculation error: {e}")
            return prior_win_rate  # Fallback to prior
    
    @staticmethod
    def _calculate_likelihood(
        current_conditions: Dict[str, Any],
        historical_performance: Dict[str, Any],
        outcome: str
    ) -> float:
        """
        Calculate likelihood of conditions given outcome.
        
        Uses regime compatibility and other factors.
        """
        # Get regime from conditions
        regime = current_conditions.get("regime", "unknown")
        
        # Get historical success rate in this regime
        regime_stats = historical_performance.get(f"{regime}_{outcome}_rate", 0.5)
        
        # Baseline likelihood
        likelihood = regime_stats
        
        # Adjust for volatility match
        volatility = current_conditions.get("volatility", "normal")
        optimal_volatility = historical_performance.get("optimal_volatility", "normal")
        
        if volatility == optimal_volatility:
            likelihood *= 1.2  # Boost if volatility matches
        else:
            likelihood *= 0.8  # Reduce if volatility doesn't match
        
        # Clamp to valid probability range
        return max(0.1, min(0.9, likelihood))
    
    @staticmethod
    def calculate_confidence_interval(
        win_rate: float,
        total_trades: int,
        confidence_level: float = 0.95
    ) -> tuple:
        """
        Calculate confidence interval for win rate.
        
        Args:
            win_rate: Observed win rate (0-100)
            total_trades: Number of trades in sample
            confidence_level: Confidence level (default 0.95 for 95%)
        
        Returns:
            Tuple of (lower_bound, upper_bound)
        """
        if total_trades < 10:
            # Not enough data - wide interval
            return (0.0, 100.0)
        
        # Convert to proportion
        p = win_rate / 100.0
        n = total_trades
        
        # Z-score for confidence level
        z_scores = {0.90: 1.645, 0.95: 1.96, 0.99: 2.576}
        z = z_scores.get(confidence_level, 1.96)
        
        # Standard error
        se = np.sqrt((p * (1 - p)) / n)
        
        # Confidence interval
        lower = max(0.0, p - z * se)
        upper = min(1.0, p + z * se)
        
        return (lower * 100.0, upper * 100.0)


# Export instance
bayesian_engine = BayesianProbability()
