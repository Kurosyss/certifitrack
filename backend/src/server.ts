import { buildApp } from "./app.js";
import { env } from "./utils/env.js";
import { logger } from "./utils/logger.js";

const fastify = buildApp();

const start = async () => {
  try {
    await fastify.listen({ port: env.PORT, host: env.HOST || "127.0.0.1" });
    logger.info(`Server listening on port ${env.PORT} on host ${env.HOST}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
