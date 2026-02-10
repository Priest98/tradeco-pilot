"""
Market Data Engine
Manages connections to multiple exchanges and normalizes data streams
"""

import asyncio
import logging
from typing import Dict, Callable, Optional, List

from app.core.market_data.exchanges.binance import BinanceWebSocket
from app.core.market_data.exchanges.alpaca import AlpacaWebSocket
from app.core.market_data.exchanges.polygon import PolygonWebSocket

logger = logging.getLogger(__name__)

class MarketDataEngine:
    """
    Central engine for managing market data feeds from multiple sources
    """
    
    def __init__(self):
        self.exchanges = {}
        self.data_cache = {}
        self.subscribers = []
        self.running = False
        
    async def start(self, symbols: List[str], interval: str = "1m"):
        """
        Start engine and connect to configured exchanges
        """
        logger.info(f"🚀 Starting Market Data Engine for {len(symbols)} symbols")
        self.running = True
        
        # Determine which exchange to use based on symbol format or config
        # For now, default to Binance for crypto pairs (e.g., BTCUSDT)
        crypto_symbols = [s for s in symbols if "USDT" in s or "BTC" in s]
        stock_symbols = [s for s in symbols if s not in crypto_symbols]
        
        tasks = []
        
        if crypto_symbols:
            logger.info(f"Connecting to Binance for: {crypto_symbols}")
            self.exchanges['binance'] = BinanceWebSocket(crypto_symbols, interval)
            self.exchanges['binance'].on_message(self._handle_market_data)
            tasks.append(self.exchanges['binance'].connect())
            
        if stock_symbols:
            logger.info(f"Connecting to Alpaca for: {stock_symbols}")
            self.exchanges['alpaca'] = AlpacaWebSocket(stock_symbols, interval)
            self.exchanges['alpaca'].on_message(self._handle_market_data)
            tasks.append(self.exchanges['alpaca'].connect())
            
        if not tasks:
            logger.warning("No valid symbols or exchanges configured.")
            return

        # Run connections concurrently
        await asyncio.gather(*tasks)
        
    async def _handle_market_data(self, data: Dict):
        """
        normalize and distribute incoming data from any exchange
        """
        symbol = data['symbol']
        
        # Update cache
        self.data_cache[symbol] = data
        
        # Log significant updates (e.g. candle close)
        if data.get('is_closed'):
            logger.info(
                f"📊 {symbol} [{data.get('exchange', 'UNKNOWN')}] Closed - "
                f"C: {data['close']}"
            )
        
        # Notify subscribers
        for subscriber in self.subscribers:
            try:
                await subscriber(data)
            except Exception as e:
                logger.error(f"Error in subscriber callback: {e}")
            
    def subscribe(self, callback: Callable):
        """Subscribe to unified market data stream"""
        self.subscribers.append(callback)
        
    def get_latest(self, symbol: str) -> Optional[Dict]:
        """Get latest cached data"""
        return self.data_cache.get(symbol.upper())
        
    async def stop(self):
        """Stop all exchange connections"""
        self.running = False
        for name, exchange in self.exchanges.items():
            logger.info(f"Stopping {name} connection...")
            await exchange.close()
        logger.info("🛑 Market Data Engine stopped")


# Global instance
market_data_engine = MarketDataEngine()
