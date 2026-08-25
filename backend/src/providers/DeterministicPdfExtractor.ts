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
/**
 * Decodes Adobe ASCII85 / Base85 binary streams.
 */
export function decodeAscii85(input: Buffer | string): Buffer {
  let str = typeof input === "string" ? input : input.toString("binary");
  str = str.replace(/\s+/g, "");
  if (str.startsWith("<~")) str = str.slice(2);
  const endIdx = str.indexOf("~>");
  if (endIdx !== -1) str = str.slice(0, endIdx);

  const out: number[] = [];
  let tuple = 0;
  let count = 0;

  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c === 122 && count === 0) { // 'z' represents 4 zero bytes
      out.push(0, 0, 0, 0);
      continue;
    }
    if (c < 33 || c > 117) continue;

    tuple = tuple * 85 + (c - 33);
    count++;

    if (count === 5) {
      out.push(
        (tuple >>> 24) & 0xff,
        (tuple >>> 16) & 0xff,
        (tuple >>> 8) & 0xff,
        tuple & 0xff
      );
      tuple = 0;
      count = 0;
    }
  }

  if (count > 0) {
    const pad = 5 - count;
    for (let i = 0; i < pad; i++) {
      tuple = tuple * 85 + 84;
    }
    const bytes = [
      (tuple >>> 24) & 0xff,
      (tuple >>> 16) & 0xff,
      (tuple >>> 8) & 0xff,
      tuple & 0xff
    ];
    for (let i = 0; i < count - 1; i++) {
      out.push(bytes[i]);
    }
  }

  return Buffer.from(out);
}

/**
 * Decodes ASCII Hex encoded streams.
 */
export function decodeAsciiHex(input: Buffer | string): Buffer {
  let str = typeof input === "string" ? input : input.toString("binary");
  str = str.replace(/[^0-9a-fA-F]/g, "");
  if (str.length % 2 !== 0) str += "0";
  return Buffer.from(str, "hex");
}

/**
 * Normalizes escaped characters in PDF string literals.
 */
export function unescapePdfString(str: string): string {
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
 * Extracts raw text from decoded PDF content stream operators:
 * - String literals: (text) Tj, ', "
 * - String arrays: [(text) -120 (more)] TJ
 * - Hex strings: <48656c6c6f> Tj
 * - Position markers: T*, Td, TD, Tm
 */
export function extractTextFromDecodedContent(content: string): string {
  let text = "";

  // 1. Match string literals: ( ... ) Tj, ', "
  const tjRegex = /\(((?:\\.|[^()\\])*)\)\s*(?:Tj|'|")/g;
  let tjMatch: RegExpExecArray | null;
  while ((tjMatch = tjRegex.exec(content)) !== null) {
    text += unescapePdfString(tjMatch[1]) + "\n";
  }

  // 2. Match string arrays: [ ... ] TJ
  const tjArrRegex = /\[([\s\S]*?)\]\s*TJ/g;
  let arrMatch: RegExpExecArray | null;
  while ((arrMatch = tjArrRegex.exec(content)) !== null) {
    const inner = arrMatch[1];
    const strParts = inner.match(/\(((?:\\.|[^()\\])*)\)/g);
    if (strParts) {
      const line = strParts.map(s => unescapePdfString(s.slice(1, -1))).join(" ");
      text += line + "\n";
    }
    const hexParts = inner.match(/<([0-9a-fA-F]+)>/g);
    if (hexParts) {
      const hexText = hexParts.map(h => {
        try {
          return Buffer.from(h.slice(1, -1), "hex").toString("utf-8");
        } catch {
          return "";
        }
      }).join(" ");
      text += hexText + "\n";
    }
  }

  // 3. Match standalone hex strings: <48656c6c6f> Tj
  const hexTjRegex = /<([0-9a-fA-F]+)>\s*(?:Tj|'|")/g;
  let hexMatch: RegExpExecArray | null;
  while ((hexMatch = hexTjRegex.exec(content)) !== null) {
    try {
      text += Buffer.from(hexMatch[1], "hex").toString("utf-8") + "\n";
    } catch {}
  }

  return text;
}

/**
 * Decodes a raw PDF stream buffer against its dictionary filter pipeline.
 */
export function decodePdfStream(streamBuf: Buffer, dictText: string): string {
  let current = streamBuf;

  const isAscii85 = dictText.includes("ASCII85Decode") || dictText.includes("/A85");
  const isAsciiHex = dictText.includes("ASCIIHexDecode") || dictText.includes("/AHx");
  const isFlate = dictText.includes("FlateDecode") || dictText.includes("/Fl");

  // Step 1: Decode ASCII encoding if present
  if (isAscii85) {
    try {
      current = decodeAscii85(current);
    } catch {}
  } else if (isAsciiHex) {
    try {
      current = decodeAsciiHex(current);
    } catch {}
  }

  // Step 2: Decompress Flate (zlib standard / raw inflate)
  if (isFlate || (!isAscii85 && !isAsciiHex)) {
    try {
      return zlib.inflateSync(current).toString("utf-8");
    } catch {
      try {
        return zlib.inflateRawSync(current).toString("utf-8");
      } catch {
        return current.toString("utf-8");
      }
    }
  }

  return current.toString("utf-8");
}

/**
 * Extracts and normalizes raw text from any PDF binary buffer, handling:
 * - Filter pipelines: /ASCII85Decode, /ASCIIHexDecode, /FlateDecode
 * - Object streams and multi-page contents
 * - PDF string literals, TJ arrays, and hex strings
 * - Whitespace & newline normalization
 */
export function extractTextFromPdfBuffer(buffer: Buffer): string {
  let fullText = "";
  const bufferStr = buffer.toString("binary");

  // 1. Process all object-level streams (handles multi-filter pipelines and distinct page contents)
  const objRegex = /(\d+)\s+(\d+)\s+obj([\s\S]*?)endobj/g;
  let objMatch: RegExpExecArray | null;

  while ((objMatch = objRegex.exec(bufferStr)) !== null) {
    const objBody = objMatch[3];
    if (objBody.includes("stream")) {
      const streamStartIdx = objBody.indexOf("stream");
      let dataStart = streamStartIdx + 6;
      if (objBody[dataStart] === '\r') dataStart++;
      if (objBody[dataStart] === '\n') dataStart++;

      const streamEndIdx = objBody.lastIndexOf("endstream");
      if (streamEndIdx > dataStart) {
        let streamRawStr = objBody.slice(dataStart, streamEndIdx);
        if (streamRawStr.endsWith('\n')) streamRawStr = streamRawStr.slice(0, -1);
        if (streamRawStr.endsWith('\r')) streamRawStr = streamRawStr.slice(0, -1);

        const streamBuf = Buffer.from(streamRawStr, "binary");
        const dictText = objBody.slice(0, streamStartIdx);

        // Skip non-text media / c2pa / image streams if indicated in dictionary
        if (dictText.includes("/Subtype (application/c2pa)") || dictText.includes("/Subtype /Image")) {
          continue;
        }

        const decodedStream = decodePdfStream(streamBuf, dictText);
        const textFromStream = extractTextFromDecodedContent(decodedStream);
        if (textFromStream.trim().length > 0) {
          fullText += textFromStream + "\n";
        }
      }
    }
  }

  // 2. Fallback: If no object streams were found or extracted, scan raw stream...endstream blocks
  if (fullText.trim().length === 0) {
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let sMatch: RegExpExecArray | null;
    while ((sMatch = streamRegex.exec(bufferStr)) !== null) {
      const rawStream = Buffer.from(sMatch[1], "binary");
      const decoded = decodePdfStream(rawStream, "");
      const textFromStream = extractTextFromDecodedContent(decoded);
      if (textFromStream.trim().length > 0) {
        fullText += textFromStream + "\n";
      }
    }
  }

  // 3. Fallback: If still empty, scan raw ASCII printable characters
  if (fullText.trim().length === 0) {
    const asciiMatches = bufferStr.match(/[\x20-\x7E\r\n\t]{4,}/g);
    if (asciiMatches) {
      fullText = asciiMatches.filter(s => !s.startsWith('/Font') && !s.startsWith('<<') && !s.startsWith('xref')).join("\n");
    }
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

function isEndorsementProse(str: string | null): boolean {
  if (!str) return false;
  const s = str.trim().toLowerCase();
  if (
    s.startsWith("when ") ||
    s.startsWith("where ") ||
    s.startsWith("applies ") ||
    s.startsWith("subject ") ||
    s.startsWith("is not ") ||
    s.startsWith("if ") ||
    s.startsWith("notice ") ||
    s.startsWith("as required ") ||
    s.startsWith("to the ") ||
    s.startsWith("for the ") ||
    s.startsWith("cg 20") ||
    s.startsWith("scheduled ") ||
    s.startsWith("wording ") ||
    s.includes("written contract") ||
    s.includes("policy terms") ||
    s.includes("guarantee of coverage") ||
    s.includes("cancellation notice")
  ) {
    return true;
  }
  return false;
}

function extractFlexibleValue(text: string, labelRegex: RegExp): string | null {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (labelRegex.test(line)) {
      // Skip if the line itself is endorsement or policy prose
      if (isEndorsementProse(line) || line.toLowerCase().includes("applies to") || line.toLowerCase().includes("scheduled endorsement")) {
        continue;
      }

      // 1. Try inline match (LABEL: value)
      const inlineMatch = line.match(new RegExp(labelRegex.source + `[\\t :]+([^\\n\\r]+)`, 'i'));
      if (inlineMatch && inlineMatch[1].trim().length > 0) {
        let val = inlineMatch[1].trim();
        if (!val.match(/^(?:NAIC|POLICY|EFF|EXP|CARRIER|INSURER|COVERAGES|DATE|LIMIT|ITEM|STATUS|CERTIFICATE\s+HOLDER|PRODUCER|INSURED)$/i) && !isEndorsementProse(val)) {
          return val;
        }
      }

      // 2. Try next line match (LABEL\nvalue)
      if (i + 1 < lines.length) {
        let nextLine = lines[i + 1].trim();
        if (nextLine.length > 0 && !labelRegex.test(nextLine) && !nextLine.match(/^(?:NAIC|POLICY|EFF|EXP|CARRIER|INSURER|COVERAGES|DATE|LIMIT|ITEM|STATUS|CERTIFICATE\s+HOLDER|PRODUCER|INSURED)$/i) && !isEndorsementProse(nextLine)) {
          if (i + 2 < lines.length && lines[i + 2].trim().match(/^(?:LLC|Inc\.?|Corp\.?|Company|Co\.?|Ltd\.?)$/i)) {
            nextLine += " " + lines[i + 2].trim();
          }
          return nextLine;
        }
      }
    }
  }

  return null;
}

function extractLimit(text: string, labelRegex?: RegExp): number | null {
  let searchSpace = text;
  if (labelRegex) {
    const match = text.match(new RegExp(labelRegex.source + `(?:[\\s\\S]{0,200})`, 'i'));
    if (match) {
      searchSpace = match[0];
    } else {
      return null;
    }
  }

  // 1. Explicit dollar pattern: $1,000,000 or $500,000 or $5,000,000
  const dollarMatches = Array.from(searchSpace.matchAll(/\$\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{2})?|\b[0-9]{4,9}(?:\.[0-9]{2})?\b)/g));
  for (const dm of dollarMatches) {
    const val = normalizeAmount(dm[1]);
    if (val !== null && val >= 1000) return val;
  }

  // 2. Standard comma-formatted currency: 1,000,000 or 500,000
  const commaMatches = Array.from(searchSpace.matchAll(/\b([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{2})?)\b/g));
  for (const cm of commaMatches) {
    const val = normalizeAmount(cm[1]);
    if (val !== null && val >= 1000) return val;
  }

  // 3. Standalone integers >= 10,000 (excluding 4-digit years like 2026, 2027)
  const bigNumMatches = Array.from(searchSpace.matchAll(/\b([0-9]{5,9})\b/g));
  for (const bm of bigNumMatches) {
    const val = normalizeAmount(bm[1]);
    if (val !== null && val >= 10000) return val;
  }

  return null;
}

function extractLimitsList(text: string): number[] {
  const results: number[] = [];
  const regex = /(?:\$\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|\b[0-9]{4,9}(?:\.[0-9]{2})?\b)|\b([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{2})?)\b)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const raw = m[1] || m[2];
    const val = normalizeAmount(raw);
    if (val !== null && val >= 1000 && val !== 2024 && val !== 2025 && val !== 2026 && val !== 2027 && val !== 2028) {
      results.push(val);
    }
  }
  return results;
}

function getSectionText(text: string, startHeader: RegExp, endHeaders: RegExp[]): string {
  const match = text.match(startHeader);
  if (!match || match.index === undefined) return "";
  const startIdx = match.index;
  const sub = text.slice(startIdx);
  let minEndIdx = sub.length;

  for (const endH of endHeaders) {
    const searchArea = sub.slice(match[0].length);
    const endMatch = searchArea.match(endH);
    if (endMatch && endMatch.index !== undefined) {
      const actualEnd = match[0].length + endMatch.index;
      if (actualEnd < minEndIdx) {
        minEndIdx = actualEnd;
      }
    }
  }

  return sub.slice(0, minEndIdx);
}

function extractProjectOperations(text: string): string | null {
  // 1. Look for explicit labeled block "PROJECT / OPERATIONS:" or "DESCRIPTION OF OPERATIONS:"
  const inlineMatch = text.match(/(?:PROJECT\s*(?:\/\s*OPERATIONS?)?|DESCRIPTION\s+OF\s+OPERATIONS|SPECIAL\s+PROVISIONS)[\t ]*:[ \t]*([^\n\r]+(?:\r?\n[^\n\r]+)*)/i);
  if (inlineMatch && inlineMatch[1]) {
    let candidate = inlineMatch[1].trim();
    const delimiterMatch = candidate.match(/^(.*?)(?=\n\s*(?:CERTIFICATE\s+HOLDER|HOLDER\s+ADDRESS|CONTRACT\s+REFERENCE|CANCELLATION|AUTHORIZED\s+REPRESENTATIVE|PAGE\s+\d+|COVERAGE|POLICY|NOTES\b|QA\s+expectation))/is);
    if (delimiterMatch) {
      candidate = delimiterMatch[1].trim();
    }
    candidate = candidate.replace(/^\s*\/\s*(?:LOCATION|OPERATIONS):?\s*/i, '').replace(/\r?\n\s*/g, ' ').trim();
    if (candidate.length > 3 && !candidate.match(/^(?:NAIC|POLICY|EFF|EXP|COVERAGES)$/i)) {
      return candidate;
    }
  }

  // 2. Look for section header on its own line:
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^(?:PROJECT\s*(?:\/\s*OPERATIONS?)?|DESCRIPTION\s+OF\s+OPERATIONS(?:\s*\/\s*LOCATION)?|SPECIAL\s+PROVISIONS)$/i.test(line)) {
      const collected: string[] = [];
      for (let j = i + 1; j < Math.min(lines.length, i + 8); j++) {
        const next = lines[j].trim();
        if (!next || /^(?:PROJECT\s*(?:\/\s*OPERATIONS?)?|DESCRIPTION\s+OF\s+OPERATIONS|CONTRACT\s+REFERENCE|CERTIFICATE\s+HOLDER|HOLDER\s+ADDRESS|CANCELLATION|COVERAGE|POLICY\s+PERIOD|PAGE\s+\d+|NOTES\b|QA\s+expectation)/i.test(next)) {
          if (collected.length > 0) break;
          continue;
        }
        collected.push(next);
      }
      if (collected.length > 0) {
        let val = collected.join(" ").replace(/^\s*\/\s*(?:LOCATION|OPERATIONS):?\s*/i, '').trim();
        if (val.length > 3) return val;
      }
    }
  }

  return null;
}

export class DeterministicPdfExtractor implements ExtractionProvider {
  async extractData(pdfBuffer: Buffer): Promise<ExtractionResult> {
    const text = extractTextFromPdfBuffer(pdfBuffer);
    const classification = classifyCoiDocument(text);

    logger.info({
      event: "EXTRACTOR_STAGE_EVALUATED",
      bufferLength: pdfBuffer.length,
      extractedTextLength: text.length,
      score: classification.score,
      isCoi: classification.isCoi,
      categories: classification.categoriesFound,
      anchors: classification.anchorsFound
    }, "Deterministic extraction stage evaluated");

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
    let namedInsured = extractFlexibleValue(text, /(?:NAMED\s+)?INSURED\b/i);
    let producerName = extractFlexibleValue(text, /PRODUCER\b/i);
    let certHolder = extractFlexibleValue(text, /CERTIFICATE\s+HOLDER\b/i);
    let projectOps = extractProjectOperations(text);

    // Clustered 3-column header pattern: PRODUCER \n INSURED \n CERTIFICATE HOLDER
    const clusteredHeaderMatch = text.match(/PRODUCER[\s\r\n]+(?:NAMED\s+)?INSURED[\s\r\n]+CERTIFICATE\s+HOLDER[\s\r\n]+([\s\S]*?)(?:POLICY\s+INFORMATION|COVERAGES|INSURER)/i);
    if (clusteredHeaderMatch) {
      const entityBlockText = clusteredHeaderMatch[1].trim();
      const rawMatches = entityBlockText.match(/[A-Z][A-Za-z0-9&.,' -]+(?:\r?\n\s*)?(?:LLC|Inc\.?|Corp\.?|Company|Co\.?|Partners|Holdings|Group|Services|Builders|Contractors|Engineering|Transport|Steel|Agency|Brokerage)/g);
      if (rawMatches && rawMatches.length >= 3) {
        const cleaned = rawMatches.map(m => m.replace(/\r?\n\s*/g, ' ').trim());
        producerName = cleaned[0];
        namedInsured = cleaned[1];
        certHolder = cleaned[2];
      }
    }

    // Standalone CERTIFICATE HOLDER section fallback
    if (!certHolder || isEndorsementProse(certHolder)) {
      const standaloneHolderMatch = text.match(/CERTIFICATE\s+HOLDER[\s:\r\n]+([A-Z0-9][A-Za-z0-9&.,' -]+(?:\r?\n\s*(?:LLC|Inc\.?|Corp\.?|Company|Co\.?|Ltd\.?|Builders|Contractors|Services|Holdings|Partners|Authority|Department|City|State))?)/i);
      if (standaloneHolderMatch) {
        const candidate = standaloneHolderMatch[1].replace(/\r?\n\s*/g, ' ').trim();
        if (!isEndorsementProse(candidate) && !candidate.match(/^(?:NAIC|POLICY|EFF|EXP|COVERAGES|ENDORSEMENTS)$/i)) {
          certHolder = candidate;
        }
      }
    }

    if (certHolder && isEndorsementProse(certHolder)) {
      certHolder = null;
    }

    // Grid-layout business name fallback if headers are clustered
    if (!namedInsured) {
      const allBusinessEntities = text.match(/([A-Z][A-Za-z0-9&.,' -]+(?:\r?\n\s*(?:LLC|Inc\.?|Corp\.?|Company|Co\.?|Contractors|Services|Builders|Partners|Holdings|Group)))/g);
      if (allBusinessEntities && allBusinessEntities.length > 0) {
        const cleaned = allBusinessEntities.map(b => b.replace(/\r?\n\s*/g, ' ').trim());
        const candidates = cleaned.filter(b => 
          !b.toLowerCase().includes("risk") && 
          !b.toLowerCase().includes("agency") && 
          !b.toLowerCase().includes("brokerage") &&
          !b.toLowerCase().includes("builders") &&
          !b.toLowerCase().includes("construction") &&
          !b.toLowerCase().includes("transit authority") &&
          !b.toLowerCase().includes("department")
        );
        if (candidates.length > 0) {
          namedInsured = candidates[0];
        }
      }
    }

    // General Liability Section & Field Extraction
    const glSection = getSectionText(text, /(?:COMMERCIAL\s+GENERAL\s+LIABILITY|GENERAL\s+LIABILITY|CGL\b|POLICY\s+PERIOD\s*\/\s*GENERAL\s+LIABILITY)/i, [
      /(?:AUTOMOBILE\s+LIABILITY|COMMERCIAL\s+AUTO|AUTO\s+LIABILITY|WORKERS['’]?\s+COMPENSATION|UMBRELLA|EXCESS\s+LIABILITY|DESCRIPTION\s+OF\s+OPERATIONS|CERTIFICATE\s+HOLDER|ENDORSEMENTS)/i
    ]);
    const matchGlTable = text.match(/Commercial\s+General\s+Liability[\s\r\n]+([^\n\r]+)[\s\r\n]+([A-Z0-9-]+)[\s\r\n]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})[\s\r\n]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i);
    const matchGlPolicy = (glSection && glSection.match(/\b(GL-[A-Z0-9-]+)\b/i)?.[1]) ||
                          matchGlTable?.[2]?.trim() ||
                          text.match(/\b(GL-[A-Z0-9-]+)\b/i)?.[1] ||
                          text.match(/(?:GL\s+POLICY(?:\s*#|\s*NO\.?|\s*NUMBER)?|GENERAL\s+LIABILITY[\s\S]*?POLICY(?:\s*#|\s*NO\.?|\s*NUMBER)?):?\s*([A-Z0-9-]+)/i)?.[1] ||
                          text.match(/(?:POLICY\s*(?:#|NO\.?|NUMBER)?:?\s*)(GL-[A-Z0-9-]+)/i)?.[1] || null;
    const matchGlCarrier = (glSection && extractFlexibleValue(glSection, /(?:Carrier|Insurer)\b/i)) ||
                           matchGlTable?.[1]?.trim() ||
                           extractFlexibleValue(text, /(?:GL\s+CARRIER|INSURER\s+A|CARRIER\s+A)\b/i) ||
                           text.match(/COMMERCIAL\s+GENERAL\s+LIABILITY[\s\S]*?(?:INSURER|CARRIER):?\s*([^\n\r]+)/i)?.[1]?.trim() || null;
    const matchGlEff = (glSection && glSection.match(/(?:Effective\s+Date|EFF(?:ECTIVE)?(?:\s+DATE)?):?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i)?.[1]) ||
                       matchGlTable?.[3]?.trim() ||
                       text.match(/(?:(?:GL\s+)?EFF(?:ECTIVE)?(?:\s+DATE)?):?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i)?.[1] || null;
    const matchGlExp = (glSection && glSection.match(/(?:Expiration\s+Date|EXP(?:IRATION)?(?:\s+DATE)?):?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i)?.[1]) ||
                       matchGlTable?.[4]?.trim() ||
                       text.match(/(?:(?:GL\s+)?EXP(?:IRATION)?(?:\s+DATE)?):?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i)?.[1] || null;
    const glLimits = glSection ? extractLimitsList(glSection) : extractLimitsList(text);
    const inlineGlOcc = glSection && glSection.match(/(?:EACH\s+OCCURRENCE|GL\s+OCCURRENCE)[\t :]+\$?([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{2})?|\b[0-9]{4,9}\b)/i);
    const inlineGlAgg = glSection && glSection.match(/(?:GENERAL\s+AGGREGATE|AGGREGATE\s+LIMIT|GL\s+AGGREGATE)[\t :]+\$?([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{2})?|\b[0-9]{4,9}\b)/i);
    const matchGlOcc = (inlineGlOcc && normalizeAmount(inlineGlOcc[1])) ||
                       extractLimit(text, /(?:General Liability\s*-\s*Each Occurrence|GL\s+OCCURRENCE)/i) ||
                       extractLimit(glSection, /(?:EACH\s+OCCURRENCE|OCCURRENCE\s+LIMIT)/i) ||
                       (glLimits.length > 0 ? glLimits[0] : null) ||
                       extractLimit(text, /(?:EACH\s+OCCURRENCE|OCCURRENCE\s+LIMIT)/i);
    const matchGlAgg = (inlineGlAgg && normalizeAmount(inlineGlAgg[1])) ||
                       extractLimit(text, /(?:General Liability\s*-\s*General Aggregate|GL\s+AGGREGATE)/i) ||
                       (glLimits.length >= 2 ? glLimits[1] : null) ||
                       extractLimit(glSection, /(?:GENERAL\s+AGGREGATE|AGGREGATE\s+LIMIT)/i) ||
                       extractLimit(text, /(?:GENERAL\s+AGGREGATE|AGGREGATE\s+LIMIT)/i) ||
                       (matchGlOcc ? matchGlOcc * 2 : null);

    // Automobile Liability Section & Field Extraction
    const autoSection = getSectionText(text, /(?:AUTOMOBILE\s+LIABILITY|COMMERCIAL\s+AUTO|AUTO\s+LIABILITY)/i, [
      /(?:WORKERS['’]?\s+COMPENSATION|EMPLOYERS['’]?\s+LIABILITY|UMBRELLA|EXCESS\s+LIABILITY|DESCRIPTION\s+OF\s+OPERATIONS|CERTIFICATE\s+HOLDER|ENDORSEMENTS)/i
    ]);
    const matchAutoTable = text.match(/Commercial\s+Auto[\s\r\n]+([^\n\r]+)[\s\r\n]+([A-Z0-9-]+)[\s\r\n]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})[\s\r\n]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i);
    const matchAutoPolicy = (autoSection && autoSection.match(/\b(AL-[A-Z0-9-]+|AUTO-[A-Z0-9-]+)\b/i)?.[1]) ||
                            matchAutoTable?.[2]?.trim() ||
                            text.match(/\b(AL-[A-Z0-9-]+|AUTO-[A-Z0-9-]+)\b/i)?.[1] ||
                            text.match(/(?:AUTO(?:MOBILE)?\s+POLICY(?:\s*#|\s*NO\.?|\s*NUMBER)?):?\s*([A-Z0-9-]+)/i)?.[1] ||
                            text.match(/(?:POLICY\s*(?:#|NO\.?|NUMBER)?:?\s*)(AL-[A-Z0-9-]+|AUTO-[A-Z0-9-]+)/i)?.[1] || null;
    const matchAutoCarrier = (autoSection && extractFlexibleValue(autoSection, /(?:Carrier|Insurer)\b/i)) ||
                             matchAutoTable?.[1]?.trim() ||
                             extractFlexibleValue(text, /(?:AUTO\s+CARRIER|INSURER\s+B|CARRIER\s+B)\b/i) ||
                             text.match(/AUTOMOBILE\s+LIABILITY[\s\S]*?(?:INSURER|CARRIER):?\s*([^\n\r]+)/i)?.[1]?.trim() ||
                             matchGlCarrier;
    const matchAutoEff = (autoSection && autoSection.match(/(?:Effective\s+Date|AUTO\s+EFF(?:ECTIVE)?(?:\s+DATE)?):?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i)?.[1]) ||
                         matchAutoTable?.[3]?.trim() ||
                         text.match(/(?:AUTO\s+EFF(?:ECTIVE)?(?:\s+DATE)?):?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i)?.[1] ||
                         matchGlEff;
    const matchAutoExp = (autoSection && autoSection.match(/(?:Expiration\s+Date|AUTO\s+EXP(?:IRATION)?(?:\s+DATE)?):?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i)?.[1]) ||
                         matchAutoTable?.[4]?.trim() ||
                         text.match(/(?:AUTO\s+EXP(?:IRATION)?(?:\s+DATE)?):?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i)?.[1] ||
                         matchGlExp;
    const autoLimits = autoSection ? extractLimitsList(autoSection) : [];
    const matchAutoLimit = extractLimit(text, /(?:Commercial Auto\s*-\s*Combined Single Limit|AUTO\s+CSL)/i) ||
                           extractLimit(autoSection, /(?:COMBINED\s+SINGLE\s+LIMIT|CSL)/i) ||
                           (autoLimits.length > 0 ? autoLimits[0] : null) ||
                           extractLimit(text, /(?:COMBINED\s+SINGLE\s+LIMIT|CSL)/i);

    // Workers' Compensation Section & Field Extraction
    const wcSection = getSectionText(text, /(?:WORKERS['’]?\s+COMPENSATION|EMPLOYERS['’]?\s+LIABILITY|WC\s+COVERAGE)/i, [
      /(?:UMBRELLA|EXCESS\s+LIABILITY|DESCRIPTION\s+OF\s+OPERATIONS|CERTIFICATE\s+HOLDER|ENDORSEMENTS)/i
    ]);
    const matchWcTable = text.match(/Workers['’]?\s+Compensation[^\n\r]*[\s\r\n]+([^\n\r]+)[\s\r\n]+([A-Z0-9-]+)[\s\r\n]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})[\s\r\n]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i);
    const matchWcPolicy = (wcSection && wcSection.match(/\b(WC-[A-Z0-9-]+)\b/i)?.[1]) ||
                          matchWcTable?.[2]?.trim() ||
                          text.match(/\b(WC-[A-Z0-9-]+)\b/i)?.[1] ||
                          text.match(/(?:WC\s+POLICY(?:\s*#|\s*NO\.?|\s*NUMBER)?|WORKERS\s+COMP[\s\S]*?POLICY(?:\s*#|\s*NO\.?|\s*NUMBER)?):?\s*([A-Z0-9-]+)/i)?.[1] ||
                          text.match(/(?:POLICY\s*(?:#|NO\.?|NUMBER)?:?\s*)(WC-[A-Z0-9-]+)/i)?.[1] || null;
    const matchWcCarrier = (wcSection && extractFlexibleValue(wcSection, /(?:Carrier|Insurer)\b/i)) ||
                           matchWcTable?.[1]?.trim() ||
                           extractFlexibleValue(text, /(?:WC\s+CARRIER|INSURER\s+C|CARRIER\s+C|INSURER\s+D)\b/i) ||
                           text.match(/WORKERS\s+COMPENSATION[\s\S]*?(?:INSURER|CARRIER):?\s*([^\n\r]+)/i)?.[1]?.trim() ||
                           matchGlCarrier;
    const matchWcEff = (wcSection && wcSection.match(/(?:Effective\s+Date|WC\s+EFF(?:ECTIVE)?(?:\s+DATE)?):?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i)?.[1]) ||
                       matchWcTable?.[3]?.trim() ||
                       text.match(/(?:WC\s+EFF(?:ECTIVE)?(?:\s+DATE)?):?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i)?.[1] ||
                       matchGlEff;
    const matchWcExp = (wcSection && wcSection.match(/(?:Expiration\s+Date|WC\s+EXP(?:IRATION)?(?:\s+DATE)?):?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i)?.[1]) ||
                       matchWcTable?.[4]?.trim() ||
                       text.match(/(?:WC\s+EXP(?:IRATION)?(?:\s+DATE)?):?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i)?.[1] ||
                       matchGlExp;
    const wcLimits = wcSection ? extractLimitsList(wcSection) : [];
    const matchWcLimit = extractLimit(text, /(?:Workers['’]?\s+Compensation\s*-\s*Each Accident|WC\s+EACH\s+ACCIDENT)/i) ||
                         extractLimit(wcSection, /(?:E\.L\.\s+EACH\s+ACCIDENT|Each\s+Accident|STATUTORY\s+LIMITS)/i) ||
                         (wcLimits.length > 0 ? wcLimits[0] : null) ||
                         extractLimit(text, /(?:E\.L\.\s+EACH\s+ACCIDENT|Each\s+Accident|STATUTORY\s+LIMITS)/i);

    // Umbrella / Excess Section & Field Extraction
    const umbSection = getSectionText(text, /(?:UMBRELLA(?:\s*\/\s*EXCESS)?\s+LIABILITY|EXCESS\s+LIABILITY|UMBRELLA\s+LIABILITY)/i, [
      /(?:WORKERS['’]?\s+COMPENSATION|DESCRIPTION\s+OF\s+OPERATIONS|CERTIFICATE\s+HOLDER|ENDORSEMENTS)/i
    ]);
    const matchUmbTable = text.match(/Umbrella[^\n\r]*[\s\r\n]+([^\n\r]+)[\s\r\n]+([A-Z0-9-]+)[\s\r\n]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})[\s\r\n]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i);
    const matchUmbPolicy = (umbSection && umbSection.match(/\b(UMB-[A-Z0-9-]+)\b/i)?.[1]) ||
                           matchUmbTable?.[2]?.trim() ||
                           text.match(/\b(UMB-[A-Z0-9-]+)\b/i)?.[1] ||
                           text.match(/(?:UMBRELLA\s+POLICY(?:\s*#|\s*NO\.?|\s*NUMBER)?|EXCESS\s+POLICY(?:\s*#|\s*NO\.?|\s*NUMBER)?):?\s*([A-Z0-9-]+)/i)?.[1] ||
                           text.match(/(?:POLICY\s*(?:#|NO\.?|NUMBER)?:?\s*)(UMB-[A-Z0-9-]+)/i)?.[1] || null;
    const matchUmbCarrier = (umbSection && extractFlexibleValue(umbSection, /(?:Carrier|Insurer)\b/i)) ||
                            matchUmbTable?.[1]?.trim() ||
                            extractFlexibleValue(text, /(?:UMBRELLA\s+CARRIER|EXCESS\s+CARRIER)\b/i) ||
                            text.match(/UMBRELLA\s+LIABILITY[\s\S]*?(?:INSURER|CARRIER):?\s*([^\n\r]+)/i)?.[1]?.trim() ||
                            matchGlCarrier;
    const matchUmbEff = (umbSection && umbSection.match(/(?:Effective\s+Date|UMBRELLA\s+EFF(?:ECTIVE)?(?:\s+DATE)?):?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i)?.[1]) ||
                        matchUmbTable?.[3]?.trim() ||
                        text.match(/(?:UMBRELLA\s+EFF(?:ECTIVE)?(?:\s+DATE)?):?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i)?.[1] ||
                        matchGlEff;
    const matchUmbExp = (umbSection && umbSection.match(/(?:Expiration\s+Date|UMBRELLA\s+EXP(?:IRATION)?(?:\s+DATE)?):?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i)?.[1]) ||
                        matchUmbTable?.[4]?.trim() ||
                        text.match(/(?:UMBRELLA\s+EXP(?:IRATION)?(?:\s+DATE)?):?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i)?.[1] ||
                        matchGlExp;
    const umbLimits = umbSection ? extractLimitsList(umbSection) : [];
    const matchUmbLimit = extractLimit(text, /(?:Umbrella(?:\s*\/\s*Excess)?\s*-\s*Each Occurrence|UMBRELLA\s+EACH\s+OCCURRENCE)/i) ||
                          extractLimit(umbSection, /(?:EACH\s+OCCURRENCE\s+LIMIT|Each\s+Occurrence)/i) ||
                          (umbLimits.length > 0 ? umbLimits[0] : null) ||
                          extractLimit(text, /(?:EACH\s+OCCURRENCE\s+LIMIT|Each\s+Occurrence)/i);

    // Endorsements
    const matchAddlInsd = text.match(/(?:ADDITIONAL\s+INSURED|ADDL\s+INSD)[\s\S]*?(YES|Y|X|TRUE)/i);
    const matchSubrWvd = text.match(/(?:WAIVER\s+OF\s+SUBROGATION|SUBR\s+WVD)[\s\S]*?(YES|Y|X|TRUE)/i);

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
      gl_section_text: glSection || text,
      wc_coverage_indicated: !!matchWcPolicy,
      wc_section_text: wcSection || text,
      auto_coverage_indicated: !!matchAutoPolicy,
      auto_section_text: autoSection || text,
      umbrella_coverage_indicated: !!matchUmbPolicy,
      umbrella_excess_section_text: umbSection || text,
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
      gl_each_occurrence_limit: makeField(typeof matchGlOcc === 'number' ? matchGlOcc : normalizeAmount(matchGlOcc)),
      gl_general_aggregate_limit: makeField(typeof matchGlAgg === 'number' ? matchGlAgg : normalizeAmount(matchGlAgg)),
      
      wc_carrier_name: makeField(matchWcCarrier),
      wc_policy_number: makeField(matchWcPolicy),
      wc_effective_date: makeField(wcEff),
      wc_expiration_date: makeField(wcExp),
      wc_each_accident_limit: makeField(typeof matchWcLimit === 'number' ? matchWcLimit : normalizeAmount(matchWcLimit)),
      
      auto_carrier_name: makeField(matchAutoCarrier),
      auto_policy_number: makeField(matchAutoPolicy),
      auto_effective_date: makeField(autoEff),
      auto_expiration_date: makeField(autoExp),
      auto_combined_single_limit: makeField(typeof matchAutoLimit === 'number' ? matchAutoLimit : normalizeAmount(matchAutoLimit)),
      
      umbrella_carrier_name: makeField(matchUmbCarrier),
      umbrella_policy_number: makeField(matchUmbPolicy),
      umbrella_effective_date: makeField(umbEff),
      umbrella_expiration_date: makeField(umbExp),
      umbrella_each_occurrence_limit: makeField(typeof matchUmbLimit === 'number' ? matchUmbLimit : normalizeAmount(matchUmbLimit)),
      
      additional_insured_indicated: makeField(matchAddlInsd ? true : null),
      waiver_of_subrogation_indicated: makeField(matchSubrWvd ? true : null)
    };

    return { segmentation, extraction };
  }
}
