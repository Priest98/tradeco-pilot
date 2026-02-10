"""Signal endpoints"""

from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from uuid import UUID
from decimal import Decimal

from app.database import supabase_client
from app.models import Signal
from app.schemas import SignalResponse
from app.config import settings

router = APIRouter()


@router.get("/", response_model=List[dict])
async def list_signals(
    symbols: Optional[List[str]] = Query(None),
    min_score: Optional[Decimal] = Query(None, ge=0, le=10),
    min_probability: Optional[Decimal] = Query(None, ge=0, le=100),
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=500)
):
    """
    List signals with optional filtering.
    """
    # Convert decimals to float for Supabase
    score_float = float(min_score) if min_score is not None else None
    prob_float = float(min_probability) if min_probability is not None else None
    
    signals = await supabase_client.get_signals(
        symbols=symbols,
        min_score=score_float,
        min_prob=prob_float,
        status=status,
        limit=limit
    )
    
    return signals


@router.get("/{signal_id}", response_model=dict)
async def get_signal(signal_id: UUID):
    """Get a specific signal by ID."""
    signal = await supabase_client.get_signal_by_id(str(signal_id))
    
    if not signal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Signal not found"
        )
    
    return signal


@router.get("/active/high-quality", response_model=List[dict])
async def get_high_quality_signals(
    limit: int = Query(20, le=100)
):
    """
    Get active high-quality signals that meet platform thresholds.
    """
    signals = await supabase_client.get_signals(
        status="active",
        min_score=settings.MIN_SIGNAL_SCORE,
        min_prob=settings.MIN_PROBABILITY,
        limit=limit
    )
    
    return signals
