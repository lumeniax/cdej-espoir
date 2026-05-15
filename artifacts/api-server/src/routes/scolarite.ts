import { Router } from "express";
import { z } from "zod";
import { db, bulletinsTable, fraisScolairesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireNotViewer } from "../middlewares/requireRole";
import { validateBody } from "../middlewares/validate";

const router = Router();

const BulletinSchema = z.object({
  participant_id: z.number().int(),
  annee_scolaire: z.string().min(1),
  trimestre: z.number().int().min(1).max(3).optional(),
  ecole: z.string().optional(),
  classe: z.string().optional(),
  moyenne: z.number().min(0).max(20).optional(),
  rang: z.number().int().optional(),
  total_eleves: z.number().int().optional(),
  appreciation: z.string().optional(),
  observation: z.string().optional(),
  bulletin_scan_url: z.string().optional(),
});

router.get("/scolarite/bulletins", async (req, res): Promise<void> => {
  const participantId = req.query.participant_id ? parseInt(req.query.participant_id as string, 10) : null;
  const rows = participantId
    ? await db.select().from(bulletinsTable).where(eq(bulletinsTable.participantId, participantId)).orderBy(desc(bulletinsTable.anneeScolaire))
    : await db.select().from(bulletinsTable).orderBy(desc(bulletinsTable.anneeScolaire)).limit(200);
  type BulletinRow = typeof rows[number];
  res.json(rows.map((b: BulletinRow) => ({
    id: b.id, participant_id: b.participantId, annee_scolaire: b.anneeScolaire,
    trimestre: b.trimestre, ecole: b.ecole, classe: b.classe,
    moyenne: b.moyenne ? parseFloat(String(b.moyenne)) : null,
    rang: b.rang, total_eleves: b.totalEleves, appreciation: b.appreciation,
    observation: b.observation, bulletin_scan_url: b.bulletinScanUrl,
    created_at: b.createdAt.toISOString(),
  })));
});

router.post("/scolarite/bulletins", requireNotViewer, validateBody(BulletinSchema), async (req, res): Promise<void> => {
  const body = req.body as z.infer<typeof BulletinSchema>;
  const [b] = await db.insert(bulletinsTable).values({
    participantId: body.participant_id, anneeScolaire: body.annee_scolaire,
    trimestre: body.trimestre, ecole: body.ecole, classe: body.classe,
    moyenne: body.moyenne != null ? String(body.moyenne) : null,
    rang: body.rang, totalEleves: body.total_eleves, appreciation: body.appreciation,
    observation: body.observation, bulletinScanUrl: body.bulletin_scan_url,
  }).returning();
  res.status(201).json(b);
});

router.put("/scolarite/bulletins/:id", requireNotViewer, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const body = req.body;
  const [updated] = await db.update(bulletinsTable).set({
    anneeScolaire: body.annee_scolaire, trimestre: body.trimestre, ecole: body.ecole,
    classe: body.classe, moyenne: body.moyenne != null ? String(body.moyenne) : null,
    rang: body.rang, totalEleves: body.total_eleves, appreciation: body.appreciation,
    observation: body.observation, updatedAt: new Date(),
  }).where(eq(bulletinsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: { code: "NOT_FOUND", message: "Bulletin non trouvé" } }); return; }
  res.json(updated);
});

router.delete("/scolarite/bulletins/:id", requireNotViewer, async (req, res): Promise<void> => {
  await db.delete(bulletinsTable).where(eq(bulletinsTable.id, parseInt(req.params.id as string, 10)));
  res.sendStatus(204);
});

const FraisSchema = z.object({
  participant_id: z.number().int(),
  annee_scolaire: z.string().min(1),
  type_frais: z.string().min(1),
  montant: z.number().positive(),
  date_paiement: z.string().optional(),
  statut: z.string().optional(),
  note: z.string().optional(),
});

router.get("/scolarite/frais", async (req, res): Promise<void> => {
  const participantId = req.query.participant_id ? parseInt(req.query.participant_id as string, 10) : null;
  const rows = participantId
    ? await db.select().from(fraisScolairesTable).where(eq(fraisScolairesTable.participantId, participantId))
    : await db.select().from(fraisScolairesTable).limit(200);
  type FraisRow = typeof rows[number];
  res.json(rows.map((f: FraisRow) => ({ ...f, montant: parseFloat(String(f.montant)) })));
});

router.post("/scolarite/frais", requireNotViewer, validateBody(FraisSchema), async (req, res): Promise<void> => {
  const body = req.body as z.infer<typeof FraisSchema>;
  const [f] = await db.insert(fraisScolairesTable).values({
    participantId: body.participant_id, anneeScolaire: body.annee_scolaire,
    typefrais: body.type_frais, montant: String(body.montant),
    datePaiement: body.date_paiement, statut: body.statut, note: body.note,
  }).returning();
  res.status(201).json(f);
});

export default router;
