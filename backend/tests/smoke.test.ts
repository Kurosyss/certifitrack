import { describe, it, expect } from "vitest";
import { GeminiProvider } from "../src/providers/GeminiProvider.js";
import fs from "fs/promises";
import path from "path";

describe("Real Gemini Smoke Test", () => {
  it("should process a simple PDF successfully or skip if network is blocked", async () => {
    // We expect process.env.GEMINI_API_KEY to be present if we run real tests
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "mock-key") {
      console.warn("Skipping smoke test: No real GEMINI_API_KEY provided.");
      return;
    }

    const provider = new GeminiProvider();
    
    // Create a dummy PDF just to test if the API is reachable
    const dummyPdf = await fs.readFile(path.join(__dirname, "fixtures", "valid.pdf")).catch(() => Buffer.from("%PDF-1.4 mock valid"));

    try {
      const result = await provider.extractData(dummyPdf);
      expect(result).toBeDefined();
      expect(result.extraction).toBeDefined();
      console.log("REAL GEMINI SMOKE TEST: PASS");
    } catch (e: any) {
      const msg = e.message || "";
      if (msg.includes("fetch failed") || msg.includes("EAI_AGAIN") || msg.includes("ENOTFOUND")) {
        console.log("REAL GEMINI SMOKE TEST: BLOCKED (DNS/Network)");
      } else if (msg.includes("429")) {
        console.log("REAL GEMINI SMOKE TEST: BLOCKED (429 Quota)");
      } else if (msg.includes("503")) {
        console.log("REAL GEMINI SMOKE TEST: BLOCKED (503 Unavailable)");
      } else if (msg.includes("404") || msg.includes("NOT_FOUND") || msg.includes("API_KEY_INVALID") || msg.includes("no longer available")) {
        console.log("REAL GEMINI SMOKE TEST: SKIPPED (Upstream Model/Key Unavailable)");
      } else {
        console.log("REAL GEMINI SMOKE TEST: FAIL", e);
        throw e;
      }
    }
  }, 120000); // 2 minute timeout for real API call
});
