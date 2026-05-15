import { Router } from "express";
import { z } from "zod";
import { db, santeMesuresTable, vaccinationsTable, visitesMedicalesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireRole, requireNotViewer } from "../middlewares/requireRole";
import { validateBody } from "../middlewares/validate";
import { logAudit } from "../lib/auditLog";

const router = Router();

function classifyImc(imc: number, ageMois: number, sexe: string): string {
  if (ageMois < 60) {
    if (imc < 14) return "Malnutrition sévère";
    if (imc < 15) return "Malnutrition modérée";
    if (imc < 18.5) return "Insuffisance pondérale";
    if (imc < 25) return "Normal";
    return "Surpoids";
  }
  if (imc < 16) return "Maigreur sévère";
  if (imc < 17) return "Maigreur modérée";
  if (imc < 18.5) return "Insuffisance pondérale";
  if (imc < 25) return "Normal";
  if (imc < 30) return "Surpoids";
  return "Obésité";
}

const MesureSchema = z.object({
  participant_id: z.number().int(),
  date_mesure: z.string(),
  poids_kg: z.number().positive().optional(),
  taille_cm: z.number().positive().optional(),
  perimetre: z.number().optional(),
  etat_nutritionnel: z.string().optional(),
  action_recommandee: z.string().optional(),
  note: z.string().optional(),
  saisie_par: z.string().optional(),
  age_mois: z.number().optional(),
  sexe: z.string().optional(),
});

router.get("/sante/mesures", requireRole("admin", "coordinateur", "sante"), async (req, res): Promise<void> => {
  const participantId = req.query.participant_id ? parseInt(req.query.participant_id as string, 10) : null;
  const query = participantId
    ? db.select().from(santeMesuresTable).where(eq(santeMesuresTable.participantId, participantId)).orderBy(desc(santeMesuresTable.dateMesure))
    : db.select().from(santeMesuresTable).orderBy(desc(santeMesuresTable.dateMesure)).limit(100);
  const rows = await query;
  res.json(rows.map(m => ({
    id: m.id, participant_id: m.participantId, date_mesure: m.dateMesure,
    poids_kg: m.poidsKg ? parseFloat(String(m.poidsKg)) : null,
    taille_cm: m.tailleCm ? parseFloat(String(m.tailleCm)) : null,
    imc: m.imc ? parseFloat(String(m.imc)) : null,
    imc_classification: m.imcClassification, perimetre: m.perimetre ? parseFloat(String(m.perimetre)) : null,
    etat_nutritionnel: m.etatNutritioNnel, action_recommandee: m.actionRecommandee,
    note: m.note, saisie_par: m.saisiePar, created_at: m.createdAt.toISOString(),
  })));
});

router.post("/sante/mesures", requireNotViewer, validateBody(MesureSchema), async (req, res): Promise<void> => {
  const body = req.body as z.infer<typeof MesureSchema>;
  let imc: number | null = null;
  let classification: string | null = null;
  if (body.poids_kg && body.taille_cm) {
    const tM = body.taille_cm / 100;
    imc = Math.round(body.poids_kg / (tM * tM) * 100) / 100;
    classification = classifyImc(imc, body.age_mois ?? 240, body.sexe ?? "M");
  }
  const [m] = await db.insert(santeMesuresTable).values({
    participantId: body.participant_id, dateMesure: body.date_mesure,
    poidsKg: body.poids_kg ? String(body.poids_kg) : null,
    tailleCm: body.taille_cm ? String(body.taille_cm) : null,
    imc: imc ? String(imc) : null,
    imcClassification: classification,
    perimetre: body.perimetre ? String(body.perimetre) : null,
    etatNutritioNnel: body.etat_nutritionnel, actionRecommandee: body.action_recommandee,
    note: body.note, saisiePar: body.saisie_par,
  }).returning();
  await logAudit(req, { action: "create_sante_mesure", entityType: "participant", entityId: String(body.participant_id) });
  res.status(201).json({ ...m, imc: m.imc ? parseFloat(String(m.imc)) : null });
});

router.delete("/sante/mesures/:id", requireRole("admin", "coordinateur", "sante"), async (req, res): Promise<void> => {
  await db.delete(santeMesuresTable).where(eq(santeMesuresTable.id, parseInt(req.params.id as string, 10)));
  res.sendStatus(204);
});

const VaccinSchema = z.object({
  participant_id: z.number().int(),
  vaccin: z.string().min(1),
  date_administration: z.string().optional(),
  date_prochaine_dose: z.string().optional(),
  lot: z.string().optional(),
  centre: z.string().optional(),
  note: z.string().optional(),
});

router.get("/sante/vaccinations", async (req, res): Promise<void> => {
  const participantId = req.query.participant_id ? parseInt(req.query.participant_id as string, 10) : null;
  const rows = participantId
    ? await db.select().from(vaccinationsTable).where(eq(vaccinationsTable.participantId, participantId)).orderBy(desc(vaccinationsTable.dateAdministration))
    : await db.select().from(vaccinationsTable).limit(200);
  res.json(rows);
});

router.post("/sante/vaccinations", requireNotViewer, validateBody(VaccinSchema), async (req, res): Promise<void> => {
  const body = req.body as z.infer<typeof VaccinSchema>;
  const [v] = await db.insert(vaccinationsTable).values({
    participantId: body.participant_id, vaccin: body.vaccin,
    dateAdministration: body.date_administration, dateProchainesDose: body.date_prochaine_dose,
    lot: body.lot, centre: body.centre, note: body.note,
  }).returning();
  res.status(201).json(v);
});

router.delete("/sante/vaccinations/:id", requireRole("admin", "coordinateur", "sante"), async (req, res): Promise<void> => {
  await db.delete(vaccinationsTable).where(eq(vaccinationsTable.id, parseInt(req.params.id as string, 10)));
  res.sendStatus(204);
});

const VisiteSchema = z.object({
  participant_id: z.number().int(),
  date_visite: z.string(),
  motif: z.string().optional(),
  medecin: z.string().optional(),
  diagnostic: z.string().optional(),
  traitement: z.string().optional(),
  suite_a_donner: z.string().optional(),
  date_prochain: z.string().optional(),
});

router.get("/sante/visites", async (req, res): Promise<void> => {
  const participantId = req.query.participant_id ? parseInt(req.query.participant_id as string, 10) : null;
  const rows = participantId
    ? await db.select().from(visitesMedicalesTable).where(eq(visitesMedicalesTable.participantId, participantId)).orderBy(desc(visitesMedicalesTable.dateVisite))
    : await db.select().from(visitesMedicalesTable).limit(100);
  res.json(rows);
});

router.post("/sante/visites", requireNotViewer, validateBody(VisiteSchema), async (req, res): Promise<void> => {
  const body = req.body as z.infer<typeof VisiteSchema>;
  const [v] = await db.insert(visitesMedicalesTable).values({
    participantId: body.participant_id, dateVisite: body.date_visite, motif: body.motif,
    medecin: body.medecin, diagnostic: body.diagnostic, traitement: body.traitement,
    suiteADonner: body.suite_a_donner, dateProchain: body.date_prochain,
  }).returning();
  res.status(201).json(v);
});

export default router;
