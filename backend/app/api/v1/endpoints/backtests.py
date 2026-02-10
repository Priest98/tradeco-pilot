"""Backtest endpoints"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID
from datetime import datetime, timedelta
import logging

from app.database import get_db, supabase_client
from app.models import BacktestResult, Strategy
from app.schemas import BacktestRequest, BacktestResponse

router = APIRouter()
logger = logging.getLogger(__name__)


async def run_backtest_task(
    backtest_id: UUID,
    strategy_id: UUID,
    request: BacktestRequest
):
    """Background task to run backtest"""
    """Background task to run backtest"""
    try:
        logger.info(f"🚀 Starting backtest {backtest_id} for strategy {strategy_id}")
        
        # 1. Fetch Strategy Config (would typically get again to ensure freshness or passed in)
        # For simplicity, we assume we have what we need, but ideally we query it
        
        # 2. Fetch Historical Data
        # Default to last 30 days for now if not specified in request
        start = request.start_date or (datetime.utcnow() - timedelta(days=30))
        end = request.end_date or datetime.utcnow()
        symbols = request.symbols or ["BTCUSDT"] # Default symbol
        symbol = symbols[0]
        
        logger.info(f"Fetching data for {symbol} from {start} to {end}")
        market_data = await supabase_client.get_market_data(symbol, start, end)
        
        if not market_data:
            logger.warning(f"No market data found for {symbol}")
            # Generate dummy data for demonstration if DB is empty
            market_data = _generate_dummy_data(start, end)
            
        # 3. Run Backtest
        from app.core.backtesting.vectorbt_adapter import vectorbt_adapter
        # Pass a dummy config for now, or fetch actual strategy rules
        strategy_config = {"name": "Test", "rules": []} 
        
        result = vectorbt_adapter.run_backtest(
            strategy_config, 
            market_data, 
            request.initial_capital
        )
        
        # 4. Update Result in Database
        result['strategy_id'] = str(strategy_id)
        # Update specific fields
        await supabase_client.client.table('backtest_results').update({
            'total_trades': result['total_trades'],
            'win_rate': result['win_rate'],
            'profit_factor': result['profit_factor'],
            'sharpe_ratio': result['sharpe_ratio'],
            'max_drawdown': result['max_drawdown'],
            'total_return': result['total_return'],
            'metrics': result, # Store full blob
            'status': 'completed' # Add status column to table or use jsonb
        }).eq('id', str(backtest_id)).execute()
        
        logger.info(f"✅ Backtest {backtest_id} completed successfully")
        
    except Exception as e:
        logger.error(f"❌ Backtest failed: {e}")
        # Update status to failed
        # await supabase_client.update_backtest_status(backtest_id, 'failed', error=str(e))

def _generate_dummy_data(start, end):
    """Generate dummy OHLCV data for testing"""
    import pandas as pd
    import numpy as np
    
    dates = pd.date_range(start=start, end=end, freq='1min')
    df = pd.DataFrame(index=dates)
    df['close'] = np.random.randn(len(df)).cumsum() + 100
    df['open'] = df['close'].shift(1)
    df['high'] = df['close'] + 1
    df['low'] = df['close'] - 1
    df['volume'] = np.random.randint(100, 1000, size=len(df))
    df['symbol'] = 'BTCUSDT'
    df.fillna(100, inplace=True)
    
    # Convert to list of dicts
    df['time'] = df.index
    return df.to_dict('records')


@router.post("/", response_model=BacktestResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_backtest(
    request: BacktestRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Run a backtest for a strategy.
    
    This is an async operation - backtest runs in the background.
    """
    # Verify strategy exists
    result = await db.execute(
        select(Strategy).where(Strategy.id == request.strategy_id)
    )
    strategy = result.scalar_one_or_none()
    
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Strategy not found"
        )
    
    # Create backtest record
    backtest = BacktestResult(
        strategy_id=request.strategy_id,
        start_date=request.start_date,
        end_date=request.end_date,
        initial_capital=request.initial_capital,
        final_capital=request.initial_capital,  # Will be updated
        total_trades=0,
        metrics={"status": "running"}
    )
    
    db.add(backtest)
    await db.commit()
    await db.refresh(backtest)
    
    # Schedule background task
    background_tasks.add_task(
        run_backtest_task,
        backtest.id,
        request.strategy_id,
        request
    )
    
    logger.info(f"Backtest {backtest.id} scheduled for strategy {strategy.name}")
    
    return backtest


@router.get("/", response_model=List[BacktestResponse])
async def list_backtests(
    strategy_id: UUID = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """List backtests, optionally filtered by strategy."""
    query = select(BacktestResult).offset(skip).limit(limit)
    
    if strategy_id:
        query = query.where(BacktestResult.strategy_id == strategy_id)
    
    result = await db.execute(query.order_by(BacktestResult.created_at.desc()))
    backtests = result.scalars().all()
    
    return backtests


@router.get("/{backtest_id}", response_model=BacktestResponse)
async def get_backtest(
    backtest_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get backtest results by ID."""
    result = await db.execute(
        select(BacktestResult).where(BacktestResult.id == backtest_id)
    )
    backtest = result.scalar_one_or_none()
    
    if not backtest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backtest not found"
        )
    
    return backtest
