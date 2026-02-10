
import pytest
import asyncio
from typing import Generator, AsyncGenerator
from httpx import AsyncClient
from app.main import app
from app.database import get_db

@pytest.fixture(scope="session")
def event_loop() -> Generator:
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="module")
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.fixture
def mock_market_data():
    return {
        "regime": "trending",
        "volatility": "normal", 
        "session": "london"
    }

@pytest.fixture
def mock_strategy_stats():
    return {
        "win_rate": 65.0,
        "sharpe_ratio": 2.1,
        "profit_factor": 1.8,
        "total_trades": 100
    }
