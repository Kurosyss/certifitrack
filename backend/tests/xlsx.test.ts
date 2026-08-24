import { describe, it, expect } from "vitest";
import { generateXlsx } from "../src/export/xlsxGenerator.js";
import { ProcessedDocument } from "../src/services/ExtractionService.js";
import ExcelJS from "exceljs";

describe("XLSX Generator", () => {
  it("should generate a valid workbook with expected data", async () => {
    const mockDoc: ProcessedDocument = {
      filename: "test-subcontractor.pdf",
      segmentation: {
        is_coi: true,
        insured_name_block: "Atlas Ridge Mechanical LLC",
        carrier_block: "Meridian Harbor",
        gl_coverage_indicated: true,
        gl_section_text: "General Liability valid",
        wc_coverage_indicated: false,
        wc_section_text: null,
        auto_coverage_indicated: false,
        auto_section_text: null,
        umbrella_coverage_indicated: false,
        umbrella_excess_section_text: null,
        multiple_policy_periods_detected: false,
      },
      extraction: {
        named_insured: { value: "Atlas Ridge Mechanical LLC", confidence: "HIGH", review_required: false, source_text: "Atlas Ridge Mechanical LLC", source_page: 1, reason_code: null },
        producer_name: { value: "Test Broker", confidence: "HIGH", review_required: false, source_text: "Test Broker", source_page: 1, reason_code: null },
        certificate_holder: { value: "Test Holder", confidence: "HIGH", review_required: false, source_text: "Test Holder", source_page: 1, reason_code: null },
        description_of_operations: { value: "Test Project", confidence: "HIGH", review_required: false, source_text: "Test Project", source_page: 1, reason_code: null },
        gl_carrier_name: { value: "Meridian Harbor", confidence: "HIGH", review_required: false, source_text: "Meridian Harbor", source_page: 1, reason_code: null },
        gl_policy_number: { value: "GL-12345", confidence: "HIGH", review_required: false, source_text: "GL-12345", source_page: 1, reason_code: null },
        gl_effective_date: { value: "2026-01-01", confidence: "HIGH", review_required: false, source_text: "General Liability valid", source_page: 1, reason_code: null },
        gl_expiration_date: { value: "2027-01-01", confidence: "HIGH", review_required: false, source_text: "General Liability valid", source_page: 1, reason_code: null },
        gl_each_occurrence_limit: { value: 1000000, confidence: "HIGH", review_required: false, source_text: "1,000,000", source_page: 1, reason_code: null },
        gl_general_aggregate_limit: { value: 2000000, confidence: "HIGH", review_required: false, source_text: "2,000,000", source_page: 1, reason_code: null },
        wc_carrier_name: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
        wc_policy_number: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
        wc_effective_date: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
        wc_expiration_date: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
        wc_each_accident_limit: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
        auto_carrier_name: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
        auto_policy_number: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
        auto_effective_date: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
        auto_expiration_date: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
        auto_combined_single_limit: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
        umbrella_carrier_name: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
        umbrella_policy_number: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
        umbrella_effective_date: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
        umbrella_expiration_date: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
        umbrella_each_occurrence_limit: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
        additional_insured_indicated: { value: true, confidence: "HIGH", review_required: false, source_text: "Y", source_page: 1, reason_code: null },
        waiver_of_subrogation_indicated: { value: true, confidence: "HIGH", review_required: false, source_text: "Y", source_page: 1, reason_code: null },
      }
    };

    const buffer = await generateXlsx([mockDoc]);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet("COI Tracker");
    expect(sheet).toBeDefined();

    const headers = sheet!.getRow(1).values as string[];
    expect(headers).toContain("Source File");
    expect(headers).toContain("Named Insured");
    expect(headers).toContain("GL Eff Date");

    const row2 = sheet!.getRow(2).values as any[];
    expect(row2).toContain("test-subcontractor.pdf");
    expect(row2).toContain("Atlas Ridge Mechanical LLC");
  });
});
