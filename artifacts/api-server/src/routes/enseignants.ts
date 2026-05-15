import { Router } from "express";
import { db, enseignantsTable, eleveEnseignantTable, participantsTable, presenceSessionsTable } from "@workspace/db";
import { eq, ilike, count, sql, desc } from "drizzle-orm";

const router = Router();

function calcAge(dateNaissance: string | null) {
  if (!dateNaissance) return { decimal: null, annees: null, clair: null };
  const naissance = new Date(dateNaissance);
  const now = new Date();
  const diffMs = now.getTime() - naissance.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const decimal = Math.round(diffDays / 365.2425 * 100) / 100;
  const annees = Math.floor(decimal);
  return { decimal, annees, clair: `${annees} ans` };
}

router.get("/enseignants", async (req, res): Promise<void> => {
  const { q, actif } = req.query as Record<string, string>;

  let rows = await db.select().from(enseignantsTable);
  if (actif !== undefined) {
    const isActif = actif === "true";
    rows = rows.filter(e => e.actif === isActif);
  }
  if (q) {
    rows = rows.filter(e => e.nom.toLowerCase().includes(q.toLowerCase()));
  }

  const counts = await db.select({
    enseignantId: eleveEnseignantTable.enseignantId,
    nb: count(eleveEnseignantTable.eleveId),
  }).from(eleveEnseignantTable).groupBy(eleveEnseignantTable.enseignantId);
  const countMap = new Map(counts.map(c => [c.enseignantId, Number(c.nb)]));

  res.json(rows.map(e => ({
    id: e.id,
    nom: e.nom,
    classe: e.classe,
    actif: e.actif,
    nb_eleves: countMap.get(e.id) || 0,
    created_at: e.createdAt.toISOString(),
  })));
});

router.post("/enseignants", async (req, res): Promise<void> => {
  const { nom, classe, actif } = req.body;
  if (!nom) { res.status(400).json({ error: "Le nom est requis" }); return; }

  const [existing] = await db.select().from(enseignantsTable).where(eq(enseignantsTable.nom, nom));
  if (existing) { res.status(409).json({ error: "TEACHER_NAME_TAKEN", message: "Ce nom d'enseignant est déjà utilisé" }); return; }

  const [e] = await db.insert(enseignantsTable).values({ nom, classe: classe || null, actif: actif !== false }).returning();
  res.status(201).json({ id: e.id, nom: e.nom, classe: e.classe, actif: e.actif, nb_eleves: 0, created_at: e.createdAt.toISOString() });
});

router.get("/enseignants/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [e] = await db.select().from(enseignantsTable).where(eq(enseignantsTable.id, id));
  if (!e) { res.status(404).json({ error: "Enseignant non trouvé" }); return; }

  const eleves = await db.select().from(eleveEnseignantTable)
    .leftJoin(participantsTable, eq(eleveEnseignantTable.eleveId, participantsTable.id))
    .where(eq(eleveEnseignantTable.enseignantId, id));

  const sessions = await db.select().from(presenceSessionsTable)
    .where(eq(presenceSessionsTable.enseignantId, id))
    .orderBy(desc(presenceSessionsTable.dateSession))
    .limit(10);

  const elevesFormatted = eleves.map(r => {
    const p = r.participants;
    if (!p) return null;
    const age = calcAge(p.dateNaissance);
    return {
      id: p.id,
      id_participant: `TG015400${String(p.numeroOrdre).padStart(3, "0")}`,
      numero_ordre: p.numeroOrdre,
      nom_prenoms: p.nomPrenoms,
      sexe: p.sexe,
      date_naissance: p.dateNaissance,
      age_decimal: age.decimal,
      age_annees: age.annees,
      age_clair: age.clair,
      programme: p.dateNaissance ? (age.decimal && age.decimal > 4 ? "CDSP" : "Survie") : null,
      tranche_age: null,
      electrophorese: p.electrophorese,
      groupe_sanguin: p.groupeSanguin,
      village: p.village,
      quartier: p.quartier,
      contact_participant: p.contactParticipant,
      date_depart_prevue: null,
      annees_restantes: null,
      enseignant: { id: e.id, nom: e.nom, classe: e.classe },
      etablissement: null,
      created_at: p.createdAt.toISOString(),
    };
  }).filter(Boolean);

  res.json({
    id: e.id,
    nom: e.nom,
    classe: e.classe,
    actif: e.actif,
    nb_eleves: elevesFormatted.length,
    created_at: e.createdAt.toISOString(),
    eleves: elevesFormatted,
    sessions_recentes: sessions.map(s => ({
      id: s.id,
      enseignant_id: s.enseignantId,
      enseignant_nom: e.nom,
      date_session: s.dateSession,
      note: s.note,
      nb_presents: 0,
      nb_absents: 0,
      created_at: s.createdAt.toISOString(),
    })),
  });
});

router.put("/enseignants/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [existing] = await db.select().from(enseignantsTable).where(eq(enseignantsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Enseignant non trouvé" }); return; }

  const { nom, classe, actif } = req.body;
  if (nom && nom !== existing.nom) {
    const [dup] = await db.select().from(enseignantsTable).where(eq(enseignantsTable.nom, nom));
    if (dup) { res.status(409).json({ error: "TEACHER_NAME_TAKEN" }); return; }
  }

  const [updated] = await db.update(enseignantsTable).set({
    nom: nom ?? existing.nom,
    classe: classe !== undefined ? classe : existing.classe,
    actif: actif !== undefined ? actif : existing.actif,
    updatedAt: new Date(),
  }).where(eq(enseignantsTable.id, id)).returning();

  res.json({ id: updated.id, nom: updated.nom, classe: updated.classe, actif: updated.actif, nb_eleves: 0, created_at: updated.createdAt.toISOString() });
});

router.delete("/enseignants/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [existing] = await db.select().from(enseignantsTable).where(eq(enseignantsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Enseignant non trouvé" }); return; }

  const [affCount] = await db.select({ nb: count() }).from(eleveEnseignantTable).where(eq(eleveEnseignantTable.enseignantId, id));
  if (Number(affCount.nb) > 0) {
    res.status(409).json({ error: "TEACHER_HAS_STUDENTS", message: "Veuillez désaffecter les élèves d'abord" });
    return;
  }

  await db.delete(enseignantsTable).where(eq(enseignantsTable.id, id));
  res.sendStatus(204);
});

export default router;
