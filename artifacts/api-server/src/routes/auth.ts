import { Router } from "express";
import { z } from "zod";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  hashPassword,
  verifyPassword,
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  getUserFromAccessToken,
} from "../lib/auth";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { validateBody } from "../middlewares/validate";
import { logAudit } from "../lib/auditLog";

const router = Router();

const REFRESH_COOKIE = "cdej_refresh";
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const LoginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    nom_complet: user.nomComplet,
    role: user.role,
    enseignant_id: user.enseignantId,
    actif: user.actif,
    last_login_at: user.lastLoginAt?.toISOString() ?? null,
    created_at: user.createdAt.toISOString(),
  };
}

router.post("/auth/login", validateBody(LoginSchema), async (req, res): Promise<void> => {
  const { email, password } = req.body as z.infer<typeof LoginSchema>;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (!user || !user.actif) {
    await logAudit(req, { action: "login_failed", entityType: "user", newValue: { email } });
    res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Identifiants invalides" } });
    return;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await logAudit(req, { action: "login_failed", entityType: "user", entityId: user.id });
    res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Identifiants invalides" } });
    return;
  }

  await db.update(usersTable).set({ lastLoginAt: new Date() }).where(eq(usersTable.id, user.id));

  const accessToken = createAccessToken(user.id, user.role);
  const refreshToken = createRefreshToken(user.id);

  res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS);

  await logAudit(req, { action: "login", entityType: "user", entityId: user.id });

  res.json({
    access_token: accessToken,
    user: formatUser(user),
  });
});

router.post("/auth/refresh", async (req, res): Promise<void> => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) {
    res.status(401).json({ error: { code: "NO_REFRESH_TOKEN", message: "Token de renouvellement absent" } });
    return;
  }

  const data = verifyRefreshToken(token);
  if (!data) {
    res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
    res.status(401).json({ error: { code: "INVALID_REFRESH_TOKEN", message: "Token de renouvellement invalide" } });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, data.userId));
  if (!user || !user.actif) {
    res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
    res.status(401).json({ error: { code: "USER_INACTIVE", message: "Utilisateur inactif" } });
    return;
  }

  const accessToken = createAccessToken(user.id, user.role);
  const newRefreshToken = createRefreshToken(user.id);

  res.cookie(REFRESH_COOKIE, newRefreshToken, COOKIE_OPTS);

  res.json({
    access_token: accessToken,
    user: formatUser(user),
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  const user = await getUserFromAccessToken(authHeader!.slice(7));
  if (!user) {
    res.status(401).json({ error: { code: "INVALID_TOKEN", message: "Token invalide" } });
    return;
  }
  res.json(formatUser(user));
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  await logAudit(req, { action: "logout", entityType: "user" });
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
  res.json({ message: "Déconnecté" });
});

const ChangePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8, "Mot de passe minimum 8 caractères"),
});

router.post(
  "/auth/change-password",
  requireAuth,
  validateBody(ChangePasswordSchema),
  async (req, res): Promise<void> => {
    const { current_password, new_password } = req.body as z.infer<typeof ChangePasswordSchema>;
    const authHeader = req.headers.authorization;
    const user = await getUserFromAccessToken(authHeader!.slice(7));
    if (!user) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Non authentifié" } });
      return;
    }

    const valid = await verifyPassword(current_password, user.passwordHash);
    if (!valid) {
      res.status(400).json({ error: { code: "INVALID_PASSWORD", message: "Mot de passe actuel incorrect" } });
      return;
    }

    const newHash = await hashPassword(new_password);
    await db.update(usersTable).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(usersTable.id, user.id));

    await logAudit(req, { action: "change_password", entityType: "user", entityId: user.id });
    res.json({ message: "Mot de passe mis à jour" });
  },
);

const UpdateProfileSchema = z.object({
  nom_complet: z.string().min(2, "Nom minimum 2 caractères").max(100),
});

router.patch(
  "/auth/profile",
  requireAuth,
  validateBody(UpdateProfileSchema),
  async (req, res): Promise<void> => {
    const { nom_complet } = req.body as z.infer<typeof UpdateProfileSchema>;
    const authHeader = req.headers.authorization;
    const user = await getUserFromAccessToken(authHeader!.slice(7));
    if (!user) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Non authentifié" } });
      return;
    }
    await db.update(usersTable)
      .set({ nomComplet: nom_complet, updatedAt: new Date() })
      .where(eq(usersTable.id, user.id));
    await logAudit(req, { action: "update_profile", entityType: "user", entityId: user.id });
    res.json({ message: "Profil mis à jour" });
  },
);

export default router;
