import { validateEnv } from "./lib/env";
validateEnv();

import app from "./app";
import { logger } from "./lib/logger";

// PORT par défaut : 8080 (cf. Dockerfile). On garde un fallback raisonnable
// pour ne pas faire planter le serveur si la variable n'est pas définie en dev.
const rawPort = process.env["PORT"] ?? "8080";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});

// Arrêt propre : on laisse le temps aux connexions en cours de se terminer.
function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down server");
  server.close((err) => {
    if (err) {
      logger.error({ err }, "Error during shutdown");
      process.exit(1);
    }
    process.exit(0);
  });
  // En dernier recours, on tue le process après 10s.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  // Laisse le superviseur (Docker, systemd, etc.) redémarrer proprement.
  process.exit(1);
});
