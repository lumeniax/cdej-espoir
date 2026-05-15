import { Router } from "express";
import { db, spirituelTable, activitesTable, participantActivitesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireNotViewer } from "../middlewares/requireRole";

const router = Router();

router.get("/spirituel/:participantId", async (req, res): Promise<void> => {
  const participantId = parseInt(req.params.participantId, 10);
  const [s] = await db.select().from(spirituelTable).where(eq(spirituelTable.participantId, participantId));
  res.json(s || null);
});

router.put("/spirituel/:participantId", requireNotViewer, async (req, res): Promise<void> => {
  const participantId = parseInt(req.params.participantId as string, 10);
  const body = req.body;
  const existing = await db.select().from(spirituelTable).where(eq(spirituelTable.participantId, participantId));
  const data = {
    participantId, estBaptise: body.est_baptise, dateBapteme: body.date_bapteme,
    egliseBapteme: body.eglise_bapteme, estConfirme: body.est_confirme,
    dateConfirmation: body.date_confirmation, ecolesDimanche: body.ecoles_dimanche,
    catechese: body.catechese, chorale: body.chorale, theatre: body.theatre,
    memorisationBiblique: body.memorisation_biblique, distinctions: body.distinctions,
    observations: body.observations, updatedAt: new Date(),
  };
  let result;
  if (existing.length > 0) {
    [result] = await db.update(spirituelTable).set(data).where(eq(spirituelTable.participantId, participantId)).returning();
  } else {
    [result] = await db.insert(spirituelTable).values(data).returning();
  }
  res.json(result);
});

router.get("/activites", async (_req, res): Promise<void> => {
  const rows = await db.select().from(activitesTable).orderBy(desc(activitesTable.dateActivite));
  res.json(rows);
});

router.post("/activites", requireNotViewer, async (req, res): Promise<void> => {
  const { nom, type, description, date_activite, lieu } = req.body;
  if (!nom) { res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "nom requis" } }); return; }
  const [a] = await db.insert(activitesTable).values({ nom, type, description, dateActivite: date_activite, lieu }).returning();
  res.status(201).json(a);
});

router.get("/participants/:participantId/activites", async (req, res): Promise<void> => {
  const participantId = parseInt(req.params.participantId, 10);
  const rows = await db.select({
    id: participantActivitesTable.id,
    activite_id: participantActivitesTable.activiteId,
    statut: participantActivitesTable.statut,
    note: participantActivitesTable.note,
    nom: activitesTable.nom,
    type: activitesTable.type,
    date_activite: activitesTable.dateActivite,
  }).from(participantActivitesTable)
    .leftJoin(activitesTable, eq(participantActivitesTable.activiteId, activitesTable.id))
    .where(eq(participantActivitesTable.participantId, participantId));
  res.json(rows);
});

router.post("/participants/:participantId/activites", requireNotViewer, async (req, res): Promise<void> => {
  const participantId = parseInt(req.params.participantId as string, 10);
  const { activite_id, statut, note } = req.body;
  const [pa] = await db.insert(participantActivitesTable).values({ participantId, activiteId: activite_id, statut, note }).returning();
  res.status(201).json(pa);
});

export default router;
