import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fs from "fs/promises";
import { FileManager } from "../utils/fileManager.js";
import { ExtractionService } from "../services/ExtractionService.js";
import { generateXlsx } from "../export/xlsxGenerator.js";
import { BadRequestError, UnsupportedMediaTypeError, UnprocessableEntityError } from "../utils/errors.js";
import { env } from "../utils/env.js";

const extractionService = new ExtractionService();

export async function routes(fastify: FastifyInstance) {
  
  fastify.get("/health", async (request, reply) => {
    return { 
      status: "ok", 
      provider: env.CERTIFITRACK_PROVIDER,
      hasGeminiKey: !!(env.GEMINI_API_KEY && env.GEMINI_API_KEY.length > 0)
    };
  });

  fastify.post("/v1/extract", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.isMultipart()) {
      throw new UnsupportedMediaTypeError("Request is not multipart");
    }

    const fileManager = new FileManager();
    await fileManager.initialize();

    try {
      const data = await request.file({
        limits: {
          fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
        }
      });

      if (!data) {
        throw new BadRequestError("No file uploaded");
      }

      const mimeType = data.mimetype;
      const originalFilename = data.filename;

      if (mimeType !== "application/pdf" && mimeType !== "application/zip" && mimeType !== "application/x-zip-compressed") {
        throw new UnsupportedMediaTypeError("Only PDF and ZIP files are supported");
      }

      const safePath = fileManager.getSafePath(originalFilename);
      
      // Save the uploaded file to safe path
      const buffer = await data.toBuffer();
      await fs.writeFile(safePath, buffer);

      // Process the upload
      const results = await extractionService.processUpload(safePath, originalFilename, mimeType, fileManager);

      if (!results || results.length === 0) {
        throw new UnprocessableEntityError("We couldn't reliably extract insurance certificate data from the uploaded document. No workbook was generated.");
      }

      // Generate XLSX
      const xlsxBuffer = await generateXlsx(results);

      // Serialize real extracted document summary using canonical schema fields
      const summary = results.map(r => {
        const anyFieldReview = Object.values(r.extraction).some((f: any) => f?.review_required === true);
        const hasCoreInsured = !!r.extraction.named_insured?.value;
        const hasAnyPolicy = !!(
          r.extraction.gl_policy_number?.value ||
          r.extraction.wc_policy_number?.value ||
          r.extraction.auto_policy_number?.value ||
          r.extraction.umbrella_policy_number?.value
        );

        const reviewRequired = anyFieldReview || !hasCoreInsured || !hasAnyPolicy;
        let reasonCode: string | null = null;
        if (reviewRequired) {
          if (!hasCoreInsured || !hasAnyPolicy) {
            reasonCode = "INSUFFICIENT_EVIDENCE";
          } else {
            const firstReason = Object.values(r.extraction).find((f: any) => f?.reason_code && f.reason_code !== 'MISSING_FIELD')?.reason_code;
            reasonCode = firstReason || "REVIEW_REQUIRED";
          }
        }

        return {
          filename: r.filename,
          insured: r.extraction.named_insured?.value || null,
          carrier: r.extraction.gl_carrier_name?.value || r.extraction.wc_carrier_name?.value || r.extraction.auto_carrier_name?.value || r.extraction.umbrella_carrier_name?.value || null,
          policyNumber: r.extraction.gl_policy_number?.value || r.extraction.wc_policy_number?.value || r.extraction.auto_policy_number?.value || r.extraction.umbrella_policy_number?.value || null,
          effectiveDate: r.extraction.gl_effective_date?.value || r.extraction.wc_effective_date?.value || r.extraction.auto_effective_date?.value || r.extraction.umbrella_effective_date?.value || null,
          expirationDate: r.extraction.gl_expiration_date?.value || r.extraction.wc_expiration_date?.value || r.extraction.auto_expiration_date?.value || r.extraction.umbrella_expiration_date?.value || null,
          occurrenceLimit: r.extraction.gl_each_occurrence_limit?.value || r.extraction.auto_combined_single_limit?.value || r.extraction.umbrella_each_occurrence_limit?.value || null,
          aggregateLimit: r.extraction.gl_general_aggregate_limit?.value || null,
          isCoi: r.segmentation.is_coi,
          project: r.extraction.description_of_operations?.value || null,
          additionalInsured: r.extraction.additional_insured_indicated?.value || false,
          waiverOfSubrogation: r.extraction.waiver_of_subrogation_indicated?.value || false,
          reviewRequired,
          reasonCode
        };
      });

      reply.header("Access-Control-Expose-Headers", "X-Extraction-Summary, Content-Disposition");
      reply.header("X-Extraction-Summary", encodeURIComponent(JSON.stringify(summary)));
      reply.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      reply.header("Content-Disposition", `attachment; filename="certifitrack-results.xlsx"`);
      return reply.send(xlsxBuffer);

    } finally {
      // ALWAYS clean up temporary files
      await fileManager.cleanup();
    }
  });
}
