from sqlalchemy.ext.declarative import declarative_base
from app.database.supabase_client import supabase_client
from app.database.vector_kb import vector_kb

Base = declarative_base()

# For backward compatibility if needed, though we should transition fully
# from app.database.postgres import init_db, get_db

async def get_db():
    """Placeholder for dependency injection compatibility"""
    yield None
