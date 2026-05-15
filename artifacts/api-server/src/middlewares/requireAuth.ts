import { type Request, type Response, type NextFunction } from "express";
import { verifyAccessToken, getUserFromAccessToken } from "../lib/auth";
import type { User } from "@workspace/db";

export interface AuthenticatedRequest extends Request {
  user: User;
  jwtPayload?: { userId: string; role: string };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Non authentifié" } });
    return;
  }
  const token = authHeader.slice(7);

  const payload = verifyAccessToken(token);
  if (!payload) {
    res.status(401).json({ error: { code: "INVALID_TOKEN", message: "Token invalide ou expiré" } });
    return;
  }

  const user = await getUserFromAccessToken(token);
  if (!user || !user.actif) {
    res.status(401).json({ error: { code: "INVALID_TOKEN", message: "Utilisateur inactif ou introuvable" } });
    return;
  }

  (req as AuthenticatedRequest).user = user;
  (req as AuthenticatedRequest).jwtPayload = payload;
  next();
}
