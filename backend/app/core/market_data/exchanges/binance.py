import asyncio
import websockets
import json
import logging
from typing import List, Dict
from datetime import datetime
from .base import ExchangeWebSocket

logger = logging.getLogger(__name__)

class BinanceWebSocket(ExchangeWebSocket):
    """
    Binance WebSocket implementation for real-time kline data
    """
    
    def __init__(self, symbols: List[str], interval: str = "1m"):
        super().__init__(symbols, interval)
        self.ws_url = "wss://stream.binance.com:9443/ws"
        self.websocket = None
        
    async def connect(self):
        """Connect to Binance WebSocket"""
        # Binance expects lowercase symbols in stream names
        streams = [f"{s.lower()}@kline_{self.interval}" for s in self.symbols]
        stream_path = "/".join(streams)
        url = f"{self.ws_url}/{stream_path}"
        
        logger.info(f"Connecting to Binance WebSocket: {url}")
        
        try:
            self.websocket = await websockets.connect(url)
            self.running = True
            logger.info("✅ Connected to Binance WebSocket")
            
            # Start listening loop
            await self._listen()
            
        except Exception as e:
            logger.error(f"Binance WebSocket connection error: {e}")
            self.running = False
            
    async def _listen(self):
        """Listen for incoming messages"""
        try:
            async for message in self.websocket:
                if not self.running:
                    break
                    
                data = json.loads(message)
                
                # Parse kline data
                if 'k' in data:
                    kline = data['k']
                    
                    candle_data = {
                        'symbol': kline['s'],
                        'timestamp': datetime.fromtimestamp(kline['t'] / 1000),
                        'open': float(kline['o']),
                        'high': float(kline['h']),
                        'low': float(kline['l']),
                        'close': float(kline['c']),
                        'volume': float(kline['v']),
                        'is_closed': kline['x'],
                        'interval': self.interval,
                        'exchange': 'BINANCE'
                    }
                    
                    await self._notify_callbacks(candle_data)
                        
        except websockets.exceptions.ConnectionClosed:
            logger.warning("Binance WebSocket connection closed")
            self.running = False
        except Exception as e:
            logger.error(f"Error in Binance WebSocket listener: {e}")
            self.running = False
            
    async def close(self):
        """Close WebSocket connection"""
        self.running = False
        if self.websocket:
            await self.websocket.close()
            logger.info("Binance WebSocket closed")
