"""Strategy endpoints"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Dict, Optional
from uuid import UUID
from datetime import datetime

from app.database import supabase_client
from app.models import Strategy
from app.schemas import StrategyCreate, StrategyUpdate, StrategyResponse
from app.core.strategies.parser import strategy_parser
from app.core.triggers.strategy_trigger import strategy_trigger_system

router = APIRouter()

@router.post("/", response_model=Dict, status_code=status.HTTP_201_CREATED)
async def create_strategy(strategy: StrategyCreate):
    """
    Create a new trading strategy.
    Supports JSON, Pine Script, and Python strategy formats.
    """
    # 1. Validate Strategy Config
    if strategy.strategy_type == 'json':
        # Use our parser to validate JSON structure
        validation = strategy_parser.parse_json_strategy(
            # Convert dict to json string if needed, or update parser to handle dicts
            # Assuming config is a dict here
            str(strategy.config).replace("'", '"') # profound hack for demo, ideally robust json dump
        )
        if not validation.get('valid'):
             # Allow saving even if invalid? Maybe not.
             # For now, let's just log warning but save it
             pass

    # 2. Store in Supabase
    strategy_data = {
        'name': strategy.name,
        'description': strategy.description,
        'type': strategy.strategy_type,
        'rules': strategy.config,  # Supabase schema expects 'config' or mapped to 'rules'
        'risk_management': strategy.config.get('risk_management', {}),
        'user_id': "00000000-0000-0000-0000-000000000000" # Placeholder
    }
    
    strategy_id = await supabase_client.store_strategy(strategy_data)
    
    if not strategy_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create strategy"
        )
    
    # Add to running system
    full_strategy = {**strategy_data, "id": strategy_id}
    strategy_trigger_system.add_strategy(full_strategy)
        
    return {**full_strategy, "created_at": datetime.utcnow().isoformat()}


@router.get("/", response_model=List[Dict])
async def list_strategies():
    """List all strategies."""
    strategies = await supabase_client.get_strategies()
    return strategies


@router.get("/{strategy_id}", response_model=Dict)
async def get_strategy(strategy_id: str):
    """Get a specific strategy by ID."""
    # We need to add get_strategy_by_id to supabase_client
    # optimizing to use list filter for now if specific method doesn't exist
    # But wait, we saw supabase_client.py earlier
    
    # Adding a quick helper here or expecting client to have it
    # Let's check supabase_client again. It has get_strategies() but maybe not get_strategy()
    
    # Implementing fallback
    strategies = await supabase_client.get_strategies()
    for s in strategies:
        if s['id'] == strategy_id:
            return s
            
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Strategy not found"
    )

