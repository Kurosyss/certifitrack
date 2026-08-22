import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { getTestToken } from "./testHelper.js";
import FormData from "form-data";
import fs from "fs/promises";
import path from "path";
import os from "os";

describe("API Routes - POST /v1/extract", () => {
  const app = buildApp();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  const createTestFile = async (filename: string, content: string | Buffer = "test") => {
    const tmp = path.join(os.tmpdir(), filename);
    await fs.writeFile(tmp, content);
    return tmp;
  };

  it("should return 400 if no file is provided", async () => {
    const form = new FormData();
    const response = await app.inject({
      method: "POST",
      url: "/v1/extract",
      headers: { ...form.getHeaders(), Authorization: `Bearer ${getTestToken()}` },
      payload: form,
    });
    expect(response.statusCode).toBe(400);
    const json = response.json();
    expect(json.error).toBe("BadRequestError");
  });

  it("should return 415 if unsupported media type", async () => {
    const tmp = await createTestFile("test.txt", "hello world");
    const form = new FormData();
    form.append("file", await fs.readFile(tmp), { filename: "test.txt", contentType: "text/plain" });

    const response = await app.inject({
      method: "POST",
      url: "/v1/extract",
      headers: { ...form.getHeaders(), Authorization: `Bearer ${getTestToken()}` },
      payload: form,
    });
    expect(response.statusCode).toBe(415);
  });

  it("should successfully process a valid PDF", async () => {
    // Note: In NODE_ENV=test, this uses MockExtractionProvider
    const tmp = await createTestFile("valid.pdf", "%PDF-1.4 mock pdf content");
    const form = new FormData();
    form.append("file", await fs.readFile(tmp), { filename: "valid.pdf", contentType: "application/pdf" });

    const response = await app.inject({
      method: "POST",
      url: "/v1/extract",
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${getTestToken()}`,
      },
      payload: form,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    // Verify it's an actual buffer returned
    expect(response.rawPayload.length).toBeGreaterThan(0);
  });
});
