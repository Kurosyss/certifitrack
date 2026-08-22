import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import { env } from "../src/utils/env.js";

async function runSyntheticE2E() {
  console.log("Starting Synthetic E2E Test against local API...");

  // Assuming server is running on localhost:3000
  const url = `http://localhost:${env.PORT}/v1/extract`;
  
  const testZipPath = path.resolve(process.cwd(), "../benchmark_v5/dataset/synthetic_dataset.zip");
  
  try {
    // Check if zip exists
    await fs.access(testZipPath);
    console.log(`✅ Found synthetic dataset at ${testZipPath}`);
  } catch {
    console.error(`❌ Synthetic dataset not found at ${testZipPath}. Please generate it using benchmark tools.`);
    process.exit(1);
  }

  console.log(`Sending POST request to ${url}...`);
  console.log(`NOTE: If Gemini API network is down, this will return a 502 UpstreamProviderError.`);

  try {
    const curlCommand = `curl -X POST -F "file=@${testZipPath}" ${url} --output result.xlsx -s -w "%{http_code}"`;
    const httpCode = execSync(curlCommand, { encoding: "utf-8" });

    if (httpCode.trim() === "200") {
      console.log("✅ E2E Pipeline Succeeded: result.xlsx generated successfully.");
    } else {
      console.error(`❌ E2E Pipeline Failed with HTTP Code: ${httpCode}`);
      // Try to read result.xlsx as error JSON
      const errorContent = await fs.readFile("result.xlsx", "utf-8");
      console.error("Response:", errorContent);
    }
  } catch (err: any) {
    console.error("❌ E2E Pipeline Request Failed:", err.message);
  }
}

runSyntheticE2E();
