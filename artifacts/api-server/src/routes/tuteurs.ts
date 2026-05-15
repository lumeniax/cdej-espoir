import { Router } from "express";
import { z } from "zod";
import { db, tuteursTable, participantTuteursTable, participantsTable } from "@workspace/db";
import { eq, ilike, or, and } from "drizzle-orm";
import { requireNotViewer } from "../middlewares/requireRole";
import { validateBody } from "../middlewares/validate";
import { logAudit } from "../lib/auditLog";

const router = Router();

const TuteurSchema = z.object({
  nom: z.string().min(1),
  prenoms: z.string().optional(),
  telephone: z.string().optional(),
  telephone_alternatif: z.string().optional(),
  village: z.string().optional(),
  quartier: z.string().optional(),
  relation: z.string().min(1),
  profession: z.string().optional(),
  eglise: z.string().optional(),
  situation_familiale: z.string().optional(),
  niveau_alphabetisation: z.string().optional(),
  personne_urgence_nom: z.string().optional(),
  personne_urgence_tel: z.string().optional(),
  observations: z.string().optional(),
});

function fmt(t: typeof tuteursTable.$inferSelect) {
  return {
    id: t.id, nom: t.nom, prenoms: t.prenoms, telephone: t.telephone,
    telephone_alternatif: t.telephoneAlternatif, village: t.village, quartier: t.quartier,
    profession: t.profession, eglise: t.eglise, situation_familiale: t.situationFamiliale,
    niveau_alphabetisation: t.niveauAlphabetisation, personne_urgence_nom: t.personneUrgenceNom,
    personne_urgence_tel: t.personneUrgenceTel, observations: t.observations,
    created_at: t.createdAt.toISOString(),
  };
}

router.get("/tuteurs", async (req, res): Promise<void> => {
  const { q } = req.query as Record<string, string>;
  let rows = await db.select().from(tuteursTable);
  if (q) {
    const search = q.toLowerCase();
    rows = rows.filter(t =>
      t.nom.toLowerCase().includes(search) ||
      (t.prenoms || "").toLowerCase().includes(search) ||
      (t.telephone || "").includes(search)
    );
  }
  res.json(rows.map(fmt));
});

router.post("/tuteurs", requireNotViewer, validateBody(TuteurSchema), async (req, res): Promise<void> => {
  const body = req.body as z.infer<typeof TuteurSchema>;
  const [t] = await db.insert(tuteursTable).values({
    nom: body.nom, prenoms: body.prenoms, telephone: body.telephone,
    telephoneAlternatif: body.telephone_alternatif, village: body.village, quartier: body.quartier,
    profession: body.profession, eglise: body.eglise, situationFamiliale: body.situation_familiale,
    niveauAlphabetisation: body.niveau_alphabetisation, personneUrgenceNom: body.personne_urgence_nom,
    personneUrgenceTel: body.personne_urgence_tel, observations: body.observations,
  }).returning();
  await logAudit(req, { action: "create_tuteur", entityType: "tuteur", entityId: String(t.id) });
  res.status(201).json(fmt(t));
});

router.get("/tuteurs/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [t] = await db.select().from(tuteursTable).where(eq(tuteursTable.id, id));
  if (!t) { res.status(404).json({ error: { code: "NOT_FOUND", message: "Tuteur non trouvé" } }); return; }
  const liens = await db.select({
    participantId: participantTuteursTable.participantId,
    relation: participantTuteursTable.relation,
    estPrincipal: participantTuteursTable.estPrincipal,
    nomPrenoms: participantsTable.nomPrenoms,
    numeroOrdre: participantsTable.numeroOrdre,
  }).from(participantTuteursTable)
    .leftJoin(participantsTable, eq(participantTuteursTable.participantId, participantsTable.id))
    .where(eq(participantTuteursTable.tuteurId, id));
  res.json({ ...fmt(t), enfants: liens });
});

router.put("/tuteurs/:id", requireNotViewer, validateBody(TuteurSchema.partial()), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const body = req.body as Partial<z.infer<typeof TuteurSchema>>;
  const [updated] = await db.update(tuteursTable).set({
    nom: body.nom, prenoms: body.prenoms, telephone: body.telephone,
    telephoneAlternatif: body.telephone_alternatif, village: body.village,
    quartier: body.quartier, profession: body.profession, eglise: body.eglise,
    situationFamiliale: body.situation_familiale, niveauAlphabetisation: body.niveau_alphabetisation,
    personneUrgenceNom: body.personne_urgence_nom, personneUrgenceTel: body.personne_urgence_tel,
    observations: body.observations, updatedAt: new Date(),
  }).where(eq(tuteursTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: { code: "NOT_FOUND", message: "Tuteur non trouvé" } }); return; }
  res.json(fmt(updated));
});

router.delete("/tuteurs/:id", requireNotViewer, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(tuteursTable).where(eq(tuteursTable.id, id));
  res.sendStatus(204);
});

router.post("/participants/:participantId/tuteurs", requireNotViewer, async (req, res): Promise<void> => {
  const participantId = parseInt(req.params.participantId as string, 10);
  const { tuteur_id, relation, est_principal } = req.body;
  if (!tuteur_id || !relation) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "tuteur_id et relation requis" } }); return;
  }
  const [lien] = await db.insert(participantTuteursTable).values({
    participantId, tuteurId: tuteur_id, relation, estPrincipal: est_principal ? "O" : "N",
  }).returning();
  res.status(201).json(lien);
});

router.get("/participants/:participantId/tuteurs", async (req, res): Promise<void> => {
  const participantId = parseInt(req.params.participantId, 10);
  const rows = await db.select({
    id: participantTuteursTable.id,
    tuteurId: participantTuteursTable.tuteurId,
    relation: participantTuteursTable.relation,
    estPrincipal: participantTuteursTable.estPrincipal,
    nom: tuteursTable.nom,
    prenoms: tuteursTable.prenoms,
    telephone: tuteursTable.telephone,
    village: tuteursTable.village,
  }).from(participantTuteursTable)
    .leftJoin(tuteursTable, eq(participantTuteursTable.tuteurId, tuteursTable.id))
    .where(eq(participantTuteursTable.participantId, participantId));
  res.json(rows);
});

router.delete("/participants/:participantId/tuteurs/:lienId", requireNotViewer, async (req, res): Promise<void> => {
  const lienId = parseInt(req.params.lienId as string, 10);
  await db.delete(participantTuteursTable).where(eq(participantTuteursTable.id, lienId));
  res.sendStatus(204);
});

export default router;
