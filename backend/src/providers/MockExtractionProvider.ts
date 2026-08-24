import { ExtractionProvider, ExtractionResult } from "./ExtractionProvider.js";
import { V4Extraction, DocumentSegmentation, ExtractionField } from "../validation/schema.js";

function makeField<T>(value: T | null, sourceText: string | null = null): ExtractionField<T> {
  return {
    value,
    confidence: value !== null ? "HIGH" : null,
    review_required: false,
    source_text: sourceText || (value !== null ? String(value) : null),
    source_page: 1,
    reason_code: value !== null ? null : "MISSING_FIELD"
  };
}

export class MockExtractionProvider implements ExtractionProvider {
  constructor() {
    if (process.env.NODE_ENV !== "test") {
      throw new Error("CRITICAL SECURITY ERROR: MockExtractionProvider is strictly prohibited outside automated test suites (NODE_ENV === 'test').");
    }
  }

  async extractData(pdfBuffer: Buffer): Promise<ExtractionResult> {
    const segmentation: DocumentSegmentation = {
      is_coi: true,
      insured_name_block: "MOCK INSURED LLC",
      carrier_block: "MOCK CARRIER INC",
      gl_coverage_indicated: true,
      gl_section_text: "GL MOCK SECTION TEXT",
      wc_coverage_indicated: true,
      wc_section_text: "WC MOCK SECTION TEXT",
      auto_coverage_indicated: true,
      auto_section_text: "AUTO MOCK SECTION TEXT",
      umbrella_coverage_indicated: true,
      umbrella_excess_section_text: "UMBRELLA MOCK SECTION TEXT",
      multiple_policy_periods_detected: false,
    };

    const extraction: V4Extraction = {
      named_insured: makeField("MOCK INSURED LLC", "MOCK INSURED LLC"),
      producer_name: makeField("Mock Broker Agency", "Mock Broker Agency"),
      certificate_holder: makeField("Mock Certificate Holder", "Mock Certificate Holder"),
      description_of_operations: makeField("Mock Commercial Project", "Mock Commercial Project"),
      
      gl_carrier_name: makeField("MOCK CARRIER INC", "MOCK CARRIER INC"),
      gl_policy_number: makeField("GL-TEST-12345", "GL-TEST-12345"),
      gl_effective_date: makeField("2026-01-01", "2026-01-01"),
      gl_expiration_date: makeField("2027-01-01", "2027-01-01"),
      gl_each_occurrence_limit: makeField(1000000, "1,000,000"),
      gl_general_aggregate_limit: makeField(2000000, "2,000,000"),
      
      wc_carrier_name: makeField("MOCK WC CARRIER", "MOCK WC CARRIER"),
      wc_policy_number: makeField("WC-TEST-67890", "WC-TEST-67890"),
      wc_effective_date: makeField("2026-01-01", "2026-01-01"),
      wc_expiration_date: makeField("2027-01-01", "2027-01-01"),
      wc_each_accident_limit: makeField(500000, "500,000"),
      
      auto_carrier_name: makeField("MOCK AUTO CARRIER", "MOCK AUTO CARRIER"),
      auto_policy_number: makeField("AL-TEST-11223", "AL-TEST-11223"),
      auto_effective_date: makeField("2026-01-01", "2026-01-01"),
      auto_expiration_date: makeField("2027-01-01", "2027-01-01"),
      auto_combined_single_limit: makeField(1000000, "1,000,000"),
      
      umbrella_carrier_name: makeField("MOCK UMBRELLA CARRIER", "MOCK UMBRELLA CARRIER"),
      umbrella_policy_number: makeField("UMB-TEST-44556", "UMB-TEST-44556"),
      umbrella_effective_date: makeField("2026-01-01", "2026-01-01"),
      umbrella_expiration_date: makeField("2027-01-01", "2027-01-01"),
      umbrella_each_occurrence_limit: makeField(2000000, "2,000,000"),
      
      additional_insured_indicated: makeField(true, "Y"),
      waiver_of_subrogation_indicated: makeField(true, "Y")
    };

    return { segmentation, extraction };
  }
}
