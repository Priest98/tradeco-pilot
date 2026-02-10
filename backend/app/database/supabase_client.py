"""
Supabase Database Client
Handles all database operations using Supabase
"""

import os
import logging
from typing import Dict, List, Optional
from datetime import datetime
from supabase import create_client, Client

logger = logging.getLogger(__name__)


class SupabaseClient:
    """
    Supabase database client for TraderCopilot
    Provides methods for signal storage, retrieval, and analytics
    """
    
    def __init__(self):
        """Initialize Supabase client"""
        self.url = os.getenv('SUPABASE_URL')
        self.key = os.getenv('SUPABASE_KEY')
        self.client: Optional[Client] = None
        self.connected = False
        
        if self.url and self.key:
            try:
                self.client = create_client(self.url, self.key)
                self.connected = True
                logger.info("✅ Connected to Supabase database")
            except Exception as e:
                logger.error(f"❌ Supabase connection failed: {e}")
        else:
            logger.warning("⚠️ Supabase credentials not configured")
    
    
    # MARKET DATA
    async def get_market_data(self, symbol: str, start_date: datetime, end_date: datetime, interval: str = '1m') -> List[Dict]:
        """
        Fetch historical market data for backtesting
        """
        if not self.connected:
            return []
            
        try:
            # Query the market_data table
            # Note: TimescaleDB hypertables are queried like normal tables
            result = self.client.table('market_data')\
                .select('*')\
                .eq('symbol', symbol)\
                .gte('time', start_date.isoformat())\
                .lte('time', end_date.isoformat())\
                .order('time', desc=False)\
                .execute()
                
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Error fetching market data: {e}")
            return []

    # SIGNALS
    async def store_signal(self, signal: Dict) -> Optional[str]:
        """
        Store signal in database
        
        Args:
            signal: Signal dictionary
            
        Returns:
            Signal ID if successful
        """
        if not self.connected:
            logger.warning("Database not connected, signal not stored")
            return None
        
        try:
            result = self.client.table('signals').insert({
                'strategy_id': signal.get('strategy_id'),
                'symbol': signal['symbol'],
                'direction': signal['direction'],
                'entry_price': float(signal['entry_price']),
                'stop_loss': float(signal['stop_loss']),
                'take_profit': float(signal['take_profit']),
                'probability_score': float(signal['probability_score']),
                'signal_score': float(signal['signal_score']),
                'confidence_level': signal['confidence_level'],
                'risk_rating': signal['risk_rating'],
                'trade_explanation': signal['trade_explanation'],
                'position_sizing': float(signal['position_sizing']),
                'status': signal.get('status', 'active'),
                'created_at': signal.get('created_at', datetime.utcnow().isoformat())
            }).execute()
            
            logger.info(f"✅ Signal stored in database: {signal['symbol']}")
            return result.data[0]['id'] if result.data else None
            
        except Exception as e:
            logger.error(f"Error storing signal: {e}")
            return None
    
    async def get_signals(self, symbols: List[str] = None, min_score: float = None, 
                         min_prob: float = None, status: str = None, limit: int = 50) -> List[Dict]:
        """Get signals with filtering"""
        if not self.connected:
            return []
        
        try:
            query = self.client.table('signals').select('*')
            
            if symbols:
                query = query.in_('symbol', symbols)
            
            if min_score is not None:
                query = query.gte('signal_score', min_score)
            
            if min_prob is not None:
                query = query.gte('probability_score', min_prob)
            
            if status:
                query = query.eq('status', status)
            
            result = query.order('created_at', desc=True).limit(limit).execute()
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Error fetching signals with filters: {e}")
            return []

    async def get_active_signals(self, limit: int = 20) -> List[Dict]:
        """Get all active signals"""
        return await self.get_signals(status='active', limit=limit)
    
    async def get_signal_by_id(self, signal_id: str) -> Optional[Dict]:
        """Get specific signal by ID"""
        if not self.connected:
            return None
        
        try:
            result = self.client.table('signals')\
                .select('*')\
                .eq('id', signal_id)\
                .single()\
                .execute()
            
            return result.data
        except Exception as e:
            logger.error(f"Error fetching signal: {e}")
            return None
    
    async def update_signal_status(self, signal_id: str, status: str, **kwargs):
        """Update signal status (e.g., close, expire)"""
        if not self.connected:
            return
        
        try:
            update_data = {'status': status}
            update_data.update(kwargs)
            
            self.client.table('signals')\
                .update(update_data)\
                .eq('id', signal_id)\
                .execute()
            
            logger.info(f"Signal {signal_id} updated to {status}")
        except Exception as e:
            logger.error(f"Error updating signal: {e}")
    
    # STRATEGIES
    async def store_strategy(self, strategy: Dict) -> Optional[str]:
        """Store strategy configuration"""
        if not self.connected:
            return None
        
        try:
            result = self.client.table('strategies').insert({
                'name': strategy['name'],
                'strategy_type': strategy.get('type', 'json'),
                'config': strategy.get('rules', {}),
                'risk_management': strategy.get('risk_management', {}),
                'created_at': datetime.utcnow().isoformat()
            }).execute()
            
            return result.data[0]['id'] if result.data else None
        except Exception as e:
            logger.error(f"Error storing strategy: {e}")
            return None
    
    async def get_strategies(self) -> List[Dict]:
        """Get all strategies"""
        if not self.connected:
            return []
        
        try:
            result = self.client.table('strategies')\
                .select('*')\
                .execute()
            
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error fetching strategies: {e}")
            return []

    async def get_active_strategies(self) -> List[Dict]:
        """Get only active strategies for execution"""
        if not self.connected:
            return []
        
        try:
            result = self.client.table('strategies')\
                .select('*')\
                .eq('is_active', True)\
                .execute()
            
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error fetching active strategies: {e}")
            return []
    
    # BACKTESTS
    async def store_backtest_result(self, result: Dict) -> Optional[str]:
        """Store backtest results"""
        if not self.connected:
            return None
        
        try:
            data = self.client.table('backtest_results').insert({
                'strategy_id': result.get('strategy_id'),
                'total_trades': result['total_trades'],
                'winning_trades': result.get('winning_trades', 0),
                'losing_trades': result.get('losing_trades', 0),
                'win_rate': float(result['win_rate']),
                'profit_factor': float(result['profit_factor']),
                'sharpe_ratio': float(result['sharpe_ratio']),
                'max_drawdown': float(result['max_drawdown']),
                'total_return': float(result.get('total_return', 0)),
                'created_at': datetime.utcnow().isoformat()
            }).execute()
            
            return data.data[0]['id'] if data.data else None
        except Exception as e:
            logger.error(f"Error storing backtest: {e}")
            return None
    
    # ANALYTICS
    async def get_statistics(self) -> Dict:
        """Get system-wide statistics"""
        if not self.connected:
            return {
                'active_signals': 0,
                'total_signals': 0,
                'avg_score': 0.0,
                'avg_probability': 0.0
            }
        
        try:
            # Would use Supabase RPC or aggregation
            active = await self.get_active_signals(limit=1000)
            
            if not active:
                return {
                    'active_signals': 0,
                    'total_signals': 0,
                    'avg_score': 0.0,
                    'avg_probability': 0.0
                }
            
            avg_score = sum(s['signal_score'] for s in active) / len(active)
            avg_prob = sum(s['probability_score'] for s in active) / len(active)
            
            return {
                'active_signals': len(active),
                'avg_score': round(avg_score, 1),
                'avg_probability': round(avg_prob, 1),
                'win_rate': 68.0  # Would calculate from closed signals
            }
        except Exception as e:
            logger.error(f"Error fetching statistics: {e}")
            return {}


# Global instance
supabase_client = SupabaseClient()
