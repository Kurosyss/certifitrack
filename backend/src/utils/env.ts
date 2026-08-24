import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("127.0.0.1"),
  CERTIFITRACK_PROVIDER: z.enum(["gemini", "deterministic", "mock"]).default("gemini"),
  GEMINI_API_KEY: z.string().optional(),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().default(10),
  REQUEST_TIMEOUT_MS: z.coerce.number().default(120000), // 2 mins total
  DOCUMENT_TIMEOUT_MS: z.coerce.number().default(15000), // 15s per PDF
  CONCURRENCY_LIMIT: z.coerce.number().default(5), // 5 concurrent PDF jobs
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:", _env.error.format());
  process.exit(1);
}

export const env = _env.data;
