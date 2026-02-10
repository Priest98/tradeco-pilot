# TraderCopilot - Quant Signal Intelligence System

![TraderCopilot](https://img.shields.io/badge/Status-In%20Development-yellow)
![Python](https://img.shields.io/badge/Python-3.11+-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-green)
![Next.js](https://img.shields.io/badge/Next.js-14-black)

**Institutional-grade quantitative trading signal platform** designed to scan markets in real-time, detect statistically valid trade setups, compute probability-based signal quality, and distribute high-confidence signals to users.

## 🎯 Core Features

- **Real-time Market Data Ingestion** - WebSocket connections to Binance, Alpaca, Polygon
- **Multi-Format Strategy Upload** - JSON, Pine Script, Python
- **Statistical Backtesting** - VectorBT-powered with comprehensive metrics
- **Bayesian Probability Engine** - Monte Carlo simulations for confidence scoring
- **AI Context Intelligence** - Google Gemini 2.0 Flash integration
- **Signal Scoring System** - Multi-factor scoring (0-10 scale)
- **Real-time Distribution** - WebSocket, Telegram, Webhooks
- **Vector Knowledge Base** - Semantic search for quant research

## 🏗️ Architecture

```
Market Data → Strategy → Statistical → Intelligence → Signal → Distribution
```

**Tech Stack:**
- Backend: Python 3.11+ FastAPI
- Database: PostgreSQL 15 + TimescaleDB
- Vector DB: Supabase (pgvector)
- LLM: Google Gemini 2.0 Flash
- Frontend: Next.js 14
- Deployment: Docker Compose

## 🚀 Quick Start

### Prerequisites

- Docker Desktop
- Python 3.11+
- Node.js 18+
- Google Gemini API Key

### Installation

1. **Clone and Setup**
```bash
cd Quant101
cp .env.example .env
# Edit .env with your API keys
```

2. **Start Services**
```bash
docker-compose up -d
```

3. **Initialize Database**
```bash
cd backend
python -m app.database.init_db
```

4. **Start Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

5. **Start Frontend**
```bash
cd frontend
npm install
npm run dev
```

Access the dashboard at `http://localhost:3000`

## 📊 Signal Quality Criteria

Only signals meeting these thresholds are distributed:

- **Signal Score**: ≥ 7.0/10
- **Probability**: ≥ 60%
- **Backtest Win Rate**: ≥ 55%
- **Sharpe Ratio**: ≥ 1.5
- **Minimum Trades**: 100 (for statistical significance)

## 🧪 Development

**Run Tests:**
```bash
cd backend
pytest tests/ -v
```

**Run Load Tests:**
```bash
locust -f tests/load/test_signal_feed.py
```

## 📁 Project Structure

```
Quant101/
├── backend/           # Python FastAPI application
├── frontend/          # Next.js dashboard
├── docker-compose.yml # Development environment
└── docs/             # Documentation
```

## 📈 Verification Metrics

- Signal generation latency: < 500ms (p95)
- Distribution latency: < 100ms (p95)
- System uptime: 99.9%
- Concurrent users: 1000+

## 🔐 Security

- JWT authentication (coming soon)
- Strategy code sandboxing
- Rate limiting on all endpoints
- API key encryption

## 📄 License

MIT License - See LICENSE file

---

**Built with institutional-grade engineering for serious traders.**
