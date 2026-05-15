import { Router } from "express";
import { z } from "zod";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "../lib/auth";
import { requireRole } from "../middlewares/requireRole";
import { validateBody } from "../middlewares/validate";
import { logAudit } from "../lib/auditLog";

const router = Router();

function formatUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    email: u.email,
    nom_complet: u.nomComplet,
    role: u.role,
    enseignant_id: u.enseignantId,
    actif: u.actif,
    last_login_at: u.lastLoginAt?.toISOString() ?? null,
    created_at: u.createdAt.toISOString(),
  };
}

const CreateUserSchema = z.object({
  email: z.string().email("Email invalide"),
  nom_complet: z.string().min(1, "Nom complet requis"),
  role: z.enum(["admin", "coordinateur", "enseignant", "sante", "comptable", "viewer"]),
  password: z.string().min(8, "Mot de passe minimum 8 caractères"),
  enseignant_id: z.number().int().nullable().optional(),
});

const UpdateUserSchema = z.object({
  nom_complet: z.string().min(1).optional(),
  role: z.enum(["admin", "coordinateur", "enseignant", "sante", "comptable", "viewer"]).optional(),
  enseignant_id: z.number().int().nullable().optional(),
  actif: z.boolean().optional(),
});

router.get("/users", requireRole("admin", "coordinateur"), async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable);
  res.json(users.map(formatUser));
});

router.post(
  "/users",
  requireRole("admin"),
  validateBody(CreateUserSchema),
  async (req, res): Promise<void> => {
    const { email, nom_complet, role, password, enseignant_id } = req.body as z.infer<typeof CreateUserSchema>;
    const passwordHash = await hashPassword(password);
    const [u] = await db
      .insert(usersTable)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        nomComplet: nom_complet,
        role,
        enseignantId: enseignant_id ?? null,
      })
      .returning();
    await logAudit(req, { action: "create_user", entityType: "user", entityId: u.id, newValue: { email, role } });
    res.status(201).json(formatUser(u));
  },
);

router.put(
  "/users/:id",
  requireRole("admin"),
  validateBody(UpdateUserSchema),
  async (req, res): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { nom_complet, role, enseignant_id, actif } = req.body as z.infer<typeof UpdateUserSchema>;

    const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    if (!existing) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Utilisateur non trouvé" } });
      return;
    }

    const [updated] = await db
      .update(usersTable)
      .set({
        nomComplet: nom_complet,
        role,
        enseignantId: enseignant_id,
        actif,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, id))
      .returning();

    await logAudit(req, {
      action: "update_user",
      entityType: "user",
      entityId: id,
      oldValue: { role: existing.role, actif: existing.actif },
      newValue: { role: updated.role, actif: updated.actif },
    });

    res.json(formatUser(updated));
  },
);

router.delete("/users/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!existing) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Utilisateur non trouvé" } });
    return;
  }
  await db.delete(usersTable).where(eq(usersTable.id, id));
  await logAudit(req, { action: "delete_user", entityType: "user", entityId: id });
  res.sendStatus(204);
});

export default router;
