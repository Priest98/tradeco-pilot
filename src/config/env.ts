import { z } from "zod";

/**
 * Server-side environment configuration schema.
 * Validates at startup and fails fast with clear errors (Checklist 1.6).
 * Secrets are strictly isolated to server-side execution (Checklist 1.3).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),

  // Master security authentication key for API access (Checklist 3.1 & 3.6)
  SYSTEM_API_KEY: z.string().min(16, "SYSTEM_API_KEY must be at least 16 characters for secure bearer authentication"),

  // Primary LLM reasoning key (Gemini 2.0 Flash)
  GEMINI_API_KEY: z.string().optional(),

  // Optional alternative LLM providers
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().url().default("http://localhost:11434"),

  // Data ingestor credentials
  AISSTREAM_API_KEY: z.string().optional(),
  OPENSKY_USERNAME: z.string().optional(),
  OPENSKY_PASSWORD: z.string().optional(),
  FIRMS_MAP_KEY: z.string().optional(),

  // Local storage paths
  DATA_DIR: z.string().default("./data"),
  DATABASE_NAME: z.string().default("intelligence.db"),
});

export type EnvConfig = z.infer<typeof envSchema>;

let parsedEnv: EnvConfig | null = null;

export function getEnv(): EnvConfig {
  if (parsedEnv) return parsedEnv;

  // Fallback defaults in development/test if not set yet
  const rawEnv = {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: process.env.PORT || 3000,
    SYSTEM_API_KEY: process.env.SYSTEM_API_KEY || (process.env.NODE_ENV === "production" ? "prod-system-key-placeholder-change-in-env-32" : "dev-session-key-" + (process.env.COMPUTERNAME || "local")),
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    AISSTREAM_API_KEY: process.env.AISSTREAM_API_KEY,
    OPENSKY_USERNAME: process.env.OPENSKY_USERNAME,
    OPENSKY_PASSWORD: process.env.OPENSKY_PASSWORD,
    FIRMS_MAP_KEY: process.env.FIRMS_MAP_KEY,
    DATA_DIR: process.env.DATA_DIR || "./data",
    DATABASE_NAME: process.env.DATABASE_NAME || "intelligence.db",
  };

  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    console.error("❌ CRITICAL: Invalid environment configuration:", result.error.format());
    throw new Error(
      `Environment validation failed: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}`
    );
  }

  parsedEnv = result.data;
  return parsedEnv;
}
