import { describe, it, expect } from "vitest";
import { generateXlsx } from "../src/export/xlsxGenerator.js";
import { ProcessedDocument } from "../src/services/extractionService.js";
import ExcelJS from "exceljs";

const mockResults: ProcessedDocument[] = [
  {
    filename: "test.pdf",
    segmentation: {
      is_coi: true,
      insured_name_block: "Insured",
      carrier_block: "Carrier",
      gl_coverage_indicated: true,
      gl_section_text: "GL text",
      wc_coverage_indicated: false,
      wc_section_text: null,
      auto_coverage_indicated: false,
      auto_section_text: null,
      umbrella_coverage_indicated: false,
      umbrella_excess_section_text: null,
      multiple_policy_periods_detected: false,
    },
    extraction: {
      subcontractor_name: { value: "A", confidence: "HIGH", review_required: false, source_text: "A", source_page: 1, reason_code: null },
      carrier: { value: "B", confidence: "HIGH", review_required: false, source_text: "B", source_page: 1, reason_code: null },
      gl_effective_date: { value: "2024-01-01", confidence: "HIGH", review_required: false, source_text: "General Liability valid", source_page: 1, reason_code: null },
      gl_expiration_date: { value: "2025-01-01", confidence: "HIGH", review_required: false, source_text: "General Liability valid", source_page: 1, reason_code: null },
      wc_effective_date: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
      wc_expiration_date: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
      auto_effective_date: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
      auto_expiration_date: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
      umbrella_effective_date: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
      umbrella_expiration_date: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
      gl_each_occurrence: { value: 1000, confidence: "HIGH", review_required: false, source_text: "General Liability valid", source_page: 1, reason_code: null },
      gl_aggregate: { value: 2000, confidence: "HIGH", review_required: false, source_text: "General Liability valid", source_page: 1, reason_code: null },
      wc_limit: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
      auto_limit: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
      umbrella_limit: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
    }
  }
];

describe("XLSX Generator", () => {
  it("should generate a valid workbook with expected data", async () => {
    const buffer = await generateXlsx(mockResults);
    expect(buffer).toBeDefined();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    expect(workbook.worksheets.length).toBe(1);
    const sheet = workbook.worksheets[0];
    
    // Check headers
    const headers = sheet.getRow(1).values as string[];
    expect(headers).toContain("Source File");
    expect(headers).toContain("Subcontractor Name");
    expect(headers).toContain("GL Eff Date");

    // Check data
    const row = sheet.getRow(2).values as string[];
    expect(row[1]).toBe("test.pdf");
    expect(row[3]).toBe("A"); // subcontractor
  });
});
