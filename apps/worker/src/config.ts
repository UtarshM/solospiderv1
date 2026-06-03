import "dotenv/config";
import { z } from "zod";
import Redis from "ioredis";

// ── Env validation ──────────────────────────────────────────────────────────
const EnvSchema = z.object({
  NODE_ENV:                 z.enum(["development", "production", "test"]).default("development"),
  SUPABASE_URL:             z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY:z.string().min(10),
  REDIS_URL:                z.string().default("redis://localhost:6379"),
  OPENROUTER_API_KEY:       z.string().min(10),
  WORKER_SECRET:            z.string().default("dev-secret"),
  LINKEDIN_CLIENT_ID:       z.string().optional(),
  LINKEDIN_CLIENT_SECRET:   z.string().optional(),
  LINKEDIN_REDIRECT_URI:    z.string().optional(),
  TWITTER_CLIENT_ID:        z.string().optional(),
  TWITTER_CLIENT_SECRET:    z.string().optional(),
  TWITTER_REDIRECT_URI:     z.string().optional(),
  META_APP_ID:              z.string().optional(),
  META_APP_SECRET:          z.string().optional(),
});

function loadEnv() {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    result.error.issues.forEach(i => console.error(` • ${i.path.join(".")}: ${i.message}`));
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();

// ── Redis client (shared across workers) ───────────────────────────────────
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
  tls: env.REDIS_URL.startsWith("rediss://") ? {} : undefined,
});

redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("error", (err) => console.error("Redis error:", err.message));
