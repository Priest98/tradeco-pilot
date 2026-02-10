"""
JSON Strategy Parser
Parses user-uploaded strategies in JSON format
"""

import json
import logging
from typing import Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class StrategyParser:
    """
    Parses and validates strategy definitions
    Supports JSON format with rule-based logic
    """
    
    def parse_json_strategy(self, strategy_json: str) -> Dict:
        """
        Parse JSON strategy definition
        
        Example JSON format:
        {
            "name": "Liquidity Sweep Strategy",
            "rules": [
                {
                    "type": "price_action",
                    "condition": "liquidity_sweep",
                    "parameters": {"lookback": 20}
                },
                {
                    "type": "technical",
                    "condition": "fair_value_gap",
                    "parameters": {"min_size": 0.0010}
                },
                {
                    "type": "session",
                    "condition": "london_session"
                }
            ],
            "entry": {
                "type": "limit",
                "offset_pips": 5
            },
            "risk_management": {
                "stop_loss_pips": 15,
                "take_profit_pips": 40,
                "risk_reward_ratio": 2.5
            }
        }
        """
        try:
            strategy = json.loads(strategy_json)
            
            # Validate required fields
            required_fields = ['name', 'rules']
            for field in required_fields:
                if field not in strategy:
                    raise ValueError(f"Missing required field: {field}")
            
            # Validate rules
            if not isinstance(strategy['rules'], list) or len(strategy['rules']) == 0:
                raise ValueError("Strategy must have at least one rule")
            
            logger.info(f"✅ Parsed strategy: {strategy['name']} with {len(strategy['rules'])} rules")
            
            return {
                'name': strategy['name'],
                'rules': strategy['rules'],
                'entry': strategy.get('entry', {}),
                'risk_management': strategy.get('risk_management', {}),
                'parsed_at': datetime.utcnow().isoformat(),
                'valid': True
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON: {e}")
            return {'valid': False, 'error': f"Invalid JSON: {str(e)}"}
        except ValueError as e:
            logger.error(f"Strategy validation error: {e}")
            return {'valid': False, 'error': str(e)}

    def parse_pine_strategy(self, pine_script: str) -> Dict:
        """
        Parse Pine Script strategy (Stub)
        In production, this would use an AST to convert Pine to Python/JSON
        """
        if not pine_script or len(pine_script.strip()) == 0:
            return {'valid': False, 'error': "Empty Pine Script"}
            
        # Basic validation to check for strategy declaration
        if "strategy(" not in pine_script and "study(" not in pine_script:
             return {'valid': False, 'error': "Missing strategy() or study() declaration"}

        logger.info("⚠️ Pine Script parsing is currently a placeholder")
        
        # Return a valid structure but mark as experimental/manual
        return {
            'name': "Pine Script Strategy",
            'type': 'pine',
            'rules': [], # Placeholder
            'raw_code': pine_script,
            'parsed_at': datetime.utcnow().isoformat(),
            'valid': True
        }

    def parse_python_strategy(self, python_code: str) -> Dict:
        """
        Parse Python strategy (Stub)
        Validates structure and security constraints
        """
        if not python_code or len(python_code.strip()) == 0:
            return {'valid': False, 'error': "Empty Python Code"}
            
        # Security check: forbid dangerous imports
        forbidden = ['os', 'sys', 'subprocess', 'eval', 'exec']
        for term in forbidden:
            if f"import {term}" in python_code or f"from {term}" in python_code:
                return {'valid': False, 'error': f"Security violation: '{term}' is forbidden"}

        # Check for required class/function
        if "class Strategy" not in python_code:
             return {'valid': False, 'error': "Missing 'class Strategy' definition"}

        logger.info("✅ Validated Python strategy structure")
        
        return {
            'name': "Python Strategy",
            'type': 'python',
            'rules': [], # Placeholder
            'raw_code': python_code,
            'parsed_at': datetime.utcnow().isoformat(),
            'valid': True
        }
    
    def execute_strategy(self, strategy: Dict, market_data: Dict) -> Optional[Dict]:
        """
        Execute strategy rules against market data
        Returns signal if all conditions are met
        
        Args:
            strategy: Parsed strategy definition
            market_data: Current market data
            
        Returns:
            Signal dict if conditions met, None otherwise
        """
        if not strategy.get('valid'):
            return None
        
        # Check each rule
        rules_met = []
        for rule in strategy['rules']:
            result = self._evaluate_rule(rule, market_data)
            rules_met.append(result)
        
        # All rules must be satisfied
        if all(rules_met):
            logger.info(f"🎯 Strategy {strategy['name']}: All conditions met!")
            return self._generate_signal(strategy, market_data)
        
        return None
    
    def _evaluate_rule(self, rule: Dict, market_data: Dict) -> bool:
        """
        Evaluate a single rule
        This is simplified - in production would check actual market data
        """
        rule_type = rule.get('type')
        condition = rule.get('condition')
        
        # Placeholder logic - would implement actual checks
        if rule_type == 'price_action':
            return True  # Simulate condition met
        elif rule_type == 'technical':
            return True
        elif rule_type == 'session':
            return True
        
        return False
    
    def _generate_signal(self, strategy: Dict, market_data: Dict) -> Dict:
        """Generate trading signal from strategy"""
        risk_mgmt = strategy.get('risk_management', {})
        
        # Get current price (simplified)
        current_price = market_data.get('close', 1.0850)
        
        # Calculate entry, SL, TP based on risk management
        sl_pips = risk_mgmt.get('stop_loss_pips', 15) * 0.0001
        tp_pips = risk_mgmt.get('take_profit_pips', 40) * 0.0001
        
        # Assume BUY direction (would determine from rules)
        entry_price = current_price
        stop_loss = entry_price - sl_pips
        take_profit = entry_price + tp_pips
        
        return {
            'symbol': market_data.get('symbol', 'EURUSD'),
            'direction': 'BUY',
            'entry_price': entry_price,
            'stop_loss': stop_loss,
            'take_profit': take_profit,
            'strategy_name': strategy['name']
        }


# Global instance
strategy_parser = StrategyParser()


# Example
def example_usage():
    """Example strategy parsing"""
    strategy_json = """
    {
        "name": "London Breakout",
        "rules": [
            {"type": "price_action", "condition": "liquidity_sweep"},
            {"type": "session", "condition": "london_session"}
        ],
        "risk_management": {
            "stop_loss_pips": 20,
            "take_profit_pips": 50
        }
    }
    """
    
    parsed = strategy_parser.parse_json_strategy(strategy_json)
    print(f"Parsed: {parsed}")
    
    market_data = {'symbol': 'EURUSD', 'close': 1.0850}
    signal = strategy_parser.execute_strategy(parsed, market_data)
    print(f"Signal: {signal}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    example_usage()
