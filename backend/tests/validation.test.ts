import { describe, it, expect } from "vitest";
import { validateExtraction } from "../src/validation/deterministic.js";
import { DocumentSegmentation, V4Extraction } from "../src/validation/schema.js";

const mockSegmentation: DocumentSegmentation = {
  is_coi: true,
  insured_name_block: null,
  carrier_block: null,
  gl_coverage_indicated: true,
  gl_section_text: "General Liability valid",
  wc_coverage_indicated: false,
  wc_section_text: null,
  auto_coverage_indicated: false,
  auto_section_text: null,
  umbrella_coverage_indicated: false,
  umbrella_excess_section_text: null,
  multiple_policy_periods_detected: false,
};

const createMockExtraction = (overrides: Partial<V4Extraction>): V4Extraction => {
  return {
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
    ...overrides
  } as V4Extraction;
};

describe("Deterministic Validation", () => {
  it("should pass valid extraction", () => {
    const ext = createMockExtraction({});
    const result = validateExtraction(ext, mockSegmentation);
    expect(result.catches.date_order).toBe(0);
    expect(result.validatedData.gl_effective_date.value).toBe("2026-01-01");
  });

  it("should reject reversed dates", () => {
    const ext = createMockExtraction({
      gl_effective_date: { value: "2027-01-01", confidence: "HIGH", review_required: false, source_text: "General Liability valid", source_page: 1, reason_code: null },
      gl_expiration_date: { value: "2026-01-01", confidence: "HIGH", review_required: false, source_text: "General Liability valid", source_page: 1, reason_code: null },
    });
    const result = validateExtraction(ext, mockSegmentation);
    expect(result.catches.date_order).toBe(1);
    expect(result.validatedData.gl_effective_date.value).toBeNull();
    expect(result.validatedData.gl_effective_date.reason_code).toBe("CONFLICTING_VALUES");
  });

  it("should enforce checked-but-blank rule", () => {
    const blankSeg: DocumentSegmentation = { ...mockSegmentation, gl_coverage_indicated: true };
    const ext = createMockExtraction({
      gl_carrier_name: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
      gl_policy_number: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
      gl_effective_date: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
      gl_expiration_date: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
      gl_each_occurrence_limit: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
      gl_general_aggregate_limit: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
    });
    
    const result = validateExtraction(ext, blankSeg);
    expect(result.validatedData.gl_effective_date.reason_code).toBe("CHECKED_BUT_BLANK");
  });

  it("should reject invalid date format", () => {
    const ext = createMockExtraction({
      gl_effective_date: { value: "01/01/2026", confidence: "HIGH", review_required: false, source_text: "General Liability valid", source_page: 1, reason_code: null },
    });
    const result = validateExtraction(ext, mockSegmentation);
    expect(result.validatedData.gl_effective_date.value).toBeNull();
    expect(result.validatedData.gl_effective_date.reason_code).toBe("AMBIGUOUS_VALUE");
  });
});
