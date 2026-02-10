
import logging
import httpx
from typing import Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class WebhookManager:
    """
    Manages distribution of signals via Webhooks
    """
    
    def __init__(self):
        self.webhooks = [] # List of registered webhook URLs
        # In production, load from DB
        
    async def register_webhook(self, url: str, secret: str = None):
        """Register a new webhook endpoint"""
        self.webhooks.append({'url': url, 'secret': secret, 'active': True})
        logger.info(f"🔗 Webhook registered: {url}")
        
    async def broadcast_signal(self, signal: Dict):
        """
        Send signal to all registered webhooks
        """
        if not self.webhooks:
            return
            
        logger.info(f"🔗 Broadcasting signal to {len(self.webhooks)} webhooks")
        
        async with httpx.AsyncClient() as client:
            for webhook in self.webhooks:
                if not webhook['active']:
                    continue
                    
                try:
                    # payload = signal # Send raw signal or formatted?
                    # Using raw signal for webhooks usually best
                    await client.post(webhook['url'], json=signal, timeout=5.0)
                    logger.debug(f"Webhook sent to {webhook['url']}")
                except Exception as e:
                    logger.error(f"Failed to send webhook to {webhook.get('url')}: {e}")

webhook_manager = WebhookManager()
