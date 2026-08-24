import fs from "fs/promises";
import { ExtractionProvider } from "../providers/ExtractionProvider.js";
import { GeminiProvider } from "../providers/GeminiProvider.js";
import { DeterministicPdfExtractor } from "../providers/DeterministicPdfExtractor.js";
import { MockExtractionProvider } from "../providers/MockExtractionProvider.js";
import { FileManager } from "../utils/fileManager.js";
import { extractZipSafely } from "../utils/zipSafety.js";
import { validateExtraction } from "../validation/deterministic.js";
import { env } from "../utils/env.js";
import { logger } from "../utils/logger.js";
import { V4Extraction, DocumentSegmentation } from "../validation/schema.js";
import { UnprocessableEntityError, UpstreamProviderError } from "../utils/errors.js";

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
      if (process.env.NODE_ENV !== "test") {
        throw new Error("CRITICAL: Mock provider cannot be activated outside automated test runs.");
      }
      this.provider = new MockExtractionProvider();
    } else if (env.CERTIFITRACK_PROVIDER === "deterministic") {
      this.provider = new DeterministicPdfExtractor();
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

    if (filesToProcess.length === 0) {
      throw new UnprocessableEntityError("ZIP file contains no supported PDF documents.");
    }

    const results: ProcessedDocument[] = [];
    const errors: { file: string; error: string }[] = [];

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

          // Broadened Quality Gate:
          // Check for valid COI classification OR presence of verifiable insurance anchors across any coverage dimension
          const hasInsuranceAnchor = !!(
            validatedData.named_insured?.value ||
            validatedData.gl_policy_number?.value ||
            validatedData.wc_policy_number?.value ||
            validatedData.auto_policy_number?.value ||
            validatedData.umbrella_policy_number?.value ||
            validatedData.gl_carrier_name?.value ||
            validatedData.wc_carrier_name?.value ||
            validatedData.auto_carrier_name?.value ||
            validatedData.umbrella_carrier_name?.value ||
            validatedData.certificate_holder?.value ||
            validatedData.gl_effective_date?.value ||
            validatedData.wc_effective_date?.value ||
            validatedData.auto_effective_date?.value ||
            validatedData.umbrella_effective_date?.value
          );

          if (!segmentation.is_coi && !hasInsuranceAnchor) {
            logger.warn({ file: file.filename, is_coi: segmentation.is_coi }, "Quality gate rejected document: Neither COI classification nor verifiable insurance anchors found");
            return null;
          }

          // If some core fields are missing, ensure document is marked with explicit review state
          const hasCoreFields = !!(
            validatedData.named_insured?.value &&
            (validatedData.gl_policy_number?.value || validatedData.wc_policy_number?.value || validatedData.auto_policy_number?.value || validatedData.umbrella_policy_number?.value)
          );

          if (!hasCoreFields) {
            if (!validatedData.named_insured?.value && validatedData.named_insured) {
              validatedData.named_insured.review_required = true;
              validatedData.named_insured.reason_code = validatedData.named_insured.reason_code || 'INSUFFICIENT_EVIDENCE';
            }
          }

          return {
            filename: file.filename,
            segmentation,
            extraction: validatedData
          };
        } catch (error: any) {
          logger.error({ file: file.filename, error: error.message }, "Failed to extract PDF document");
          errors.push({ file: file.filename, error: error.message });
          return null;
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      for (const res of chunkResults) {
        if (res) results.push(res);
      }
    }

    // Quality gate: If no files could be extracted at all, fail honestly with an explicit error
    if (results.length === 0) {
      const errorMsg = errors.length > 0 ? errors.map(e => `${e.file}: ${e.error}`).join("; ") : "No valid insurance certificate data could be extracted.";
      throw new UnprocessableEntityError(`Extraction failed: ${errorMsg}`);
    }

    return results;
  }
}
