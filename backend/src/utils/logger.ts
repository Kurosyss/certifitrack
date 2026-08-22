import pino from "pino";
import { env } from "./env.js";

const isDev = env.NODE_ENV === "development";

export const logger = pino({
  level: isDev ? "debug" : "info",
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  redact: {
    paths: ["req.headers.authorization", "GEMINI_API_KEY"],
    censor: "[REDACTED]",
  },
});
