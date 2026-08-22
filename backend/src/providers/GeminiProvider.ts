import { GoogleGenAI } from "@google/genai";
import { ExtractionProvider, ExtractionResult } from "./ExtractionProvider.js";
import { env } from "../utils/env.js";
import { UpstreamProviderError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { SegmentationSchema, IsolatedExtractionSchema, ZodSegmentationSchema, ZodIsolatedExtractionSchema } from "../validation/schema.js";

export class GeminiProvider implements ExtractionProvider {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }

  async extractData(pdfBuffer: Buffer): Promise<ExtractionResult> {
    try {
      logger.debug("Starting Gemini extraction...");

      const documentPart = {
        inlineData: {
          data: pdfBuffer.toString("base64"),
          mimeType: "application/pdf",
        },
      };

      // PASS 1: Segmentation
      const segResponse = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: "user", parts: [documentPart, { text: "Segment this COI document based on the schema." }] }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: SegmentationSchema,
          temperature: 0.1,
        }
      });

      if (!segResponse.text) throw new Error("Null response from model");
      const segmentation = ZodSegmentationSchema.parse(JSON.parse(segResponse.text));

      // PASS 2: Field Extraction (passing segmentation context)
      const extractResponse = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: "user", parts: [documentPart, { text: `Extract fields based on this segmentation: \n${JSON.stringify(segmentation, null, 2)}` }] }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: IsolatedExtractionSchema,
          temperature: 0.1,
        }
      });

      if (!extractResponse.text) throw new Error("Null response from model");
      const extraction = ZodIsolatedExtractionSchema.parse(JSON.parse(extractResponse.text));

      logger.debug("Gemini extraction successful");

      return { segmentation, extraction };

    } catch (error: any) {
      logger.error({ error }, "Gemini Provider Error");
      throw new UpstreamProviderError(`Failed to extract data from provider: ${error.message}`);
    }
  }
}
