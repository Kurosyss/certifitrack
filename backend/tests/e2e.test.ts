import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import FormData from "form-data";
import { getTestToken } from "./testHelper.js";
import yazl from "yazl";
import fs from "fs/promises";
import path from "path";
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

describe("E2E Pipeline with Real COI PDFs in ZIP Archive", () => {
  const app = buildApp();
  const fixturesDir = path.join(__dirname, "fixtures");

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("should process a ZIP of real COI PDFs and return a valid XLSX with extracted values", async () => {
    const pdf1 = await fs.readFile(path.join(fixturesDir, "certifitrack_sample_coi_test.pdf"));
    const pdf2 = await fs.readFile(path.join(fixturesDir, "certifitrack_sample_coi_test_2.pdf"));

    // 1. Create a zip with 2 real COI PDFs
    const buf = await createZipBuffer((zip) => {
      zip.addBuffer(pdf1, "harborstone.pdf");
      zip.addBuffer(pdf2, "vanguard.pdf");
    });

    // 2. Send POST request
    const form = new FormData();
    form.append("file", buf, { filename: "batch_coi.zip", contentType: "application/zip" });
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
    
    const row2 = sheet.getRow(2);
    const row3 = sheet.getRow(3);

    // Row 2 is Harborstone
    expect(row2.getCell(1).value).toBe("harborstone.pdf");
    expect(row2.getCell(2).value).toBe("Harborstone Mechanical Services LLC");
    expect(row2.getCell(4).value).toBe("GL-47Q8-9135");
    expect(row2.getCell(5).value).toBe("Meridian Harbor Insurance Company");
    expect(row2.getCell(6).value).toBe("2026-01-15");
    expect(row2.getCell(7).value).toBe("2027-01-15");
    expect(row2.getCell(8).value).toBe(1000000);

    // Row 3 is Vanguard
    expect(row3.getCell(1).value).toBe("vanguard.pdf");
    expect(row3.getCell(2).value).toBe("Vanguard Electrical Contractors Inc");
    expect(row3.getCell(4).value).toBe("GL-8821-4409");
    expect(row3.getCell(5).value).toBe("Pacific Crest Casualty Co");
    expect(row3.getCell(6).value).toBe("2026-04-01");
    expect(row3.getCell(7).value).toBe("2027-04-01");
    expect(row3.getCell(8).value).toBe(2000000);
  }, 30000);
});
