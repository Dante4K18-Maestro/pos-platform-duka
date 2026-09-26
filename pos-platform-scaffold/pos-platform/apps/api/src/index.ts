// Server bootstrap: build the app, listen, handle graceful shutdown so an
// in-flight sale is never cut off mid-write.
import { buildApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";

async function main() {
  const app = await buildApp();

  await app.listen({ host: "0.0.0.0", port: env.PORT });
  logger.info(`api listening on :${env.PORT}`);

  const shutdown = async (signal: string) => {
    logger.info(`received ${signal}, shutting down`);
    await app.close();
    process.exit(0);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
