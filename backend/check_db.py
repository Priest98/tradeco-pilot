import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

def check_db_setup():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        print("❌ Credentials missing!")
        return
        
    client = create_client(url, key)
    
    print("Checking database tables...")
    
    # Try to select from signals to see if table exists
    try:
        response = client.table("signals").select("count", count="exact").execute()
        print("[OK] Tables appear to be set up!")
        print(f"   found {response.count} signals in database.")
    except Exception as e:
        print(f"[ERROR] Error details: {str(e)}")
        print("[FAIL] Database tables not found or not accessible.")
        print("\n[ACTION REQUIRED]")
        print("   You need to run the SQL migration script in your Supabase Dashboard.")
        print("   1. Open 'backend/migrations/001_initial_schema.sql'")
        print("   2. Copy the SQL content")
        print("   3. Go to Supabase > SQL Editor")
        print("   4. Paste and Run")
        import sys
        sys.exit(1)

if __name__ == "__main__":
    check_db_setup()
