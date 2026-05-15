import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";

const app: Express = express();

app.set("trust proxy", 1);
// Cache désactivé pour les réponses API (données sensibles + auth bearer).
app.disable("etag");
app.disable("x-powered-by");

app.use(
  helmet({
    // L'API ne sert pas de HTML : on garde les en-têtes par défaut, qui sont sûrs.
    crossOriginResourcePolicy: { policy: "same-site" },
  }),
);

// FRONTEND_URL peut contenir une liste séparée par des virgules pour autoriser
// plusieurs domaines (ex: app principale + version GitHub Pages).
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((s) => s.trim()).filter(Boolean)
  : undefined;

app.use(
  cors({
    origin: allowedOrigins ?? true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(cookieParser());
// Limite raisonnable pour le JSON : 10 ko pour les requêtes "métier", on étend
// jusqu'à 1 Mo pour les routes qui acceptent des données plus volumineuses
// (imports, batches). Le tuning fin se fait par route si besoin.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Trop de tentatives de connexion. Réessayez dans 15 minutes.",
    },
  },
  skip: () => process.env.NODE_ENV === "test",
});

app.use("/api/auth/login", loginLimiter);
app.use("/api", router);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
