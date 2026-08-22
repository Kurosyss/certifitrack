import { env } from "../src/utils/env.js";

// Utility to create dummy JWT tokens for tests is no longer needed
export function getTestToken(): string {
  return "test-session-token";
}
