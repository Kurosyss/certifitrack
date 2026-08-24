import { GoogleGenAI } from "@google/genai";
import { ExtractionProvider, ExtractionResult } from "./ExtractionProvider.js";
import { env } from "../utils/env.js";
import { UpstreamProviderError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { 
  SegmentationSchema, 
  IsolatedExtractionSchema, 
  ZodSegmentationSchema, 
  ZodIsolatedExtractionSchema 
} from "../validation/schema.js";
import { DeterministicPdfExtractor } from "./DeterministicPdfExtractor.js";

export class GeminiProvider implements ExtractionProvider {
  private ai: GoogleGenAI | null = null;
  private fallbackExtractor = new DeterministicPdfExtractor();

  constructor() {
    if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0) {
      this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    }
  }

  async extractData(pdfBuffer: Buffer): Promise<ExtractionResult> {
    if (!this.ai) {
      logger.info("No GEMINI_API_KEY configured; running DeterministicPdfExtractor fallback.");
      return this.fallbackExtractor.extractData(pdfBuffer);
    }

    try {
      logger.debug("Starting Gemini multimodal extraction...");

      const documentPart = {
        inlineData: {
          data: pdfBuffer.toString("base64"),
          mimeType: "application/pdf",
        },
      };

      // PASS 1: Segmentation
      const segResponse = await this.ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          { 
            role: "user", 
            parts: [
              documentPart, 
              { text: "Analyze this insurance document. Segment the ACORD 25 Certificate of Liability Insurance into coverage text blocks according to the schema." }
            ] 
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: SegmentationSchema,
          temperature: 0.1,
        }
      });

      if (!segResponse.text) throw new Error("Null response from model in Pass 1 Segmentation");
      const segmentation = ZodSegmentationSchema.parse(JSON.parse(segResponse.text));

      // PASS 2: Field Extraction (passing segmentation context)
      const extractResponse = await this.ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          { 
            role: "user", 
            parts: [
              documentPart, 
              { text: `Extract all canonical ACORD 25 insurance fields based on this document segmentation:\n${JSON.stringify(segmentation, null, 2)}` }
            ] 
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: IsolatedExtractionSchema,
          temperature: 0.1,
        }
      });

      if (!extractResponse.text) throw new Error("Null response from model in Pass 2 Field Extraction");
      const extraction = ZodIsolatedExtractionSchema.parse(JSON.parse(extractResponse.text));

      logger.debug("Gemini extraction completed successfully.");
      return { segmentation, extraction };

    } catch (error: any) {
      logger.warn({ error: error.message }, "Gemini API call failed, attempting deterministic text extraction fallback...");
      try {
        const fallbackResult = await this.fallbackExtractor.extractData(pdfBuffer);
        if (fallbackResult.segmentation.is_coi && fallbackResult.extraction.named_insured.value) {
          logger.info("Deterministic fallback succeeded for text-based COI PDF.");
          return fallbackResult;
        }
      } catch (fallbackErr: any) {
        logger.error({ fallbackErr: fallbackErr.message }, "Deterministic fallback also failed");
      }

      throw new UpstreamProviderError(`Failed to extract data from upstream provider: ${error.message}`);
    }
  }
}
