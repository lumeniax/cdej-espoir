import { Router } from "express";
import { z } from "zod";
import { db, transactionsTable } from "@workspace/db";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { requireRole, requireNotViewer } from "../middlewares/requireRole";
import { validateBody } from "../middlewares/validate";
import { logAudit } from "../lib/auditLog";
import type { AuthenticatedRequest } from "../middlewares/requireAuth";

const router = Router();

const TransactionSchema = z.object({
  participant_id: z.number().int().optional(),
  type: z.enum(["cotisation", "paiement", "don", "don_nature", "depense", "autre"]),
  categorie: z.string().optional(),
  montant: z.number().positive(),
  date: z.string(),
  description: z.string().optional(),
  reference_paiement: z.string().optional(),
  numero_recu: z.string().optional(),
  donateur: z.string().optional(),
  mode_reglement: z.string().optional(),
});

function fmt(t: typeof transactionsTable.$inferSelect) {
  return {
    id: t.id, participant_id: t.participantId, type: t.type, categorie: t.categorie,
    montant: parseFloat(String(t.montant)), devise: t.devise, date: t.date,
    description: t.description, reference_paiement: t.referencePaiement,
    numero_recu: t.numerRecu, donateur: t.donateur, mode_reglement: t.modeReglement,
    statut: t.statut, created_at: t.createdAt.toISOString(),
  };
}

router.get("/finances", async (req, res): Promise<void> => {
  const { participant_id, type, date_debut, date_fin, page = "1", page_size = "50" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSz = Math.min(200, parseInt(page_size, 10) || 50);
  const conditions = [];
  if (participant_id) conditions.push(eq(transactionsTable.participantId, parseInt(participant_id, 10)));
  if (type) conditions.push(eq(transactionsTable.type, type));
  if (date_debut) conditions.push(gte(transactionsTable.date, date_debut));
  if (date_fin) conditions.push(lte(transactionsTable.date, date_fin));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [{ total }] = await db.select({ total: sql<number>`cast(count(*) as integer)` }).from(transactionsTable).where(where);
  const rows = await db.select().from(transactionsTable).where(where).orderBy(desc(transactionsTable.date)).limit(pageSz).offset((pageNum - 1) * pageSz);
  res.json({ items: rows.map(fmt), total, page: pageNum, page_size: pageSz });
});

router.post("/finances", requireNotViewer, validateBody(TransactionSchema), async (req, res): Promise<void> => {
  const body = req.body as z.infer<typeof TransactionSchema>;
  const authReq = req as AuthenticatedRequest;
  const [t] = await db.insert(transactionsTable).values({
    participantId: body.participant_id, type: body.type, categorie: body.categorie,
    montant: String(body.montant), date: body.date, description: body.description,
    referencePaiement: body.reference_paiement, numerRecu: body.numero_recu,
    donateur: body.donateur, modeReglement: body.mode_reglement, createdBy: authReq.user.id,
  }).returning();
  await logAudit(req, { action: "create_transaction", entityType: "transaction", entityId: String(t.id), newValue: { type: t.type, montant: t.montant } });
  res.status(201).json(fmt(t));
});

router.get("/finances/stats", requireRole("admin", "coordinateur", "comptable"), async (req, res): Promise<void> => {
  const rows = await db.select({
    type: transactionsTable.type,
    total: sql<number>`cast(sum(montant) as numeric(12,2))`,
    count: sql<number>`cast(count(*) as integer)`,
  }).from(transactionsTable).groupBy(transactionsTable.type);
  res.json(rows.map(r => ({ type: r.type, total: parseFloat(String(r.total)), count: r.count })));
});

router.put("/finances/:id", requireRole("admin", "comptable"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const body = req.body;
  const [updated] = await db.update(transactionsTable).set({
    type: body.type, categorie: body.categorie,
    montant: body.montant != null ? String(body.montant) : undefined,
    date: body.date, description: body.description, statut: body.statut, updatedAt: new Date(),
  }).where(eq(transactionsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: { code: "NOT_FOUND", message: "Transaction non trouvée" } }); return; }
  res.json(fmt(updated));
});

router.delete("/finances/:id", requireRole("admin"), async (req, res): Promise<void> => {
  await db.delete(transactionsTable).where(eq(transactionsTable.id, parseInt(req.params.id as string, 10)));
  await logAudit(req, { action: "delete_transaction", entityType: "transaction", entityId: req.params.id as string });
  res.sendStatus(204);
});

export default router;
