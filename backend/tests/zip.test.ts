import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import FormData from "form-data";
import { getTestToken } from "./testHelper.js";
import yazl from "yazl";
import fs from "fs";
import path from "path";

const fixturesDir = path.join(__dirname, "fixtures");

async function createZipBuffer(config: (zipfile: yazl.ZipFile) => void): Promise<Buffer> {
  const zipfile = new yazl.ZipFile();
  config(zipfile);
  zipfile.end();
  
  const chunks: Buffer[] = [];
  for await (const chunk of zipfile.outputStream) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

describe("API Routes - ZIP Security", () => {
  const app = buildApp();
  const samplePdf = fs.readFileSync(path.join(fixturesDir, "certifitrack_sample_coi_test.pdf"));

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  const sendZip = async (buffer: Buffer) => {
    const form = new FormData();
    form.append("file", buffer, { filename: "test.zip", contentType: "application/zip" });
    return app.inject({
      method: "POST",
      url: "/v1/extract",
      headers: { ...form.getHeaders(), Authorization: `Bearer ${getTestToken()}` },
      payload: form,
    });
  };

  it("should successfully process a valid ZIP", async () => {
    const buf = await createZipBuffer((zip) => {
      zip.addBuffer(samplePdf, "file1.pdf");
      zip.addBuffer(samplePdf, "file2.pdf");
    });
    const response = await sendZip(buf);
    expect(response.statusCode).toBe(200);
  }, 30000);

  it("should reject path traversal and absolute paths in ZIP", async () => {
    const buf = fs.readFileSync(path.join(fixturesDir, "malicious.zip"));
    
    const response = await sendZip(buf);
    expect(response.statusCode).toBe(422);
    expect(response.json().message).toContain("invalid relative path");
  }, 30000);

  it("should reject nested ZIP archives", async () => {
    const nestedBuf = await createZipBuffer((z) => z.addBuffer(Buffer.from(""), "empty.pdf"));
    const buf = await createZipBuffer((zip) => {
      zip.addBuffer(nestedBuf, "nested.zip");
    });
    const response = await sendZip(buf);
    expect(response.statusCode).toBe(422);
    expect(response.json().message).toContain("Nested ZIP");
  }, 30000);

  it("should ignore non-PDF files", async () => {
    const buf = await createZipBuffer((zip) => {
      zip.addBuffer(Buffer.from("malware"), "virus.exe");
      zip.addBuffer(samplePdf, "good.pdf");
    });
    const response = await sendZip(buf);
    // Should process good.pdf and ignore virus.exe
    expect(response.statusCode).toBe(200);
  }, 30000);

  it("should reject empty ZIP", async () => {
    const buf = await createZipBuffer((zip) => {});
    const response = await sendZip(buf);
    expect(response.statusCode).toBe(422);
  }, 30000);
});
