import zlib from "zlib";
import { ExtractionProvider, ExtractionResult } from "./ExtractionProvider.js";
import { V4Extraction, DocumentSegmentation, ExtractionField, ReasonCode } from "../validation/schema.js";
import { logger } from "../utils/logger.js";

/**
 * Extracts and normalizes raw text from PDF binary buffer, handling:
 * - Uncompressed and FlateDecode streams (standard zlib & raw deflate)
 * - Object streams (/ObjStm)
 * - PDF string literals: (text) Tj, ' (newline), "
 * - PDF string arrays: [(text) -120 (more text)] TJ
 * - Hexadecimal strings: <48656c6c6f> Tj
 * - Whitespace & newline normalization
 */
function unescapePdfString(str: string): string {
  return str
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\([()\\])/g, '$1');
}

/**
 * Extracts and normalizes raw text from PDF binary buffer, handling:
 * - Uncompressed and FlateDecode streams (standard zlib & raw deflate)
 * - Object streams (/ObjStm)
 * - PDF string literals: (text) Tj, ' (newline), "
 * - PDF string arrays: [(text) -120 (more text)] TJ
 * - Hexadecimal strings: <48656c6c6f> Tj
 * - Whitespace & newline normalization
 */
export function extractTextFromPdfBuffer(buffer: Buffer): string {
  let fullText = "";
  const bufferStr = buffer.toString("binary");
  
  const processTextStream = (streamText: string) => {
    // A. Match PDF string literals with escaped characters: ( ... ) Tj, ', "
    const tjRegex = /\(((?:\\.|[^()\\])*)\)\s*(?:Tj|'|")/g;
    let tjMatch: RegExpExecArray | null;
    while ((tjMatch = tjRegex.exec(streamText)) !== null) {
      fullText += unescapePdfString(tjMatch[1]) + "\n";
    }

    // B. Match PDF string arrays: [ ... ] TJ
    const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
    let tjArrMatch: RegExpExecArray | null;
    while ((tjArrMatch = tjArrayRegex.exec(streamText)) !== null) {
      const inner = tjArrMatch[1];
      
      // Match parenthesized strings inside TJ array
      const strParts = inner.match(/\(((?:\\.|[^()\\])*)\)/g);
      if (strParts) {
        const textChunk = strParts.map(s => unescapePdfString(s.slice(1, -1))).join(" ");
        fullText += textChunk + "\n";
      }

      // Match hex strings inside TJ array
      const hexParts = inner.match(/<([0-9a-fA-F]+)>/g);
      if (hexParts) {
        const hexText = hexParts.map(h => {
          try {
            return Buffer.from(h.slice(1, -1), "hex").toString("utf-8");
          } catch {
            return "";
          }
        }).join(" ");
        fullText += hexText + "\n";
      }
    }

    // C. Match standalone hex strings: <48656c6c6f> Tj
    const hexTjRegex = /<([0-9a-fA-F]+)>\s*(?:Tj|'|")/g;
    let hexMatch: RegExpExecArray | null;
    while ((hexMatch = hexTjRegex.exec(streamText)) !== null) {
      try {
        const hexDecoded = Buffer.from(hexMatch[1], "hex").toString("utf-8");
        fullText += hexDecoded + "\n";
      } catch {}
    }
  };

  // 1. Find all stream ... endstream blocks
  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(bufferStr)) !== null) {
    const rawStream = Buffer.from(match[1], "binary");
    
    // Attempt standard FlateDecode, then raw inflate, then plain string
    let decodedText = "";
    try {
      decodedText = zlib.inflateSync(rawStream).toString("utf-8");
    } catch {
      try {
        decodedText = zlib.inflateRawSync(rawStream).toString("utf-8");
      } catch {
        decodedText = rawStream.toString("utf-8");
      }
    }

    processTextStream(decodedText);
  }

  // 2. Fallback: If no structured text operators were extracted, scan the entire buffer for readable strings
  if (fullText.trim().length === 0) {
    processTextStream(bufferStr);
  }

  // Normalize duplicate blank lines and trim
  return fullText.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Multi-Signal Insurance Certificate Classifier
 * Evaluates 4 distinct signal categories and requires:
 * 1. At least 2 distinct signal categories
 * 2. At least 1 strong insurance anchor
 */
export interface ClassificationResult {
  isCoi: boolean;
  score: number;
  categoriesFound: string[];
  anchorsFound: string[];
  reviewRequired: boolean;
  reasonCode: ReasonCode | null;
}

export function classifyCoiDocument(rawText: string): ClassificationResult {
  const norm = rawText.toLowerCase().replace(/\s+/g, ' ');

  const categoriesFound = new Set<string>();
  const anchorsFound = new Set<string>();
  let score = 0;

  // Category 1: Header / Certificate Identification Signals
  const headerSignals: { name: string; pat: RegExp; weight: number }[] = [
    { name: "CERT_TITLE", pat: /certificate\s+of\s+(?:liability\s+|commercial\s+|property\s+)?insurance/i, weight: 3 },
    { name: "EVIDENCE_TITLE", pat: /evidence\s+of\s+(?:commercial\s+|liability\s+|property\s+)?insurance/i, weight: 3 },
    { name: "ACORD_MARK", pat: /acord\s*(?:25|28|125)?\b/i, weight: 2.5 },
    { name: "INSURERS_HEADER", pat: /insurer\(?s?\)?\s+affording\s+coverage/i, weight: 2.5 },
    { name: "PRODUCER_HEADER", pat: /\bproducer\b/i, weight: 1.5 },
    { name: "HOLDER_HEADER", pat: /\bcertificate\s+holder\b/i, weight: 2 },
    { name: "INSURED_HEADER", pat: /\b(?:named\s+)?insured\b/i, weight: 1.5 }
  ];

  for (const s of headerSignals) {
    if (s.pat.test(norm)) {
      categoriesFound.add("HEADER");
      anchorsFound.add(s.name);
      score += s.weight;
    }
  }

  // Category 2: Policy & Coverage Line Anchors
  const coverageSignals: { name: string; pat: RegExp; weight: number }[] = [
    { name: "GL", pat: /(?:commercial\s+)?general\s+liability|\bcgl\b/i, weight: 2.5 },
    { name: "AUTO", pat: /auto(?:mobile)?\s+liability|any\s+auto|hired\s+autos/i, weight: 2 },
    { name: "WC", pat: /workers?\s+comp(?:ensation)?|employers?\s+liability/i, weight: 2 },
    { name: "UMBRELLA", pat: /umbrella(?:\s+liab(?:ility)?)?|excess\s+liability/i, weight: 2 },
    { name: "POLICY_NUM", pat: /policy\s*(?:#|no\.?|num(?:ber)?)\b/i, weight: 2.5 },
    { name: "POLICY_PERIOD", pat: /(?:eff(?:ective)?|exp(?:iration)?)\s*date|\b(?:eff|exp)\b\s*:\s*\d/i, weight: 2 }
  ];

  for (const s of coverageSignals) {
    if (s.pat.test(norm)) {
      categoriesFound.add("COVERAGE");
      anchorsFound.add(s.name);
      score += s.weight;
    }
  }

  // Category 3: Limits & Monetary Coverage Terms
  const limitSignals: { name: string; pat: RegExp; weight: number }[] = [
    { name: "OCCURRENCE", pat: /each\s+occurrence|\bocc\b/i, weight: 2 },
    { name: "AGGREGATE", pat: /gen(?:eral)?\s+aggregate|\bagg\b/i, weight: 2 },
    { name: "CSL", pat: /combined\s+single\s+limit|\bcsl\b/i, weight: 1.5 },
    { name: "STATUTORY", pat: /statutory\s+limits|e\.l\.\s+each\s+accident/i, weight: 1.5 },
    { name: "RETENTION", pat: /retention|\bdeductible\b/i, weight: 1 }
  ];

  for (const s of limitSignals) {
    if (s.pat.test(norm)) {
      categoriesFound.add("LIMITS");
      anchorsFound.add(s.name);
      score += s.weight;
    }
  }

  // Category 4: Endorsements & Operations
  const endorsementSignals: { name: string; pat: RegExp; weight: number }[] = [
    { name: "ADDL_INSD", pat: /add(?:itiona)?l\s+ins(?:ure)?d|additional\s+insured/i, weight: 1.5 },
    { name: "SUBR_WVD", pat: /subr(?:ogation)?\s+w(?:ai)?v(?:e)?d|waiver\s+of\s+subrogation/i, weight: 1.5 },
    { name: "OPERATIONS", pat: /description\s+of\s+operations|project\s*(?:#|no|name)?/i, weight: 1.5 }
  ];

  for (const s of endorsementSignals) {
    if (s.pat.test(norm)) {
      categoriesFound.add("ENDORSEMENTS");
      anchorsFound.add(s.name);
      score += s.weight;
    }
  }

  // Determine Strong Anchors: Requires presence of essential policy/coverage concepts
  const hasStrongAnchor = anchorsFound.has("POLICY_NUM") || 
                          anchorsFound.has("POLICY_PERIOD") || 
                          anchorsFound.has("GL") || 
                          anchorsFound.has("AUTO") || 
                          anchorsFound.has("WC") || 
                          anchorsFound.has("UMBRELLA") ||
                          anchorsFound.has("OCCURRENCE") ||
                          anchorsFound.has("CERT_TITLE") ||
                          anchorsFound.has("EVIDENCE_TITLE");

  const isCoi = categoriesFound.size >= 2 && hasStrongAnchor && score >= 4.0;
  const isAmbiguous = (categoriesFound.size >= 1 && hasStrongAnchor) || (score >= 2.5 && score < 4.0);

  return {
    isCoi,
    score,
    categoriesFound: Array.from(categoriesFound),
    anchorsFound: Array.from(anchorsFound),
    reviewRequired: isAmbiguous && !isCoi,
    reasonCode: isAmbiguous ? 'INSUFFICIENT_EVIDENCE' : null
  };
}

/**
 * Normalizes date strings (MM/DD/YYYY, YYYY-MM-DD, MM-DD-YYYY) to ISO YYYY-MM-DD.
 */
function normalizeDate(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  
  // Match YYYY-MM-DD
  const isoMatch = trimmed.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  // Match MM/DD/YYYY or MM-DD-YYYY
  const usMatch = trimmed.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (usMatch) {
    const month = usMatch[1].padStart(2, '0');
    const day = usMatch[2].padStart(2, '0');
    const year = usMatch[3];
    return `${year}-${month}-${day}`;
  }

  return null;
}

/**
 * Normalizes currency/limit strings ($1,000,000 -> 1000000).
 */
function normalizeAmount(raw: string | null): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function makeField<T>(
  value: T | null, 
  sourceText: string | null = null, 
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH',
  reasonCode: ReasonCode | null = null
): ExtractionField<T> {
  if (value === null || value === undefined) {
    return {
      value: null,
      confidence: null,
      review_required: false,
      source_text: null,
      source_page: null,
      reason_code: reasonCode || 'MISSING_FIELD'
    };
  }
  return {
    value,
    confidence,
    review_required: false,
    source_text: sourceText || String(value),
    source_page: 1,
    reason_code: null
  };
}

function extractFlexibleValue(text: string, labelRegex: RegExp): string | null {
  // 1. Try inline match (LABEL: value)
  const inlineMatch = text.match(new RegExp(labelRegex.source + `[\\t :]+([^\\n\\r]+)`, 'i'));
  if (inlineMatch && inlineMatch[1].trim().length > 0) {
    const val = inlineMatch[1].trim();
    if (!val.match(/^(?:NAIC|POLICY|EFF|EXP|CARRIER|INSURER|COVERAGES|DATE)$/i)) {
      return val;
    }
  }

  // 2. Try next line match (LABEL\nvalue)
  const nextLineMatch = text.match(new RegExp(labelRegex.source + `[\\t :]*\\r?\\n[\\t ]*([^\\n\\r]+)`, 'i'));
  if (nextLineMatch && nextLineMatch[1].trim().length > 0) {
    const val = nextLineMatch[1].trim();
    if (!val.match(/^(?:NAIC|POLICY|EFF|EXP|CARRIER|INSURER|COVERAGES|DATE)$/i)) {
      return val;
    }
  }

  return null;
}

export class DeterministicPdfExtractor implements ExtractionProvider {
  async extractData(pdfBuffer: Buffer): Promise<ExtractionResult> {
    logger.debug("Running upgraded DeterministicPdfExtractor on document buffer...");
    
    const text = extractTextFromPdfBuffer(pdfBuffer);
    const classification = classifyCoiDocument(text);

    logger.debug({ 
      isCoi: classification.isCoi, 
      score: classification.score, 
      categories: classification.categoriesFound, 
      anchors: classification.anchorsFound 
    }, "Document classification result");

    if (!classification.isCoi && !classification.reviewRequired) {
      logger.warn("Document failed multi-signal COI classification");
      const segmentation: DocumentSegmentation = {
        is_coi: false,
        insured_name_block: null,
        carrier_block: null,
        gl_coverage_indicated: false,
        gl_section_text: null,
        wc_coverage_indicated: false,
        wc_section_text: null,
        auto_coverage_indicated: false,
        auto_section_text: null,
        umbrella_coverage_indicated: false,
        umbrella_excess_section_text: null,
        multiple_policy_periods_detected: false,
      };

      const emptyExtraction: V4Extraction = {
        named_insured: makeField(null, null, 'LOW', 'NON_COI'),
        producer_name: makeField(null, null, 'LOW', 'NON_COI'),
        certificate_holder: makeField(null, null, 'LOW', 'NON_COI'),
        description_of_operations: makeField(null, null, 'LOW', 'NON_COI'),
        gl_carrier_name: makeField(null, null, 'LOW', 'NON_COI'),
        gl_policy_number: makeField(null, null, 'LOW', 'NON_COI'),
        gl_effective_date: makeField(null, null, 'LOW', 'NON_COI'),
        gl_expiration_date: makeField(null, null, 'LOW', 'NON_COI'),
        gl_each_occurrence_limit: makeField(null, null, 'LOW', 'NON_COI'),
        gl_general_aggregate_limit: makeField(null, null, 'LOW', 'NON_COI'),
        wc_carrier_name: makeField(null, null, 'LOW', 'NON_COI'),
        wc_policy_number: makeField(null, null, 'LOW', 'NON_COI'),
        wc_effective_date: makeField(null, null, 'LOW', 'NON_COI'),
        wc_expiration_date: makeField(null, null, 'LOW', 'NON_COI'),
        wc_each_accident_limit: makeField(null, null, 'LOW', 'NON_COI'),
        auto_carrier_name: makeField(null, null, 'LOW', 'NON_COI'),
        auto_policy_number: makeField(null, null, 'LOW', 'NON_COI'),
        auto_effective_date: makeField(null, null, 'LOW', 'NON_COI'),
        auto_expiration_date: makeField(null, null, 'LOW', 'NON_COI'),
        auto_combined_single_limit: makeField(null, null, 'LOW', 'NON_COI'),
        umbrella_carrier_name: makeField(null, null, 'LOW', 'NON_COI'),
        umbrella_policy_number: makeField(null, null, 'LOW', 'NON_COI'),
        umbrella_effective_date: makeField(null, null, 'LOW', 'NON_COI'),
        umbrella_expiration_date: makeField(null, null, 'LOW', 'NON_COI'),
        umbrella_each_occurrence_limit: makeField(null, null, 'LOW', 'NON_COI'),
        additional_insured_indicated: makeField(null, null, 'LOW', 'NON_COI'),
        waiver_of_subrogation_indicated: makeField(null, null, 'LOW', 'NON_COI'),
      };

      return { segmentation, extraction: emptyExtraction };
    }

    // Flexible extraction pattern matching
    const namedInsured = extractFlexibleValue(text, /(?:NAMED\s+)?INSURED\b/i);
    const producerName = extractFlexibleValue(text, /PRODUCER\b/i);
    const certHolder = extractFlexibleValue(text, /CERTIFICATE\s+HOLDER\b/i);
    const projectOps = extractFlexibleValue(text, /(?:DESCRIPTION\s+OF\s+OPERATIONS|PROJECT|LOCATION|SPECIAL\s+PROVISIONS)\b/i);

    // General Liability
    const matchGlCarrier = extractFlexibleValue(text, /(?:GL\s+CARRIER|INSURER\s+A|CARRIER\s+A)\b/i) ||
                           text.match(/COMMERCIAL\s+GENERAL\s+LIABILITY[\s\S]*?(?:INSURER|CARRIER):?\s*([^\n\r]+)/i)?.[1]?.trim() || null;
    const matchGlPolicy = text.match(/(?:GL\s+POLICY(?:\s*#|\s*NO\.?|\s*NUMBER)?|GENERAL\s+LIABILITY[\s\S]*?POLICY(?:\s*#|\s*NO\.?|\s*NUMBER)?):?\s*([A-Z0-9-]+)/i)?.[1] ||
                          text.match(/(?:POLICY\s*(?:#|NO\.?|NUMBER)?:?\s*)(GL-[A-Z0-9-]+)/i)?.[1] || null;
    const matchGlEff = text.match(/(?:(?:GL\s+)?EFF(?:ECTIVE)?(?:\s+DATE)?):?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i)?.[1] || null;
    const matchGlExp = text.match(/(?:(?:GL\s+)?EXP(?:IRATION)?(?:\s+DATE)?):?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i)?.[1] || null;
    const matchGlOcc = text.match(/(?:GL\s+OCCURRENCE|EACH\s+OCCURRENCE|OCCURRENCE\s+LIMIT):?\s*\$?([\d,]+(?:\.\d{2})?)/i)?.[1] || null;
    const matchGlAgg = text.match(/(?:GL\s+AGGREGATE|GENERAL\s+AGGREGATE|AGGREGATE\s+LIMIT):?\s*\$?([\d,]+(?:\.\d{2})?)/i)?.[1] || null;

    // Workers Compensation
    const matchWcCarrier = extractFlexibleValue(text, /(?:WC\s+CARRIER|INSURER\s+C|CARRIER\s+C|INSURER\s+D)\b/i) ||
                           text.match(/WORKERS\s+COMPENSATION[\s\S]*?(?:INSURER|CARRIER):?\s*([^\n\r]+)/i)?.[1]?.trim() || null;
    const matchWcPolicy = text.match(/(?:WC\s+POLICY(?:\s*#|\s*NO\.?|\s*NUMBER)?|WORKERS\s+COMP[\s\S]*?POLICY(?:\s*#|\s*NO\.?|\s*NUMBER)?):?\s*([A-Z0-9-]+)/i)?.[1] ||
                          text.match(/(?:POLICY\s*(?:#|NO\.?|NUMBER)?:?\s*)(WC-[A-Z0-9-]+)/i)?.[1] || null;
    const matchWcEff = text.match(/(?:WC\s+EFF(?:ECTIVE)?(?:\s+DATE)?):?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i)?.[1] || null;
    const matchWcExp = text.match(/(?:WC\s+EXP(?:IRATION)?(?:\s+DATE)?):?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i)?.[1] || null;
    const matchWcLimit = text.match(/(?:WC\s+EACH\s+ACCIDENT|E\.L\.\s+EACH\s+ACCIDENT|STATUTORY\s+LIMITS):?\s*\$?([\d,]+(?:\.\d{2})?)/i)?.[1] || null;

    // Automobile Liability
    const matchAutoCarrier = extractFlexibleValue(text, /(?:AUTO\s+CARRIER|INSURER\s+B|CARRIER\s+B)\b/i) ||
                             text.match(/AUTOMOBILE\s+LIABILITY[\s\S]*?(?:INSURER|CARRIER):?\s*([^\n\r]+)/i)?.[1]?.trim() || null;
    const matchAutoPolicy = text.match(/(?:AUTO(?:MOBILE)?\s+POLICY(?:\s*#|\s*NO\.?|\s*NUMBER)?):?\s*([A-Z0-9-]+)/i)?.[1] ||
                            text.match(/(?:POLICY\s*(?:#|NO\.?|NUMBER)?:?\s*)(AL-[A-Z0-9-]+|AUTO-[A-Z0-9-]+)/i)?.[1] || null;
    const matchAutoEff = text.match(/(?:AUTO\s+EFF(?:ECTIVE)?(?:\s+DATE)?):?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i)?.[1] || null;
    const matchAutoExp = text.match(/(?:AUTO\s+EXP(?:IRATION)?(?:\s+DATE)?):?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i)?.[1] || null;
    const matchAutoLimit = text.match(/(?:AUTO\s+CSL|COMBINED\s+SINGLE\s+LIMIT):?\s*\$?([\d,]+(?:\.\d{2})?)/i)?.[1] || null;

    // Umbrella Liability
    const matchUmbCarrier = extractFlexibleValue(text, /(?:UMBRELLA\s+CARRIER|EXCESS\s+CARRIER)\b/i) ||
                            text.match(/UMBRELLA\s+LIABILITY[\s\S]*?(?:INSURER|CARRIER):?\s*([^\n\r]+)/i)?.[1]?.trim() || null;
    const matchUmbPolicy = text.match(/(?:UMBRELLA\s+POLICY(?:\s*#|\s*NO\.?|\s*NUMBER)?|EXCESS\s+POLICY(?:\s*#|\s*NO\.?|\s*NUMBER)?):?\s*([A-Z0-9-]+)/i)?.[1] ||
                           text.match(/(?:POLICY\s*(?:#|NO\.?|NUMBER)?:?\s*)(UMB-[A-Z0-9-]+)/i)?.[1] || null;
    const matchUmbEff = text.match(/(?:UMBRELLA\s+EFF(?:ECTIVE)?(?:\s+DATE)?):?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i)?.[1] || null;
    const matchUmbExp = text.match(/(?:UMBRELLA\s+EXP(?:IRATION)?(?:\s+DATE)?):?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i)?.[1] || null;
    const matchUmbLimit = text.match(/(?:UMBRELLA\s+EACH\s+OCCURRENCE|EACH\s+OCCURRENCE\s+LIMIT):?\s*\$?([\d,]+(?:\.\d{2})?)/i)?.[1] || null;

    // Endorsements
    const matchAddlInsd = text.match(/(?:ADDITIONAL\s+INSURED|ADDL\s+INSD):?\s*(YES|Y|X|TRUE)/i);
    const matchSubrWvd = text.match(/(?:WAIVER\s+OF\s+SUBROGATION|SUBR\s+WVD):?\s*(YES|Y|X|TRUE)/i);

    const glEff = normalizeDate(matchGlEff);
    const glExp = normalizeDate(matchGlExp);
    const wcEff = normalizeDate(matchWcEff) || glEff;
    const wcExp = normalizeDate(matchWcExp) || glExp;
    const autoEff = normalizeDate(matchAutoEff) || glEff;
    const autoExp = normalizeDate(matchAutoExp) || glExp;
    const umbEff = normalizeDate(matchUmbEff) || glEff;
    const umbExp = normalizeDate(matchUmbExp) || glExp;

    const segmentation: DocumentSegmentation = {
      is_coi: true,
      insured_name_block: namedInsured ? `INSURED: ${namedInsured}` : null,
      carrier_block: matchGlCarrier || matchWcCarrier || matchAutoCarrier || matchUmbCarrier,
      gl_coverage_indicated: !!matchGlPolicy,
      gl_section_text: text,
      wc_coverage_indicated: !!matchWcPolicy,
      wc_section_text: text,
      auto_coverage_indicated: !!matchAutoPolicy,
      auto_section_text: text,
      umbrella_coverage_indicated: !!matchUmbPolicy,
      umbrella_excess_section_text: text,
      multiple_policy_periods_detected: false,
    };

    const extraction: V4Extraction = {
      named_insured: makeField(namedInsured),
      producer_name: makeField(producerName),
      certificate_holder: makeField(certHolder),
      description_of_operations: makeField(projectOps),
      
      gl_carrier_name: makeField(matchGlCarrier),
      gl_policy_number: makeField(matchGlPolicy),
      gl_effective_date: makeField(glEff),
      gl_expiration_date: makeField(glExp),
      gl_each_occurrence_limit: makeField(normalizeAmount(matchGlOcc)),
      gl_general_aggregate_limit: makeField(normalizeAmount(matchGlAgg)),
      
      wc_carrier_name: makeField(matchWcCarrier),
      wc_policy_number: makeField(matchWcPolicy),
      wc_effective_date: makeField(wcEff),
      wc_expiration_date: makeField(wcExp),
      wc_each_accident_limit: makeField(normalizeAmount(matchWcLimit)),
      
      auto_carrier_name: makeField(matchAutoCarrier),
      auto_policy_number: makeField(matchAutoPolicy),
      auto_effective_date: makeField(autoEff),
      auto_expiration_date: makeField(autoExp),
      auto_combined_single_limit: makeField(normalizeAmount(matchAutoLimit)),
      
      umbrella_carrier_name: makeField(matchUmbCarrier),
      umbrella_policy_number: makeField(matchUmbPolicy),
      umbrella_effective_date: makeField(umbEff),
      umbrella_expiration_date: makeField(umbExp),
      umbrella_each_occurrence_limit: makeField(normalizeAmount(matchUmbLimit)),
      
      additional_insured_indicated: makeField(matchAddlInsd ? true : null),
      waiver_of_subrogation_indicated: makeField(matchSubrWvd ? true : null)
    };

    return { segmentation, extraction };
  }
}
