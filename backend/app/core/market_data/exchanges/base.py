from abc import ABC, abstractmethod
from typing import List, Callable, Dict, Optional
import logging

logger = logging.getLogger(__name__)

class ExchangeWebSocket(ABC):
    """
    Abstract base class for exchange WebSocket connections
    """
    
    def __init__(self, symbols: List[str], interval: str = "1m"):
        self.symbols = [s.upper() for s in symbols]
        self.interval = interval
        self.callbacks: List[Callable] = []
        self.running = False

    def on_message(self, callback: Callable):
        """Register callback for incoming market data"""
        self.callbacks.append(callback)

    async def _notify_callbacks(self, data: Dict):
        """Notify all registered callbacks with new data"""
        for callback in self.callbacks:
            try:
                await callback(data)
            except Exception as e:
                logger.error(f"Error in callback: {e}")

    @abstractmethod
    async def connect(self):
        """Connect to the exchange WebSocket"""
        pass

    @abstractmethod
    async def close(self):
        """Close the connection"""
        pass
