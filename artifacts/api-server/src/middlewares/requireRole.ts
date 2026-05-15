import { type Request, type Response, type NextFunction } from "express";
import type { AuthenticatedRequest } from "./requireAuth";

export type Role = "admin" | "coordinateur" | "enseignant" | "sante" | "comptable" | "viewer";

const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 100,
  coordinateur: 80,
  sante: 60,
  comptable: 60,
  enseignant: 40,
  viewer: 10,
};

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Non authentifié" } });
      return;
    }

    const userRole = authReq.user.role as Role;
    if (userRole === "admin") {
      next();
      return;
    }

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Accès refusé: rôle insuffisant",
          required: allowedRoles,
          actual: userRole,
        },
      });
      return;
    }
    next();
  };
}

export function requireMinRole(minRole: Role) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Non authentifié" } });
      return;
    }

    const userRole = authReq.user.role as Role;
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
    const minLevel = ROLE_HIERARCHY[minRole] ?? 0;

    if (userLevel < minLevel) {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Accès refusé: rôle insuffisant",
        },
      });
      return;
    }
    next();
  };
}

export function requireNotViewer(req: Request, res: Response, next: NextFunction): void {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Non authentifié" } });
    return;
  }
  if (authReq.user.role === "viewer") {
    res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Les lecteurs ne peuvent pas modifier les données",
      },
    });
    return;
  }
  next();
}
