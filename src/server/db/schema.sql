-- SQLite Schema for TradeCo-Pilot Personal Global Intelligence System
-- Optimized with WAL mode, foreign keys, and indexes for millisecond query performance.

CREATE TABLE IF NOT EXISTS observations (
    id TEXT PRIMARY KEY,
    domain TEXT NOT NULL,
    source TEXT NOT NULL,
    entity_id TEXT,
    lat REAL,
    lon REAL,
    alt REAL,
    timestamp INTEGER NOT NULL,
    data_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_obs_domain_time ON observations(domain, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_obs_entity ON observations(entity_id);
CREATE INDEX IF NOT EXISTS idx_obs_geo ON observations(lat, lon);

CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY,
    domain TEXT NOT NULL,
    name TEXT,
    country TEXT,
    category TEXT,
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_entities_domain ON entities(domain);
CREATE INDEX IF NOT EXISTS idx_entities_category ON entities(category);

CREATE TABLE IF NOT EXISTS anomalies (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    domain TEXT NOT NULL,
    anomaly_type TEXT NOT NULL,
    z_score REAL NOT NULL,
    confidence REAL NOT NULL,
    lat REAL,
    lon REAL,
    summary TEXT NOT NULL,
    evidence_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_anomalies_time ON anomalies(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_zscore ON anomalies(z_score DESC);

CREATE TABLE IF NOT EXISTS correlated_events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    bluf TEXT NOT NULL,
    threat_level TEXT NOT NULL,
    primary_domain TEXT NOT NULL,
    location_name TEXT,
    lat REAL,
    lon REAL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    dossier_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_time ON correlated_events(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_threat ON correlated_events(threat_level);

CREATE TABLE IF NOT EXISTS forecast_ledger (
    id TEXT PRIMARY KEY,
    event_id TEXT,
    question TEXT NOT NULL,
    probability REAL NOT NULL,
    target_date INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    outcome INTEGER,
    brier_score REAL,
    resolved_at INTEGER,
    rationale TEXT,
    FOREIGN KEY(event_id) REFERENCES correlated_events(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_forecast_status ON forecast_ledger(outcome);

CREATE TABLE IF NOT EXISTS aoi_tripwires (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    geometry_geojson TEXT NOT NULL,
    filter_domain TEXT,
    alert_on_entry INTEGER DEFAULT 1,
    alert_on_exit INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL,
    reset_at INTEGER NOT NULL
);
