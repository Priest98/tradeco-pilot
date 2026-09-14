import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
let dbInstance: DatabaseSync | null = null;

function getLocalEnv() {
  return {
    DATA_DIR: process.env.DATA_DIR || "./data",
    DATABASE_NAME: process.env.DATABASE_NAME || "intelligence.db",
  };
}

export function getDatabase(): DatabaseSync {
  if (dbInstance) return dbInstance;

  const env = getLocalEnv();
  const dataDir = path.resolve(process.cwd(), env.DATA_DIR);

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, env.DATABASE_NAME);
  const db = new DatabaseSync(dbPath);

  // Configure high performance and durability settings
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA synchronous = NORMAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");

  // Load and apply initial schema
  const schemaPath = path.resolve(process.cwd(), "src/server/db/schema.sql");
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");
    db.exec(schemaSql);
  }

  dbInstance = db;
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
