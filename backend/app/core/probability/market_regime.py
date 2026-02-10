
import numpy as np
import pandas as pd
from typing import Dict, List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class MarketRegimeDetector:
    """
    Detects current market regime (Trending, Ranging, Volatile)
    Used to adjust strategy probability scores
    """
    
    def detect_regime(self, market_data: pd.DataFrame) -> Dict:
        """
        Detect market regime from OHLCV data
        """
        if market_data.empty or len(market_data) < 20:
            return {'regime': 'unknown', 'volatility': 'unknown'}
            
        try:
            # Calculate ATR (Average True Range) for volatility
            high_low = market_data['high'] - market_data['low']
            high_close = np.abs(market_data['high'] - market_data['close'].shift())
            low_close = np.abs(market_data['low'] - market_data['close'].shift())
            tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
            atr = tr.rolling(window=14).mean().iloc[-1]
            
            # fast/slow MA for trend
            close = market_data['close']
            sma_20 = close.rolling(window=20).mean().iloc[-1]
            sma_50 = close.rolling(window=50).mean().iloc[-1]
            
            # ADX simplified (Directional Movement)
            # Real ADX is complex, using simplified trend strength here
            trend_strength = abs(sma_20 - sma_50) / sma_50 * 100
            
            regime = 'ranging'
            if trend_strength > 0.5: # 0.5% divergence
                regime = 'trending'
                
            volatility = 'normal'
            # Simple volatility classification based on recent interaction
            # In production, compare current ATR to historical average
            
            return {
                'regime': regime,
                'trend_strength': float(trend_strength),
                'volatility': volatility,
                'atr': float(atr)
            }
            
        except Exception as e:
            logger.error(f"Error detecting market regime: {e}")
            return {'regime': 'error', 'volatility': 'unknown'}

market_regime_detector = MarketRegimeDetector()
