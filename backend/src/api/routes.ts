import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fs from "fs/promises";
import { FileManager } from "../utils/fileManager.js";
import { ExtractionService } from "../services/extractionService.js";
import { generateXlsx } from "../export/xlsxGenerator.js";
import { APIError, BadRequestError, UnsupportedMediaTypeError } from "../utils/errors.js";
import { env } from "../utils/env.js";

const extractionService = new ExtractionService();

export async function routes(fastify: FastifyInstance) {
  
  fastify.get("/health", async (request, reply) => {
    return { status: "ok" };
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
      
      // Save the uploaded file to the safe path
      const buffer = await data.toBuffer();
      await fs.writeFile(safePath, buffer);

      // Process the upload
      const results = await extractionService.processUpload(safePath, originalFilename, mimeType, fileManager);

      // Generate XLSX
      const xlsxBuffer = await generateXlsx(results);

      reply.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      reply.header("Content-Disposition", `attachment; filename="certifitrack-results.xlsx"`);
      return reply.send(xlsxBuffer);

    } finally {
      // ALWAYS clean up temporary files
      await fileManager.cleanup();
    }
  });
}
