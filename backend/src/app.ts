import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { routes } from "./api/routes.js";
import { logger } from "./utils/logger.js";
import { env } from "./utils/env.js";
import { APIError } from "./utils/errors.js";

export function buildApp() {
  const fastify = Fastify({
    logger: true,
    bodyLimit: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
    connectionTimeout: env.REQUEST_TIMEOUT_MS,
    requestTimeout: env.REQUEST_TIMEOUT_MS,
  });

  fastify.register(cors, {
    origin: [
      "http://localhost:4321", // Local development frontend
      "http://127.0.0.1:4321"
    ],
    methods: ["POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  });

  fastify.register(multipart, {
    limits: {
      fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
    }
  });

  fastify.register(routes);

  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof APIError) {
      logger.warn({ err: error }, "API Error");
      return reply.status(error.statusCode).send({
        error: error.name,
        message: error.message,
        details: error.details,
      });
    }

    const err = error as any;
    if (err.code === 'FST_REQ_FILE_TOO_LARGE') {
      logger.warn({ err: error }, "File too large");
      return reply.status(413).send({
        error: "PayloadTooLargeError",
        message: "File exceeds the maximum allowed size.",
      });
    }

    logger.error({ err: error }, "Unhandled Internal Error");
    return reply.status(500).send({
      error: "InternalServerError",
      message: "An unexpected error occurred while processing the request.",
    });
  });

  return fastify;
}
