import { z } from 'zod';
import { Type } from '@google/genai';

// ==========================================
// PASS 1: DOCUMENT SEGMENTATION SCHEMA
// ==========================================

export const SegmentationSchema = {
  type: Type.OBJECT,
  properties: {
    is_coi: { type: Type.BOOLEAN, description: "True if this document appears to be a Certificate of Liability Insurance." },
    insured_name_block: { type: Type.STRING, nullable: true, description: "The verbatim text block identifying the INSURED." },
    carrier_block: { type: Type.STRING, nullable: true, description: "The verbatim text block identifying the insurance carriers/companies affording coverage." },
    gl_coverage_indicated: { type: Type.BOOLEAN, description: "True if there is an indicator (like an 'X' in a checkbox or filled out text) that General Liability coverage is present." },
    gl_section_text: { type: Type.STRING, nullable: true, description: "The EXACT VERBATIM text from the General Liability section, including checkboxes, policy numbers, dates, and limits." },
    wc_coverage_indicated: { type: Type.BOOLEAN, description: "True if there is an indicator that Workers Compensation coverage is present." },
    wc_section_text: { type: Type.STRING, nullable: true, description: "The EXACT VERBATIM text from the Workers Compensation / Employers Liability section." },
    auto_coverage_indicated: { type: Type.BOOLEAN, description: "True if there is an indicator that Auto Liability coverage is present." },
    auto_section_text: { type: Type.STRING, nullable: true, description: "The EXACT VERBATIM text from the Automobile Liability section." },
    umbrella_coverage_indicated: { type: Type.BOOLEAN, description: "True if there is an indicator that Umbrella or Excess Liability coverage is present." },
    umbrella_excess_section_text: { type: Type.STRING, nullable: true, description: "The EXACT VERBATIM text from the Umbrella and/or Excess Liability section." },
    multiple_policy_periods_detected: { type: Type.BOOLEAN, description: "Set to true if there are multiple policy periods for the SAME coverage type (e.g. two GL rows with different dates)." }
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

// ==========================================
// PASS 2: FIELD EXTRACTION SCHEMA
// ==========================================

const ReasonCodeEnum = [
  'AMBIGUOUS_VALUE', 
  'ILLEGIBLE_SOURCE', 
  'CONFLICTING_VALUES', 
  'MISSING_FIELD', 
  'CHECKED_BUT_BLANK', 
  'MULTIPLE_POLICY_PERIODS', 
  'INSUFFICIENT_EVIDENCE', 
  'UNSUPPORTED_COVERAGE', 
  'NON_COI'
];

const GeminiFieldSchema = (typeStr: string) => ({
  type: Type.OBJECT,
  properties: {
    value: { type: typeStr, nullable: true },
    confidence: { type: Type.STRING, nullable: true, enum: ['HIGH', 'MEDIUM', 'LOW'] },
    review_required: { type: Type.BOOLEAN },
    source_text: { type: Type.STRING, nullable: true, description: "Verbatim text from the isolated text block serving as explicit evidence for this value." },
    source_page: { type: Type.NUMBER, nullable: true, description: "Page number where the source_text is found." },
    reason_code: { type: Type.STRING, nullable: true, enum: ReasonCodeEnum, description: "If returning null, pick the best reason code." }
  },
  required: ["value", "review_required", "source_text", "source_page", "reason_code"]
});

export const IsolatedExtractionSchema = {
  type: Type.OBJECT,
  properties: {
    subcontractor_name: GeminiFieldSchema(Type.STRING),
    carrier: GeminiFieldSchema(Type.STRING),
    gl_effective_date: GeminiFieldSchema(Type.STRING),
    gl_expiration_date: GeminiFieldSchema(Type.STRING),
    wc_effective_date: GeminiFieldSchema(Type.STRING),
    wc_expiration_date: GeminiFieldSchema(Type.STRING),
    auto_effective_date: GeminiFieldSchema(Type.STRING),
    auto_expiration_date: GeminiFieldSchema(Type.STRING),
    umbrella_effective_date: GeminiFieldSchema(Type.STRING),
    umbrella_expiration_date: GeminiFieldSchema(Type.STRING),
    gl_each_occurrence: GeminiFieldSchema(Type.NUMBER),
    gl_aggregate: GeminiFieldSchema(Type.NUMBER),
    wc_limit: GeminiFieldSchema(Type.NUMBER),
    auto_limit: GeminiFieldSchema(Type.NUMBER),
    umbrella_limit: GeminiFieldSchema(Type.NUMBER),
  },
  required: [
    "subcontractor_name", "carrier", "gl_effective_date", "gl_expiration_date", 
    "wc_effective_date", "wc_expiration_date", "auto_effective_date", 
    "auto_expiration_date", "umbrella_effective_date", "umbrella_expiration_date",
    "gl_each_occurrence", "gl_aggregate", "wc_limit", "auto_limit", "umbrella_limit"
  ]
} as any;

export const ExtractionFieldSchema = (type: any) => z.object({
  value: type.nullable(),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']).nullable(),
  review_required: z.boolean(),
  source_text: z.string().nullable(),
  source_page: z.number().nullable(),
  reason_code: z.enum([
    'AMBIGUOUS_VALUE', 'ILLEGIBLE_SOURCE', 'CONFLICTING_VALUES', 
    'MISSING_FIELD', 'CHECKED_BUT_BLANK', 'MULTIPLE_POLICY_PERIODS', 
    'INSUFFICIENT_EVIDENCE', 'UNSUPPORTED_COVERAGE', 'NON_COI'
  ]).nullable()
});

export const ZodIsolatedExtractionSchema = z.object({
  subcontractor_name: ExtractionFieldSchema(z.string()),
  carrier: ExtractionFieldSchema(z.string()),
  gl_effective_date: ExtractionFieldSchema(z.string()),
  gl_expiration_date: ExtractionFieldSchema(z.string()),
  wc_effective_date: ExtractionFieldSchema(z.string()),
  wc_expiration_date: ExtractionFieldSchema(z.string()),
  auto_effective_date: ExtractionFieldSchema(z.string()),
  auto_expiration_date: ExtractionFieldSchema(z.string()),
  umbrella_effective_date: ExtractionFieldSchema(z.string()),
  umbrella_expiration_date: ExtractionFieldSchema(z.string()),
  gl_each_occurrence: ExtractionFieldSchema(z.number()),
  gl_aggregate: ExtractionFieldSchema(z.number()),
  wc_limit: ExtractionFieldSchema(z.number()),
  auto_limit: ExtractionFieldSchema(z.number()),
  umbrella_limit: ExtractionFieldSchema(z.number())
});

export type V4Extraction = z.infer<typeof ZodIsolatedExtractionSchema>;
