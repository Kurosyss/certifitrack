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
    ...overrides
  } as V4Extraction;
};

describe("Deterministic Validation", () => {
  it("should pass valid extraction", () => {
    const ext = createMockExtraction({});
    const result = validateExtraction(ext, mockSegmentation);
    expect(result.catches.date_order).toBe(0);
    expect(result.validatedData.gl_effective_date.value).toBe("2024-01-01");
  });

  it("should reject reversed dates", () => {
    const ext = createMockExtraction({
      gl_effective_date: { value: "2025-01-01", confidence: "HIGH", review_required: false, source_text: "General Liability valid", source_page: 1, reason_code: null },
      gl_expiration_date: { value: "2024-01-01", confidence: "HIGH", review_required: false, source_text: "General Liability valid", source_page: 1, reason_code: null },
    });
    const result = validateExtraction(ext, mockSegmentation);
    expect(result.catches.date_order).toBe(1);
    expect(result.validatedData.gl_effective_date.value).toBeNull();
    expect(result.validatedData.gl_effective_date.reason_code).toBe("CONFLICTING_VALUES");
  });

  it("should enforce checked-but-blank rule", () => {
    const blankSeg: DocumentSegmentation = { ...mockSegmentation, gl_coverage_indicated: true };
    const ext = createMockExtraction({
      gl_effective_date: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
      gl_expiration_date: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
      gl_each_occurrence: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
      gl_aggregate: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: null },
    });
    
    const result = validateExtraction(ext, blankSeg);
    expect(result.validatedData.gl_effective_date.reason_code).toBe("CHECKED_BUT_BLANK");
  });

  it("should reject invalid date format", () => {
    const ext = createMockExtraction({
      gl_effective_date: { value: "01/01/2024", confidence: "HIGH", review_required: false, source_text: "General Liability valid", source_page: 1, reason_code: null },
    });
    const result = validateExtraction(ext, mockSegmentation);
    expect(result.validatedData.gl_effective_date.value).toBeNull();
    expect(result.validatedData.gl_effective_date.reason_code).toBe("AMBIGUOUS_VALUE");
  });
});
