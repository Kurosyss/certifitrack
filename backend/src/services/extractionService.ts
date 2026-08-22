import fs from "fs/promises";
import { ExtractionProvider } from "../providers/ExtractionProvider.js";
import { GeminiProvider } from "../providers/GeminiProvider.js";
import { MockExtractionProvider } from "../providers/MockExtractionProvider.js";
import { FileManager } from "../utils/fileManager.js";
import { extractZipSafely } from "../utils/zipSafety.js";
import { validateExtraction } from "../validation/deterministic.js";
import { env } from "../utils/env.js";
import { logger } from "../utils/logger.js";
import { V4Extraction, DocumentSegmentation } from "../validation/schema.js";

export interface ProcessedDocument {
  filename: string;
  segmentation: DocumentSegmentation;
  extraction: V4Extraction;
}

export class ExtractionService {
  private provider: ExtractionProvider;

  constructor(provider?: ExtractionProvider) {
    if (provider) {
      this.provider = provider;
    } else if (env.CERTIFITRACK_PROVIDER === "mock") {
      this.provider = new MockExtractionProvider();
    } else {
      this.provider = new GeminiProvider();
    }
  }

  /**
   * Processes an uploaded file (ZIP or PDF), performs extraction, and applies deterministic validation.
   */
  async processUpload(
    filePath: string,
    originalFilename: string,
    mimeType: string,
    fileManager: FileManager
  ): Promise<ProcessedDocument[]> {
    const isZip = mimeType === "application/zip" || originalFilename.toLowerCase().endsWith(".zip");
    
    let filesToProcess: { filename: string; path: string }[] = [];

    if (isZip) {
      logger.info({ filename: originalFilename }, "Extracting ZIP archive...");
      filesToProcess = await extractZipSafely(filePath, fileManager);
      logger.info({ count: filesToProcess.length }, "ZIP extraction complete");
    } else {
      filesToProcess = [{ filename: originalFilename, path: filePath }];
    }

    const results: ProcessedDocument[] = [];

    for (let i = 0; i < filesToProcess.length; i += env.CONCURRENCY_LIMIT) {
      const chunk = filesToProcess.slice(i, i + env.CONCURRENCY_LIMIT);
      
      const chunkPromises = chunk.map(async (file) => {
        try {
          logger.info({ file: file.filename }, "Processing PDF document");
          const pdfBuffer = await fs.readFile(file.path);
          
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("Document processing timeout")), env.DOCUMENT_TIMEOUT_MS);
          });

          const { segmentation, extraction } = await Promise.race([
            this.provider.extractData(pdfBuffer),
            timeoutPromise
          ]);
          
          const { validatedData } = validateExtraction(extraction, segmentation);

          return {
            filename: file.filename,
            segmentation,
            extraction: validatedData
          };
        } catch (error: any) {
          logger.error({ file: file.filename, error: error.message }, "Failed to process PDF document");
          return null; // Will be filtered out
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      for (const res of chunkResults) {
        if (res) results.push(res);
      }
    }

    return results;
  }
}
