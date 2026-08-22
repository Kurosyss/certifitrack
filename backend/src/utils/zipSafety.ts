import yauzl from "yauzl";
import fs from "fs";
import path from "path";
import { logger } from "./logger.js";
import { PayloadTooLargeError, UnprocessableEntityError } from "./errors.js";
import { FileManager } from "./fileManager.js";

const MAX_FILES = 50;
const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface ExtractedFile {
  filename: string;
  path: string;
}

export async function extractZipSafely(
  zipFilePath: string,
  fileManager: FileManager
): Promise<ExtractedFile[]> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipFilePath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(new UnprocessableEntityError("Invalid or corrupt ZIP file"));
      if (!zipfile) return reject(new UnprocessableEntityError("ZIP file is empty or corrupt"));

      let fileCount = 0;
      let totalBytesExtracted = 0;
      const extractedFiles: ExtractedFile[] = [];

      zipfile.readEntry();

      zipfile.on("entry", (entry: yauzl.Entry) => {
        if (/\/$/.test(entry.fileName)) {
          // Directory entry, skip
          zipfile.readEntry();
          return;
        }

        // 1. Path traversal / Absolute path check
        if (
          entry.fileName.includes("..") ||
          entry.fileName.startsWith("/") ||
          entry.fileName.startsWith("\\") ||
          path.isAbsolute(entry.fileName)
        ) {
          zipfile.close();
          return reject(new UnprocessableEntityError("Malicious ZIP: Path traversal detected"));
        }

        // 2. Nested archive check
        if (entry.fileName.toLowerCase().endsWith(".zip")) {
          zipfile.close();
          return reject(new UnprocessableEntityError("Nested ZIP archives are not allowed"));
        }
        
        // 3. Extension check - only allow PDFs
        if (!entry.fileName.toLowerCase().endsWith(".pdf")) {
          logger.warn({ fileName: entry.fileName }, "Skipping non-PDF file in ZIP");
          zipfile.readEntry();
          return;
        }

        // 4. File count check
        fileCount++;
        if (fileCount > MAX_FILES) {
          zipfile.close();
          return reject(new PayloadTooLargeError(`ZIP contains too many files (max ${MAX_FILES})`));
        }

        // Create write stream
        const safeDest = fileManager.getSafePath(`extracted_${fileCount}.pdf`);

        zipfile.openReadStream(entry, (err, readStream) => {
          if (err) {
            zipfile.close();
            return reject(new UnprocessableEntityError("Error reading ZIP entry"));
          }
          if (!readStream) {
            zipfile.close();
            return reject(new UnprocessableEntityError("Error reading ZIP entry stream"));
          }

          let fileBytes = 0;
          const writeStream = fs.createWriteStream(safeDest);

          readStream.on("data", (chunk: Buffer) => {
            fileBytes += chunk.length;
            totalBytesExtracted += chunk.length;

            // 5. Zip bomb / Total size check
            if (totalBytesExtracted > MAX_TOTAL_SIZE) {
              readStream.destroy();
              writeStream.destroy();
              zipfile.close();
              return reject(new PayloadTooLargeError(`Extracted size exceeds maximum limit of 100MB`));
            }

            // 6. Individual file size check
            if (fileBytes > MAX_FILE_SIZE) {
              readStream.destroy();
              writeStream.destroy();
              zipfile.close();
              return reject(new PayloadTooLargeError(`Individual file in ZIP exceeds maximum limit of 10MB`));
            }
          });

          readStream.on("end", () => {
            extractedFiles.push({ filename: path.basename(entry.fileName), path: safeDest });
            zipfile.readEntry();
          });

          readStream.pipe(writeStream);
        });
      });

      zipfile.on("end", () => {
        resolve(extractedFiles);
      });

      zipfile.on("error", (err) => {
        reject(new UnprocessableEntityError("Error reading ZIP file: " + err.message));
      });
    });
  });
}
