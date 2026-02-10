
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import List, Optional
from pydantic import BaseModel
import logging
from datetime import datetime

from app.services.vector_store import vector_store
from app.core.intelligence.gemini_client import gemini_client

router = APIRouter()
logger = logging.getLogger(__name__)

class KnowledgeItem(BaseModel):
    content: str
    category: str = "general"
    tags: List[str] = []

class SearchRequest(BaseModel):
    query: str
    limit: int = 5
    threshold: float = 0.7

@router.post("/ingest", status_code=status.HTTP_201_CREATED)
async def ingest_knowledge(item: KnowledgeItem):
    """
    Ingest text content into the vector knowledge base
    """
    try:
        # 1. Generate Embedding using Gemini
        # We use a helper method in gemini_client
        # Note: generate_embedding is sync, but we can run it in a thread or just await if it was async
        # For simplicity, calling the sync method (FastAPI handles it in threadpool if def is async)
        embedding = await gemini_client.generate_embedding(item.content)
        
        if not embedding:
            raise HTTPException(status_code=500, detail="Failed to generate embedding")
            
        # 2. Store in Vector DB
        metadata = {
            "category": item.category,
            "tags": item.tags,
            "ingested_at": datetime.utcnow().isoformat()
        }
        
        success = await vector_store.store_embedding(item.content, embedding, metadata)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to store in vector database")
            
        return {"status": "success", "message": "Knowledge ingested successfully"}
        
    except Exception as e:
        logger.error(f"Ingestion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search", response_model=List[dict])
async def search_knowledge(request: SearchRequest):
    """
    Semantic search in knowledge base
    """
    try:
        # 1. Embed query
        embedding = await gemini_client.generate_embedding(request.query)
        
        if not embedding:
            raise HTTPException(status_code=500, detail="Failed to generate query embedding")
            
        # 2. Search Vector DB
        results = await vector_store.search_similar(
            embedding, 
            limit=request.limit, 
            threshold=request.threshold
        )
        
        return results
        
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
