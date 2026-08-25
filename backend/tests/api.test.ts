import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { getTestToken } from "./testHelper.js";
import FormData from "form-data";
import fs from "fs/promises";
import path from "path";
import os from "os";

describe("API Routes - POST /v1/extract", () => {
  const app = buildApp();
  const fixturesDir = path.join(__dirname, "fixtures");

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
    const samplePdf = await fs.readFile(path.join(fixturesDir, "certifitrack_sample_coi_test.pdf"));
    const form = new FormData();
    form.append("file", samplePdf, { filename: "certifitrack_sample_coi_test.pdf", contentType: "application/pdf" });

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
    expect(response.rawPayload.length).toBeGreaterThan(0);
  }, 30000);
});
