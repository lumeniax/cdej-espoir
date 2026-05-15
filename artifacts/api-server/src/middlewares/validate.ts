import { type Request, type Response, type NextFunction } from "express";
import { type ZodSchema } from "zod";

/**
 * Valide `req.body` selon le schéma fourni. Si la validation réussit,
 * `req.body` est remplacé par la valeur typée (utile pour bénéficier des
 * transforms / defaults Zod côté handler).
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Données invalides",
          details: result.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * Valide `req.query`. Note : Express 5 type `req.query` en lecture seule
 * (ParsedQs), donc on n'écrase pas la valeur — on stocke plutôt le résultat
 * sur `res.locals.query` pour qu'il soit accessible côté handler typé.
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Paramètres de requête invalides",
          details: result.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
      });
      return;
    }
    res.locals.query = result.data;
    next();
  };
}
