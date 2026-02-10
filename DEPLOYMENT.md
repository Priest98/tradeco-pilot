# TraderCopilot - Deployment Guide

## Supabase Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Name: `tradercopilot`
4. Database Password: (save this!)
5. Region: Choose closest to you
6. Click "Create new project"

### 2. Run Database Migrations

Copy and paste this SQL into Supabase SQL Editor:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Signals table
CREATE TABLE signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_id UUID,
    symbol TEXT NOT NULL,
    direction TEXT NOT NULL,
    entry_price DECIMAL(20, 8) NOT NULL,
    stop_loss DECIMAL(20, 8) NOT NULL,
    take_profit DECIMAL(20, 8) NOT NULL,
    probability_score DECIMAL(5, 2),
    signal_score DECIMAL(3, 1),
    confidence_level TEXT,
    risk_rating TEXT,
    trade_explanation TEXT,
    position_sizing DECIMAL(5, 2),
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    pnl DECIMAL(20, 8)
);

-- Index for fast querying
CREATE INDEX idx_signals_status ON signals(status);
CREATE INDEX idx_signals_symbol ON signals(symbol);
CREATE INDEX idx_signals_created_at ON signals(created_at DESC);

-- Strategies table
CREATE TABLE strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    strategy_type TEXT NOT NULL,
    config JSONB,
    risk_management JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backtest results
CREATE TABLE backtest_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_id UUID REFERENCES strategies(id),
    total_trades INTEGER,
    winning_trades INTEGER,
    losing_trades INTEGER,
    win_rate DECIMAL(5, 2),
    profit_factor DECIMAL(8, 2),
    sharpe_ratio DECIMAL(8, 2),
    max_drawdown DECIMAL(5, 2),
    total_return DECIMAL(8, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge base with vector embeddings
CREATE TABLE knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    embedding VECTOR(768),
    metadata JSONB,
    knowledge_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector similarity search function
CREATE OR REPLACE FUNCTION match_knowledge(
    query_embedding VECTOR(768),
    match_threshold FLOAT,
    match_count INT
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
    SELECT
        id,
        content,
        metadata,
        1 - (embedding <=> query_embedding) AS similarity
    FROM knowledge_base
    WHERE 1 - (embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
$$;

-- Create index for vector search
CREATE INDEX ON knowledge_base USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### 3. Get Your Credentials

1. Go to Project Settings → API
2. Copy:
   - Project URL → `SUPABASE_URL`
   - Anon/Public Key → `SUPABASE_KEY`
3. Add to `.env` file

## Telegram Bot Setup (Optional)

### 1. Create Bot

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot`
3. Follow prompts to create bot
4. Copy `Bot Token` → `TELEGRAM_BOT_TOKEN`

### 2. Create Channel

1. Create new Telegram channel
2. Add your bot as administrator
3. Get channel ID (use @userinfobot)
4. Add to `.env` → `TELEGRAM_CHANNEL_ID`

## Environment Configuration

Create `.env` file in backend directory:

```bash
cp .env.example .env
```

Edit `.env` with your actual credentials:

```
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHANNEL_ID=@your_channel
GEMINI_API_KEY=AIzaSy...
```

## Running the System

### Local Development

```bash
# Install dependencies
cd backend
pip install -r requirements.txt

# Start backend
python demo_server.py

# Open dashboard
cd ../frontend
start dashboard.html
```

### Production Deployment

**Option 1: Render.com (Backend)**
1. Connect GitHub repository
2. Set environment variables
3. Deploy as Web Service

**Option 2: Vercel (Frontend)**
1. Deploy Next.js frontend
2. Set `NEXT_PUBLIC_API_URL` to backend URL

## Testing Database Connection

```python
from app.database.supabase_client import supabase_client

# Test connection
stats = await supabase_client.get_statistics()
print(stats)
```

## Next Steps

1. ✅ Set up Supabase project
2. ✅ Run migrations
3. ✅ Configure .env
4. ✅ Test connection
5. 🚀 Deploy to production
