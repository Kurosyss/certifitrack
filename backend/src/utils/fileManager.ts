import fs from "fs/promises";
import path from "path";
import os from "os";
import { v4 as uuidv4 } from "uuid";
import { logger } from "./logger.js";

export class FileManager {
  public tempDir: string;

  constructor() {
    this.tempDir = path.join(os.tmpdir(), `certifitrack-${uuidv4()}`);
  }

  /**
   * Initializes the randomized temporary directory.
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.tempDir, { recursive: true });
    logger.debug({ tempDir: this.tempDir }, "Temporary directory created");
  }

  /**
   * Safely cleans up the temporary directory and all its contents.
   * This should ALWAYS be called in a finally block.
   */
  async cleanup(): Promise<void> {
    try {
      await fs.rm(this.tempDir, { recursive: true, force: true });
      logger.debug({ tempDir: this.tempDir }, "Temporary directory cleaned up");
    } catch (error) {
      logger.error({ tempDir: this.tempDir, error }, "Failed to clean up temporary directory");
    }
  }

  /**
   * Returns a safe path inside the temporary directory.
   */
  getSafePath(filename: string): string {
    const safeFilename = path.basename(filename); // Prevents path traversal
    return path.join(this.tempDir, safeFilename);
  }
}
