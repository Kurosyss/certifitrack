import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import FormData from "form-data";
import { getTestToken } from "./testHelper.js";
import yazl from "yazl";
import ExcelJS from "exceljs";

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

describe("E2E Pipeline with MockProvider", () => {
  const app = buildApp();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("should process a ZIP of PDFs and return a valid XLSX", async () => {
    // 1. Create a zip with 2 PDFs
    const buf = await createZipBuffer((zip) => {
      zip.addBuffer(Buffer.from("%PDF-1.4 mock content A"), "docA.pdf");
      zip.addBuffer(Buffer.from("%PDF-1.4 mock content B"), "docB.pdf");
    });

    // 2. Send POST request
    const form = new FormData();
    form.append("file", buf, { filename: "test.zip", contentType: "application/zip" });
    const response = await app.inject({
      method: "POST",
      url: "/v1/extract",
      headers: { ...form.getHeaders(), Authorization: `Bearer ${getTestToken()}` },
      payload: form,
    });

    // 3. Verify HTTP status
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    // 4. Open XLSX and verify contents
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(response.rawPayload);
    const sheet = workbook.worksheets[0];

    // Check rows (header + 2 data rows)
    expect(sheet.rowCount).toBe(3);
    
    const row2 = sheet.getRow(2).values as string[];
    const row3 = sheet.getRow(3).values as string[];

    // Column 1 is Source File (1-indexed in exceljs values array, so [1] is Col A)
    expect([row2[1], row3[1]]).toContain("docA.pdf");
    expect([row2[1], row3[1]]).toContain("docB.pdf");

    // GL Effective Date is at col 5 (E)
    expect(row2[5]).toBe("2024-01-01");
  });
});
