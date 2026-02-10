# Quick Start Guide - TraderCopilot

## Setup Without Docker

Since Docker is not installed, here's how to run TraderCopilot locally:

### 1. Backend Setup

```bash
# Install Python dependencies
cd backend
pip install -r requirements.txt

# Set up environment variables
cp ../.env.example .env
# Edit .env with your Gemini API key

# Start the backend (without database for now)
uvicorn app.main:app --reload
```

Backend will be available at: `http://localhost:8000`
API docs at: `http://localhost:8000/docs`

### 2. Frontend Setup

Option A: **Next.js (Production)**
```bash
cd frontend
npm install
npm run dev
```
Dashboard at: `http://localhost:3000`

Option B: **Demo HTML (Quick Preview)**
```bash
cd frontend
start demo.html
```

### 3. Database Setup (Optional - For Full Functionality)

**Option 1: PostgreSQL Local Installation**
- Install PostgreSQL 15+
- Install TimescaleDB extension
- Run migration: `migrations/001_initial_schema.sql`

**Option 2: Supabase Cloud (Recommended)**
- Create free account at supabase.com
- Create new project
- Copy connection string to .env
- Run migrations from Supabase SQL editor

### 4. Running the Complete System

**Without Database (Demo Mode):**
- Backend will run but signal generation won't work
- Frontend demo.html works standalone
- API endpoints return empty arrays

**With Database (Full Mode):**
- All features functional
- Real signal generation
- Historical data storage
- Vector search capabilities

## Current Status

✅ **Working:**
- Backend code structure
- API endpoints
- Intelligence engines (Gemini, Bayesian, Monte Carlo)
- Signal scoring system
- Frontend UI (demo.html)

⏳ **Needs Setup:**
- PostgreSQL database
- Redis cache
- Exchange API connections
- Gemini API key

## Quick Demo

To see the dashboard immediately:
```bash
cd frontend
start demo.html
```

This opens a fully styled demo with sample signals!
