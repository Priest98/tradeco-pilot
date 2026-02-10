
import pytest
from app.core.scoring.signal_scorer import signal_scorer

def test_signal_scoring_logic(mock_market_data, mock_strategy_stats):
    """Test multi-factor signal scoring"""
    
    score = signal_scorer.calculate_signal_score(
        probability_score=75.0,
        backtest_metrics=mock_strategy_stats,
        market_regime="trending",
        strategy_regime_performance={"trending": 70.0},
        risk_reward_ratio=2.5,
        current_volatility="normal",
        optimal_volatility="normal"
    )
    
    assert 0 <= score <= 10.0
    # High probability + good metrics should yield high score
    assert score > 6.0

def test_signal_score_filters_poor_metrics():
    """Test that poor metrics result in low score"""
    poor_stats = {
        "win_rate": 30.0,
        "sharpe_ratio": 0.5,
        "profit_factor": 0.8
    }
    
    score = signal_scorer.calculate_signal_score(
        probability_score=40.0,
        backtest_metrics=poor_stats,
        market_regime="choppy",
        strategy_regime_performance={"choppy": 30.0},
        risk_reward_ratio=1.0,
        current_volatility="high",
        optimal_volatility="low"
    )
    
    assert score < 5.0
