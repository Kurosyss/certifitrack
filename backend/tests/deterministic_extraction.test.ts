import { describe, it, expect } from "vitest";
import fs from "fs/promises";
import path from "path";
import { DeterministicPdfExtractor, extractTextFromPdfBuffer } from "../src/providers/DeterministicPdfExtractor.js";
import { validateExtraction } from "../src/validation/deterministic.js";
import { generateXlsx } from "../src/export/xlsxGenerator.js";
import ExcelJS from "exceljs";

describe("Deterministic Real PDF Extraction & Multi-Signal Classifier Suite", () => {
  const extractor = new DeterministicPdfExtractor();
  const fixturesDir = path.join(__dirname, "fixtures");

  it("1. should extract exact expected values from certifitrack_sample_coi_test.pdf (Harborstone)", async () => {
    const pdfPath = path.join(fixturesDir, "certifitrack_sample_coi_test.pdf");
    const pdfBuffer = await fs.readFile(pdfPath);

    const { segmentation, extraction } = await extractor.extractData(pdfBuffer);
    expect(segmentation.is_coi).toBe(true);

    const { validatedData } = validateExtraction(extraction, segmentation);

    console.log("=== FULL RAW TEXT START ===");
    console.log(extractTextFromPdfBuffer(pdfBuffer));
    console.log("=== FULL RAW TEXT END ===");

    expect(validatedData.named_insured.value).toBe("Harborstone Mechanical Services LLC");
    expect(validatedData.certificate_holder.value).toBe("Northbridge Commercial Builders LLC");
    expect(validatedData.certificate_holder.value).not.toContain("when required by written contract");
    expect(validatedData.description_of_operations.value).toBe("Ridgeway Distribution Center Expansion, Denver, Colorado.");
    expect(validatedData.gl_carrier_name.value).toBe("Meridian Harbor Insurance Company");
    expect(validatedData.gl_policy_number.value).toBe("GL-47Q8-9135");
    expect(validatedData.gl_effective_date.value).toBe("2026-01-15");
    expect(validatedData.gl_expiration_date.value).toBe("2027-01-15");
    expect(validatedData.gl_each_occurrence_limit.value).toBe(1000000);
    expect(validatedData.gl_general_aggregate_limit.value).toBe(2000000);
    expect(validatedData.auto_policy_number.value).toBe("AL-26-44018");
    expect(validatedData.wc_policy_number.value).toBe("WC-88210-26");
    expect(validatedData.umbrella_policy_number.value).toBe("UMB-77421");
    expect(validatedData.additional_insured_indicated.value).toBe(true);
    expect(validatedData.waiver_of_subrogation_indicated.value).toBe(true);
  });

  it("1b. should extract exact expected values from certifitrack_sample_coi_synthetic_1741.pdf (Synthetic 1.7KB Fixture)", async () => {
    const pdfPath = path.join(fixturesDir, "certifitrack_sample_coi_synthetic_1741.pdf");
    const pdfBuffer = await fs.readFile(pdfPath);

    const { segmentation, extraction } = await extractor.extractData(pdfBuffer);
    expect(segmentation.is_coi).toBe(true);

    const { validatedData } = validateExtraction(extraction, segmentation);

    expect(validatedData.named_insured.value).toBe("Harborstone Mechanical Services LLC");
    expect(validatedData.certificate_holder.value).toBe("Turner Construction Management");
    expect(validatedData.certificate_holder.value).not.toContain("when required by written contract");
    expect(validatedData.gl_carrier_name.value).toBe("Meridian Harbor Insurance Company");
    expect(validatedData.gl_policy_number.value).toBe("GL-47Q8-9135");
    expect(validatedData.gl_effective_date.value).toBe("2026-01-15");
    expect(validatedData.gl_expiration_date.value).toBe("2027-01-15");
    expect(validatedData.gl_each_occurrence_limit.value).toBe(1000000);
    expect(validatedData.gl_general_aggregate_limit.value).toBe(2000000);
    expect(validatedData.auto_policy_number.value).toBe("AL-26-44018");
    expect(validatedData.wc_policy_number.value).toBe("WC-88210-26");
    expect(validatedData.umbrella_policy_number.value).toBe("UMB-77421");
    expect(validatedData.additional_insured_indicated.value).toBe(true);
    expect(validatedData.waiver_of_subrogation_indicated.value).toBe(true);
  });

  it("2. should extract distinct dynamic values from certifitrack_sample_coi_test_2.pdf (Vanguard Electrical)", async () => {
    const pdfPath = path.join(fixturesDir, "certifitrack_sample_coi_test_2.pdf");
    const pdfBuffer = await fs.readFile(pdfPath);

    const { segmentation, extraction } = await extractor.extractData(pdfBuffer);
    expect(segmentation.is_coi).toBe(true);

    const { validatedData } = validateExtraction(extraction, segmentation);

    expect(validatedData.named_insured.value).toBe("Vanguard Electrical Contractors Inc");
    expect(validatedData.gl_carrier_name.value).toBe("Pacific Crest Casualty Co");
    expect(validatedData.gl_policy_number.value).toBe("GL-8821-4409");
    expect(validatedData.gl_effective_date.value).toBe("2026-04-01");
    expect(validatedData.gl_expiration_date.value).toBe("2027-04-01");
    expect(validatedData.gl_each_occurrence_limit.value).toBe(2000000);
    expect(validatedData.gl_general_aggregate_limit.value).toBe(4000000);
  });

  it("3. should extract valid COI with multi-line layout and line breaks (Olympic Steel)", async () => {
    const pdfPath = path.join(fixturesDir, "coi_multiline_variation.pdf");
    const pdfBuffer = await fs.readFile(pdfPath);

    const { segmentation, extraction } = await extractor.extractData(pdfBuffer);
    expect(segmentation.is_coi).toBe(true);

    const { validatedData } = validateExtraction(extraction, segmentation);
    expect(validatedData.named_insured.value).toBe("Olympic Steel Structures LLC");
    expect(validatedData.gl_policy_number.value).toBe("GL-9921-1002");
    expect(validatedData.gl_effective_date.value).toBe("2026-06-01");
    expect(validatedData.gl_expiration_date.value).toBe("2027-06-01");
    expect(validatedData.gl_each_occurrence_limit.value).toBe(1000000);
  });

  it("4. should extract valid COI missing ACORD 25 phrase (Sierra Crest Engineering)", async () => {
    const pdfPath = path.join(fixturesDir, "coi_no_acord_phrase.pdf");
    const pdfBuffer = await fs.readFile(pdfPath);

    const { segmentation, extraction } = await extractor.extractData(pdfBuffer);
    expect(segmentation.is_coi).toBe(true);

    const { validatedData } = validateExtraction(extraction, segmentation);
    expect(validatedData.named_insured.value).toBe("Sierra Crest Engineering Corp");
    expect(validatedData.gl_policy_number.value).toBe("GL-5532-8819");
    expect(validatedData.gl_effective_date.value).toBe("2026-03-15");
    expect(validatedData.gl_expiration_date.value).toBe("2027-03-15");
    expect(validatedData.gl_each_occurrence_limit.value).toBe(3000000);
  });

  it("5. should extract COI with Auto, WC, and Umbrella Only (Horizon Transport)", async () => {
    const pdfPath = path.join(fixturesDir, "coi_auto_wc_umbrella_only.pdf");
    const pdfBuffer = await fs.readFile(pdfPath);

    const { segmentation, extraction } = await extractor.extractData(pdfBuffer);
    expect(segmentation.is_coi).toBe(true);

    const { validatedData } = validateExtraction(extraction, segmentation);
    expect(validatedData.named_insured.value).toBe("Horizon Transport & Logistics LLC");
    expect(validatedData.auto_policy_number.value).toBe("AL-8832-1109");
    expect(validatedData.auto_combined_single_limit.value).toBe(2000000);
    expect(validatedData.wc_policy_number.value).toBe("WC-4412-9908");
    expect(validatedData.umbrella_policy_number.value).toBe("UMB-2219-01");
  });

  it("6. should process partial/ambiguous COI into controlled review state", async () => {
    const pdfPath = path.join(fixturesDir, "coi_partial_ambiguous.pdf");
    const pdfBuffer = await fs.readFile(pdfPath);

    const { segmentation, extraction } = await extractor.extractData(pdfBuffer);
    expect(segmentation.is_coi).toBe(true);

    const { validatedData } = validateExtraction(extraction, segmentation);
    // Policy exists, but named insured is missing -> should require review
    expect(validatedData.gl_policy_number.value).toBe("GL-1122-3344");
    expect(validatedData.named_insured.value).toBeNull();
  });

  it("7. should reject malformed / non-COI document with is_coi: false", async () => {
    const pdfPath = path.join(fixturesDir, "malformed_corrupt.pdf");
    const pdfBuffer = await fs.readFile(pdfPath);

    const { segmentation, extraction } = await extractor.extractData(pdfBuffer);
    expect(segmentation.is_coi).toBe(false);
    expect(extraction.named_insured.value).toBeNull();
    expect(extraction.gl_policy_number.value).toBeNull();
  });

  it("8. should reject clearly unrelated invoice PDF with is_coi: false", async () => {
    const pdfPath = path.join(fixturesDir, "invoice_non_coi.pdf");
    const pdfBuffer = await fs.readFile(pdfPath);

    const { segmentation, extraction } = await extractor.extractData(pdfBuffer);
    expect(segmentation.is_coi).toBe(false);
    expect(extraction.named_insured.value).toBeNull();
    expect(extraction.gl_policy_number.value).toBeNull();
  });

  it("9. should extract detailed synthetic COI with full coverage limits and carriers", async () => {
    const pdfPath = path.join(fixturesDir, "certifitrack_detailed_synthetic_coi.pdf");
    const pdfBuffer = await fs.readFile(pdfPath);

    const { segmentation, extraction } = await extractor.extractData(pdfBuffer);
    expect(segmentation.is_coi).toBe(true);

    const { validatedData } = validateExtraction(extraction, segmentation);

    expect(validatedData.named_insured.value).toBe("BlueCedar Mechanical & Electrical Services LLC");
    expect(validatedData.certificate_holder.value).toBe("Evergreen Commercial Builders LLC");
    
    // GL
    expect(validatedData.gl_policy_number.value).toBe("GL-26-78431-CGL");
    expect(validatedData.gl_carrier_name.value).toBe("Prairie State Casualty Company");
    expect(validatedData.gl_effective_date.value).toBe("2026-02-01");
    expect(validatedData.gl_expiration_date.value).toBe("2027-02-01");
    expect(validatedData.gl_each_occurrence_limit.value).toBe(1000000);
    expect(validatedData.gl_general_aggregate_limit.value).toBe(2000000);

    // Auto
    expect(validatedData.auto_policy_number.value).toBe("AL-26-44018-AUTO");
    expect(validatedData.auto_carrier_name.value).toBe("Prairie State Casualty Company");
    expect(validatedData.auto_effective_date.value).toBe("2026-02-01");
    expect(validatedData.auto_expiration_date.value).toBe("2027-02-01");
    expect(validatedData.auto_combined_single_limit.value).toBe(1000000);

    // WC
    expect(validatedData.wc_policy_number.value).toBe("WC-88210-26-07");
    expect(validatedData.wc_carrier_name.value).toBe("Summit Peak Indemnity Co.");
    expect(validatedData.wc_effective_date.value).toBe("2026-02-01");
    expect(validatedData.wc_expiration_date.value).toBe("2027-02-01");
    expect(validatedData.wc_each_accident_limit.value).toBe(1000000);

    // Umbrella
    expect(validatedData.umbrella_policy_number.value).toBe("UMB-77421-26");
    expect(validatedData.umbrella_carrier_name.value).toBe("Meridian Harbor Insurance Company");
    expect(validatedData.umbrella_effective_date.value).toBe("2026-02-01");
    expect(validatedData.umbrella_expiration_date.value).toBe("2027-02-01");
    expect(validatedData.umbrella_each_occurrence_limit.value).toBe(5000000);

    // Endorsements & Operations
    expect(validatedData.additional_insured_indicated.value).toBe(true);
    expect(validatedData.waiver_of_subrogation_indicated.value).toBe(true);
    expect(validatedData.description_of_operations.value).toContain("Summit Health Campus - Mechanical Retrofit, Denver, Colorado");
  });
});
