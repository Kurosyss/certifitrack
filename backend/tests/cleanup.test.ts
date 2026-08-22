import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs/promises";
import path from "path";
import { buildApp } from "../src/app.js";
import { getTestToken } from "./testHelper.js";

describe("Temporary Directory Cleanup Security", () => {
  let app: any;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  async function checkTempDirEmpty() {
    const tempBase = path.join(__dirname, "../temp");
    try {
      const files = await fs.readdir(tempBase);
      // It should ideally be empty, or not contain request-specific folders
      // For absolute security, let's just make sure there are no directories starting with "req-"
      const reqDirs = files.filter(f => f.startsWith("req-"));
      return reqDirs.length === 0;
    } catch (e: any) {
      if (e.code === "ENOENT") return true;
      throw e;
    }
  }

  it("should clean up after a successful PDF upload", async () => {
    const pdfBuf = await fs.readFile(path.join(__dirname, "fixtures", "valid.pdf")).catch(() => Buffer.from("%PDF-1.4 mock valid"));
    
    await app.inject({
      method: "POST",
      url: "/v1/extract",
      headers: {
        "content-type": "multipart/form-data; boundary=---boundary",
        "Authorization": `Bearer ${getTestToken()}`
      },
      payload: `-----boundary\r\nContent-Disposition: form-data; name="file"; filename="valid.pdf"\r\nContent-Type: application/pdf\r\n\r\n${pdfBuf.toString("binary")}\r\n-----boundary--\r\n`,
    });

    const isClean = await checkTempDirEmpty();
    expect(isClean).toBe(true);
  });

  it("should clean up after an oversized file failure", async () => {
    // Generate a massive string to trigger payload too large
    const hugeBuf = Buffer.alloc(11 * 1024 * 1024, "A"); // 11 MB, limit is 10 MB
    
    await app.inject({
      method: "POST",
      url: "/v1/extract",
      headers: {
        "content-type": "multipart/form-data; boundary=---boundary",
        "Authorization": `Bearer ${getTestToken()}`
      },
      payload: `-----boundary\r\nContent-Disposition: form-data; name="file"; filename="huge.pdf"\r\nContent-Type: application/pdf\r\n\r\n${hugeBuf.toString("binary")}\r\n-----boundary--\r\n`,
    });

    const isClean = await checkTempDirEmpty();
    expect(isClean).toBe(true);
  });

  it("should clean up after an unsupported file type failure", async () => {
    const textBuf = Buffer.from("Hello world");
    
    await app.inject({
      method: "POST",
      url: "/v1/extract",
      headers: {
        "content-type": "multipart/form-data; boundary=---boundary",
        "Authorization": `Bearer ${getTestToken()}`
      },
      payload: `-----boundary\r\nContent-Disposition: form-data; name="file"; filename="test.txt"\r\nContent-Type: text/plain\r\n\r\n${textBuf.toString("binary")}\r\n-----boundary--\r\n`,
    });

    const isClean = await checkTempDirEmpty();
    expect(isClean).toBe(true);
  });
});
