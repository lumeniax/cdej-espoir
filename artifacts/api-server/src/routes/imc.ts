import { Router } from "express";
import { db, imcMeasuresTable, participantsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

function classifyImc(imc: number): { classification: string; action: string } {
  if (imc < 16) return { classification: "Malnutrition aiguë sévère", action: "Consulter un professionnel de santé immédiatement." };
  if (imc < 17) return { classification: "Malnutrition aiguë modérée", action: "Consulter un professionnel de santé." };
  if (imc >= 25 && imc < 30) return { classification: "Surpoids", action: "Adopter un mode de vie plus sain (alimentation équilibrée, exercice physique)." };
  return { classification: "IMC dans la plage normale", action: "Continuez à maintenir un mode de vie sain." };
}

function formatMesure(m: typeof imcMeasuresTable.$inferSelect, participantNom?: string | null) {
  return {
    id: m.id,
    participant_id: m.participantId,
    participant_nom: participantNom ?? null,
    date_mesure: m.dateMesure,
    poids_kg: parseFloat(m.poidsKg as string),
    taille_cm: parseFloat(m.tailleCm as string),
    imc: m.imc ? parseFloat(m.imc as string) : 0,
    classification: m.classification || "",
    action_recommandee: m.actionRecommandee,
    note: m.note,
    created_at: m.createdAt.toISOString(),
  };
}

router.get("/imc", async (req, res): Promise<void> => {
  const { participant_id, from, to } = req.query as Record<string, string>;
  let rows = await db.select({
    mesure: imcMeasuresTable,
    participantNom: participantsTable.nomPrenoms,
  }).from(imcMeasuresTable)
    .leftJoin(participantsTable, eq(imcMeasuresTable.participantId, participantsTable.id))
    .orderBy(desc(imcMeasuresTable.dateMesure));

  if (participant_id) rows = rows.filter(r => r.mesure.participantId === parseInt(participant_id, 10));
  if (from) rows = rows.filter(r => r.mesure.dateMesure >= from);
  if (to) rows = rows.filter(r => r.mesure.dateMesure <= to);

  res.json(rows.map(r => formatMesure(r.mesure, r.participantNom)));
});

router.post("/imc", async (req, res): Promise<void> => {
  const { participant_id, poids_kg, taille_cm, date_mesure, note } = req.body;
  if (!participant_id || !poids_kg || !taille_cm) {
    res.status(400).json({ error: "participant_id, poids_kg et taille_cm requis" });
    return;
  }
  if (poids_kg <= 0 || taille_cm <= 0) {
    res.status(422).json({ error: "IMC_INVALID_VALUES", message: "poids et taille doivent être positifs" });
    return;
  }
  const imcVal = poids_kg / ((taille_cm / 100) * (taille_cm / 100));
  const { classification, action } = classifyImc(imcVal);

  const [m] = await db.insert(imcMeasuresTable).values({
    participantId: participant_id,
    poidsKg: poids_kg.toString(),
    tailleCm: taille_cm.toString(),
    imc: imcVal.toFixed(2),
    classification,
    actionRecommandee: action,
    dateMesure: date_mesure || new Date().toISOString().split("T")[0],
    note: note || null,
  }).returning();

  const [p] = await db.select().from(participantsTable).where(eq(participantsTable.id, participant_id));
  res.status(201).json(formatMesure(m, p?.nomPrenoms));
});

router.get("/imc/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [row] = await db.select({
    mesure: imcMeasuresTable,
    participantNom: participantsTable.nomPrenoms,
  }).from(imcMeasuresTable)
    .leftJoin(participantsTable, eq(imcMeasuresTable.participantId, participantsTable.id))
    .where(eq(imcMeasuresTable.id, id));
  if (!row) { res.status(404).json({ error: "Mesure non trouvée" }); return; }
  res.json(formatMesure(row.mesure, row.participantNom));
});

router.delete("/imc/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(imcMeasuresTable).where(eq(imcMeasuresTable.id, id));
  res.sendStatus(204);
});

export default router;
