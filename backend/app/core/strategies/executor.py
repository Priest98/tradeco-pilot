"""
Strategy Executor
Executes parsed strategies against market data
"""

import logging
from typing import Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class StrategyExecutor:
    """
    Executes strategy logic against market data.
    Evaluates rules and generates signals.
    """
    
    def __init__(self):
        pass
        
    def execute(self, strategy: Dict, market_data: Dict) -> Optional[Dict]:
        """
        Execute a strategy against current market data
        
        Args:
            strategy: Parsed strategy configuration
            market_data: Current OHLCV and technical data
            
        Returns:
            Signal dictionary (if conditions met) or None
        """
        if not strategy.get('is_active', True):
            return None
            
        config = strategy.get('config', {})
        rules = config.get('rules', [])
        
        # 1. Evaluate all rules
        if not self._evaluate_rules(rules, market_data):
            return None
            
        # 2. Generate Signal
        return self._generate_signal(strategy, market_data)

    def _evaluate_rules(self, rules: List[Dict], market_data: Dict) -> bool:
        """Evaluate list of rules - ALL must pass (AND logic)"""
        if not rules:
            return False
            
        for rule in rules:
            if not self._evaluate_single_rule(rule, market_data):
                return False
        return True

    def _evaluate_single_rule(self, rule: Dict, market_data: Dict) -> bool:
        """Evaluate a single rule based on its type"""
        rule_type = rule.get('type')
        condition = rule.get('condition')
        params = rule.get('parameters', {})
        
        # --- Price Action Rules ---
        if rule_type == 'price_action':
            if condition == 'liquidity_sweep':
                return self._check_liquidity_sweep(market_data, params)
            elif condition == 'order_block':
                 return self._check_order_block(market_data, params)
        
        # --- Technical Indicator Rules ---
        elif rule_type == 'technical':
            if condition == 'rsi_oversold':
                return self._check_rsi(market_data, params, 'oversold')
            elif condition == 'rsi_overbought':
                return self._check_rsi(market_data, params, 'overbought')
            elif condition == 'above_ema':
                return self._check_above_ema(market_data, params)
                
        # --- Session Rules ---
        elif rule_type == 'session':
            return self._check_session(market_data, condition)
            
        return False

    # --- Rule Implementations ---
    
    def _check_rsi(self, data: Dict, params: Dict, mode: str) -> bool:
        """Check RSI condition"""
        rsi = data.get('indicators', {}).get('rsi')
        if rsi is None:
            return False
            
        threshold = params.get('threshold', 30 if mode == 'oversold' else 70)
        
        if mode == 'oversold':
            return rsi < threshold
        else:
            return rsi > threshold

    def _check_above_ema(self, data: Dict, params: Dict) -> bool:
        """Check if price is above EMA"""
        price = data.get('close')
        ema = data.get('indicators', {}).get(f"ema_{params.get('period', 200)}")
        
        if price is None or ema is None:
            return False
        return price > ema

    def _check_liquidity_sweep(self, data: Dict, params: Dict) -> bool:
        """
        Check for liquidity sweep pattern
        (Price took out previous low/high and closed back inside)
        """
        # Simplified placeholder logic for now
        # In production, this would look at recent high/low structure
        return True  # TODO: Implement real sweep logic

    def _check_order_block(self, data: Dict, params: Dict) -> bool:
        """Check for order block mitigation"""
        return True  # TODO: Implement real OB logic

    def _check_session(self, data: Dict, session_name: str) -> bool:
        """Check if within trading session"""
        # Minimal session implementation
        current_hour = datetime.utcnow().hour
        
        sessions = {
            'london': (7, 16),
            'new_york': (13, 22),
            'asia': (0, 9)
        }
        
        if session_name not in sessions:
            return True
            
        start, end = sessions[session_name]
        return start <= current_hour < end

    def _generate_signal(self, strategy: Dict, market_data: Dict) -> Dict:
        """Construct the signal object"""
        symbol = market_data.get('symbol', 'UNKNOWN')
        price = market_data.get('close', 0.0)
        
        # Risk Management
        risk_config = strategy.get('config', {}).get('risk_management', {})
        sl_pips = risk_config.get('stop_loss_pips', 20)
        tp_pips = risk_config.get('take_profit_pips', 40)
        
        # Determine direction (simplified, usually comes from rules)
        # Defaulting to BUY for this basic implementation
        direction = "BUY" 
        
        pip_value = 0.0001 if 'JPY' not in symbol else 0.01
        
        if direction == "BUY":
            stop_loss = price - (sl_pips * pip_value)
            take_profit = price + (tp_pips * pip_value)
        else:
            stop_loss = price + (sl_pips * pip_value)
            take_profit = price - (tp_pips * pip_value)
            
        return {
            "strategy_id": strategy.get('id'),
            "symbol": symbol,
            "direction": direction,
            "entry_price": price,
            "stop_loss": round(stop_loss, 5),
            "take_profit": round(take_profit, 5),
            "status": "active",
            "created_at": datetime.utcnow().isoformat()
        }

# Global instance
strategy_executor = StrategyExecutor()
