import { V4Extraction, DocumentSegmentation } from "../validation/schema.js";

export interface ExtractionResult {
  segmentation: DocumentSegmentation;
  extraction: V4Extraction;
}

export interface ExtractionProvider {
  extractData(pdfBuffer: Buffer): Promise<ExtractionResult>;
}
