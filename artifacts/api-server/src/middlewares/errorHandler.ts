import { type Request, type Response, type NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../lib/logger";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  expose?: boolean;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const isProd = process.env.NODE_ENV === "production";

  // Erreurs de validation Zod -> 400 + détails par champ.
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Données invalides",
        details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
    });
    return;
  }

  // Body JSON malformé : express renvoie une SyntaxError avec status 400.
  if (err instanceof SyntaxError && "status" in err && (err as unknown as { status: number }).status === 400) {
    res.status(400).json({
      error: { code: "INVALID_JSON", message: "Corps JSON invalide" },
    });
    return;
  }

  const statusCode = err.statusCode ?? 500;
  const code = err.code ?? (statusCode === 404 ? "NOT_FOUND" : "INTERNAL_ERROR");

  if (statusCode >= 500) {
    logger.error(
      { err, url: req.url, method: req.method },
      "Unhandled server error",
    );
  }

  const safeMessage =
    isProd && statusCode >= 500
      ? "Erreur interne du serveur"
      : err.message ?? "Erreur interne";

  res.status(statusCode).json({
    error: {
      code,
      message: safeMessage,
      // On n'expose la stack qu'en non-prod ET pour les vraies erreurs serveur,
      // jamais pour les 4xx (qui peuvent être déclenchées par l'utilisateur).
      ...(isProd || statusCode < 500 ? {} : { stack: err.stack }),
    },
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `Route non trouvée: ${req.method} ${req.path}`,
    },
  });
}
