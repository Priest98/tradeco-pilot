"""API Router - v1"""

from fastapi import APIRouter
from app.api.v1.endpoints import (
    strategies,
    backtests,
    signals,
    market_data,
    knowledge,
)

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(
    strategies.router,
    prefix="/strategies",
    tags=["strategies"]
)

api_router.include_router(
    backtests.router,
    prefix="/backtests",
    tags=["backtests"]
)

api_router.include_router(
    signals.router,
    prefix="/signals",
    tags=["signals"]
)

api_router.include_router(
    market_data.router,
    prefix="/market-data",
    tags=["market-data"]
)

api_router.include_router(
    knowledge.router,
    prefix="/knowledge",
    tags=["knowledge"]
)
