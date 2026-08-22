import { ExtractionProvider, ExtractionResult } from "./ExtractionProvider.js";

import { env } from "../utils/env.js";

export class MockExtractionProvider implements ExtractionProvider {
  constructor() {
    if (env.NODE_ENV === "production") {
      throw new Error("CRITICAL SECURITY ERROR: MockExtractionProvider cannot be used in production.");
    }
  }

  async extractData(pdfBuffer: Buffer): Promise<ExtractionResult> {
    // Return deterministic synthetic extraction for tests
    return {
      segmentation: {
        is_coi: true,
        insured_name_block: "MOCK INSURED LLC",
        carrier_block: "MOCK CARRIER INC",
        gl_coverage_indicated: true,
        gl_section_text: "GL MOCK SECTION TEXT",
        wc_coverage_indicated: true,
        wc_section_text: "WC MOCK SECTION TEXT",
        auto_coverage_indicated: false,
        auto_section_text: null,
        umbrella_coverage_indicated: false,
        umbrella_excess_section_text: null,
        multiple_policy_periods_detected: false,
      },
      extraction: {
        subcontractor_name: { value: "MOCK INSURED LLC", confidence: "HIGH", review_required: false, source_text: "MOCK INSURED LLC", source_page: 1, reason_code: null },
        carrier: { value: "MOCK CARRIER INC", confidence: "HIGH", review_required: false, source_text: "MOCK CARRIER INC", source_page: 1, reason_code: null },
        gl_effective_date: { value: "2024-01-01", confidence: "HIGH", review_required: false, source_text: "GL MOCK SECTION TEXT", source_page: 1, reason_code: null },
        gl_expiration_date: { value: "2025-01-01", confidence: "HIGH", review_required: false, source_text: "GL MOCK SECTION TEXT", source_page: 1, reason_code: null },
        wc_effective_date: { value: "2024-01-01", confidence: "HIGH", review_required: false, source_text: "WC MOCK SECTION TEXT", source_page: 1, reason_code: null },
        wc_expiration_date: { value: "2025-01-01", confidence: "HIGH", review_required: false, source_text: "WC MOCK SECTION TEXT", source_page: 1, reason_code: null },
        auto_effective_date: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: "MISSING_FIELD" },
        auto_expiration_date: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: "MISSING_FIELD" },
        umbrella_effective_date: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: "MISSING_FIELD" },
        umbrella_expiration_date: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: "MISSING_FIELD" },
        gl_each_occurrence: { value: 1000000, confidence: "HIGH", review_required: false, source_text: "GL MOCK SECTION TEXT", source_page: 1, reason_code: null },
        gl_aggregate: { value: 2000000, confidence: "HIGH", review_required: false, source_text: "GL MOCK SECTION TEXT", source_page: 1, reason_code: null },
        wc_limit: { value: 500000, confidence: "HIGH", review_required: false, source_text: "WC MOCK SECTION TEXT", source_page: 1, reason_code: null },
        auto_limit: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: "MISSING_FIELD" },
        umbrella_limit: { value: null, confidence: null, review_required: false, source_text: null, source_page: null, reason_code: "MISSING_FIELD" },
      }
    };
  }
}
