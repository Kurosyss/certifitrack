import { z } from 'zod';
import { Type } from '@google/genai';

// ==========================================
// CANONICAL ACORD 25 SCHEMA
// ==========================================

export const ReasonCodeEnum = [
  'AMBIGUOUS_VALUE', 
  'ILLEGIBLE_SOURCE', 
  'CONFLICTING_VALUES', 
  'MISSING_FIELD', 
  'CHECKED_BUT_BLANK', 
  'MULTIPLE_POLICY_PERIODS', 
  'INSUFFICIENT_EVIDENCE', 
  'UNSUPPORTED_COVERAGE', 
  'NON_COI'
] as const;

export type ReasonCode = typeof ReasonCodeEnum[number];

// Helper to construct Gemini Schema
const GeminiFieldSchema = (typeStr: string) => ({
  type: Type.OBJECT,
  properties: {
    value: { type: typeStr, nullable: true },
    confidence: { type: Type.STRING, nullable: true, description: "HIGH, MEDIUM, or LOW" },
    review_required: { type: Type.BOOLEAN },
    source_text: { type: Type.STRING, nullable: true, description: "Verbatim text from document as evidence." },
    source_page: { type: Type.NUMBER, nullable: true, description: "Page number where evidence is found." },
    reason_code: { type: Type.STRING, nullable: true, description: "Reason code if review is required (e.g. MISSING_FIELD, AMBIGUOUS_VALUE, NON_COI)." }
  },
  required: ["value", "review_required", "source_text", "source_page", "reason_code"]
});

export const SegmentationSchema = {
  type: Type.OBJECT,
  properties: {
    is_coi: { type: Type.BOOLEAN, description: "True if this document is a Certificate of Liability Insurance (e.g. ACORD 25)." },
    insured_name_block: { type: Type.STRING, nullable: true, description: "Verbatim text identifying Named Insured." },
    carrier_block: { type: Type.STRING, nullable: true, description: "Verbatim text identifying Insurers / Carriers." },
    gl_coverage_indicated: { type: Type.BOOLEAN, description: "True if General Liability coverage is indicated." },
    gl_section_text: { type: Type.STRING, nullable: true, description: "Verbatim text from General Liability section." },
    wc_coverage_indicated: { type: Type.BOOLEAN, description: "True if Workers Comp coverage is indicated." },
    wc_section_text: { type: Type.STRING, nullable: true, description: "Verbatim text from Workers Comp section." },
    auto_coverage_indicated: { type: Type.BOOLEAN, description: "True if Auto Liability coverage is indicated." },
    auto_section_text: { type: Type.STRING, nullable: true, description: "Verbatim text from Auto Liability section." },
    umbrella_coverage_indicated: { type: Type.BOOLEAN, description: "True if Umbrella/Excess coverage is indicated." },
    umbrella_excess_section_text: { type: Type.STRING, nullable: true, description: "Verbatim text from Umbrella/Excess section." },
    multiple_policy_periods_detected: { type: Type.BOOLEAN, description: "True if multiple policy periods detected." }
  },
  required: [
    "is_coi", 
    "insured_name_block", 
    "carrier_block", 
    "gl_coverage_indicated",
    "gl_section_text", 
    "wc_coverage_indicated",
    "wc_section_text", 
    "auto_coverage_indicated",
    "auto_section_text", 
    "umbrella_coverage_indicated",
    "umbrella_excess_section_text", 
    "multiple_policy_periods_detected"
  ]
} as any;

export const ZodSegmentationSchema = z.object({
  is_coi: z.boolean(),
  insured_name_block: z.string().nullable(),
  carrier_block: z.string().nullable(),
  gl_coverage_indicated: z.boolean(),
  gl_section_text: z.string().nullable(),
  wc_coverage_indicated: z.boolean(),
  wc_section_text: z.string().nullable(),
  auto_coverage_indicated: z.boolean(),
  auto_section_text: z.string().nullable(),
  umbrella_coverage_indicated: z.boolean(),
  umbrella_excess_section_text: z.string().nullable(),
  multiple_policy_periods_detected: z.boolean()
});

export type DocumentSegmentation = z.infer<typeof ZodSegmentationSchema>;

export const IsolatedExtractionSchema = {
  type: Type.OBJECT,
  properties: {
    named_insured: GeminiFieldSchema(Type.STRING),
    producer_name: GeminiFieldSchema(Type.STRING),
    certificate_holder: GeminiFieldSchema(Type.STRING),
    description_of_operations: GeminiFieldSchema(Type.STRING),
    
    // General Liability
    gl_carrier_name: GeminiFieldSchema(Type.STRING),
    gl_policy_number: GeminiFieldSchema(Type.STRING),
    gl_effective_date: GeminiFieldSchema(Type.STRING),
    gl_expiration_date: GeminiFieldSchema(Type.STRING),
    gl_each_occurrence_limit: GeminiFieldSchema(Type.NUMBER),
    gl_general_aggregate_limit: GeminiFieldSchema(Type.NUMBER),
    
    // Workers Compensation
    wc_carrier_name: GeminiFieldSchema(Type.STRING),
    wc_policy_number: GeminiFieldSchema(Type.STRING),
    wc_effective_date: GeminiFieldSchema(Type.STRING),
    wc_expiration_date: GeminiFieldSchema(Type.STRING),
    wc_each_accident_limit: GeminiFieldSchema(Type.NUMBER),
    
    // Commercial Auto
    auto_carrier_name: GeminiFieldSchema(Type.STRING),
    auto_policy_number: GeminiFieldSchema(Type.STRING),
    auto_effective_date: GeminiFieldSchema(Type.STRING),
    auto_expiration_date: GeminiFieldSchema(Type.STRING),
    auto_combined_single_limit: GeminiFieldSchema(Type.NUMBER),
    
    // Umbrella / Excess
    umbrella_carrier_name: GeminiFieldSchema(Type.STRING),
    umbrella_policy_number: GeminiFieldSchema(Type.STRING),
    umbrella_effective_date: GeminiFieldSchema(Type.STRING),
    umbrella_expiration_date: GeminiFieldSchema(Type.STRING),
    umbrella_each_occurrence_limit: GeminiFieldSchema(Type.NUMBER),
    
    // Endorsements
    additional_insured_indicated: GeminiFieldSchema(Type.BOOLEAN),
    waiver_of_subrogation_indicated: GeminiFieldSchema(Type.BOOLEAN)
  },
  required: [
    "named_insured", "producer_name", "certificate_holder", "description_of_operations",
    "gl_carrier_name", "gl_policy_number", "gl_effective_date", "gl_expiration_date", "gl_each_occurrence_limit", "gl_general_aggregate_limit",
    "wc_carrier_name", "wc_policy_number", "wc_effective_date", "wc_expiration_date", "wc_each_accident_limit",
    "auto_carrier_name", "auto_policy_number", "auto_effective_date", "auto_expiration_date", "auto_combined_single_limit",
    "umbrella_carrier_name", "umbrella_policy_number", "umbrella_effective_date", "umbrella_expiration_date", "umbrella_each_occurrence_limit",
    "additional_insured_indicated", "waiver_of_subrogation_indicated"
  ]
} as any;

export const ExtractionFieldSchema = <T extends z.ZodTypeAny>(type: T) => z.object({
  value: type.nullable(),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']).nullable(),
  review_required: z.boolean(),
  source_text: z.string().nullable(),
  source_page: z.number().nullable(),
  reason_code: z.enum(ReasonCodeEnum).nullable()
});

export const ZodIsolatedExtractionSchema = z.object({
  named_insured: ExtractionFieldSchema(z.string()),
  producer_name: ExtractionFieldSchema(z.string()),
  certificate_holder: ExtractionFieldSchema(z.string()),
  description_of_operations: ExtractionFieldSchema(z.string()),
  
  gl_carrier_name: ExtractionFieldSchema(z.string()),
  gl_policy_number: ExtractionFieldSchema(z.string()),
  gl_effective_date: ExtractionFieldSchema(z.string()),
  gl_expiration_date: ExtractionFieldSchema(z.string()),
  gl_each_occurrence_limit: ExtractionFieldSchema(z.number()),
  gl_general_aggregate_limit: ExtractionFieldSchema(z.number()),
  
  wc_carrier_name: ExtractionFieldSchema(z.string()),
  wc_policy_number: ExtractionFieldSchema(z.string()),
  wc_effective_date: ExtractionFieldSchema(z.string()),
  wc_expiration_date: ExtractionFieldSchema(z.string()),
  wc_each_accident_limit: ExtractionFieldSchema(z.number()),
  
  auto_carrier_name: ExtractionFieldSchema(z.string()),
  auto_policy_number: ExtractionFieldSchema(z.string()),
  auto_effective_date: ExtractionFieldSchema(z.string()),
  auto_expiration_date: ExtractionFieldSchema(z.string()),
  auto_combined_single_limit: ExtractionFieldSchema(z.number()),
  
  umbrella_carrier_name: ExtractionFieldSchema(z.string()),
  umbrella_policy_number: ExtractionFieldSchema(z.string()),
  umbrella_effective_date: ExtractionFieldSchema(z.string()),
  umbrella_expiration_date: ExtractionFieldSchema(z.string()),
  umbrella_each_occurrence_limit: ExtractionFieldSchema(z.number()),
  
  additional_insured_indicated: ExtractionFieldSchema(z.boolean()),
  waiver_of_subrogation_indicated: ExtractionFieldSchema(z.boolean())
});

export type V4Extraction = z.infer<typeof ZodIsolatedExtractionSchema>;
export type ExtractionField<T = any> = {
  value: T | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  review_required: boolean;
  source_text: string | null;
  source_page: number | null;
  reason_code: ReasonCode | null;
};
