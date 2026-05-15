import { Router } from "express";
import { db, participantsTable, eleveEnseignantTable, eleveEtablissementTable, enseignantsTable, etablissementsTable, imcMeasuresTable, presencesTable, presenceSessionsTable } from "@workspace/db";
import { eq, ilike, and, sql, desc, asc, or } from "drizzle-orm";
import { requireNotViewer } from "../middlewares/requireRole";
import { logAudit } from "../lib/auditLog";

const router = Router();

function calcAge(dateNaissance: string | null) {
  if (!dateNaissance) return { decimal: null, annees: null, clair: null };
  const naissance = new Date(dateNaissance);
  const now = new Date();
  const diffMs = now.getTime() - naissance.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const decimal = Math.round(diffDays / 365.2425 * 100) / 100;
  const annees = Math.floor(decimal);
  const moisRestants = Math.floor((decimal - annees) * 12);
  const joursRestants = Math.floor(((decimal - annees) * 12 - moisRestants) * 30.44);
  const clair = `${annees} an${annees !== 1 ? "s" : ""} ${moisRestants} mois ${joursRestants} jours`;
  return { decimal, annees, clair };
}

function calcProgramme(dateNaissance: string | null) {
  if (!dateNaissance) return null;
  const { decimal } = calcAge(dateNaissance);
  if (decimal === null) return null;
  return decimal > 4 ? "CDSP" : "Survie";
}

function calcTranche(dateNaissance: string | null) {
  if (!dateNaissance) return null;
  const { decimal } = calcAge(dateNaissance);
  if (decimal === null) return null;
  if (decimal < 3) return "0-2 ans";
  if (decimal < 6) return "3-5 ans";
  if (decimal < 9) return "6-8 ans";
  if (decimal < 12) return "9-11 ans";
  if (decimal < 15) return "12-14 ans";
  if (decimal < 19) return "15-18 ans";
  if (decimal < 23) return "19-22 ans";
  return "23 ans et plus";
}

function calcDepartPrevue(dateNaissance: string | null) {
  if (!dateNaissance) return null;
  const d = new Date(dateNaissance);
  d.setFullYear(d.getFullYear() + 22);
  return d.toISOString().split("T")[0];
}

function calcAnneesRestantes(dateNaissance: string | null) {
  const depart = calcDepartPrevue(dateNaissance);
  if (!depart) return null;
  const diffMs = new Date(depart).getTime() - new Date().getTime();
  return Math.round(diffMs / (365.2425 * 24 * 60 * 60 * 1000));
}

function formatParticipant(
  p: typeof participantsTable.$inferSelect,
  enseignant?: { id: number; nom: string; classe?: string | null } | null,
  etablissement?: { id: number; nom: string } | null,
) {
  const age = calcAge(p.dateNaissance);
  const dateDepartPrevue = calcDepartPrevue(p.dateNaissance);
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
    programme: calcProgramme(p.dateNaissance),
    tranche_age: calcTranche(p.dateNaissance),
    electrophorese: p.electrophorese,
    groupe_sanguin: p.groupeSanguin,
    village: p.village,
    quartier: p.quartier,
    contact_participant: p.contactParticipant,
    eglise_participant: p.egliseParticipant,
    date_bapteme: p.dateBapteme,
    classe: p.classe,
    vit_chez: p.vitChez,
    contact_tuteur: p.contactTuteur,
    religion_tuteur: p.religionTuteur,
    situation_familiale: p.situationFamiliale,
    pere_vivant: p.pereVivant,
    mere_vivante: p.mereVivante,
    date_depart_prevue: dateDepartPrevue,
    date_depart_effective: p.dateDepartEffective,
    transfert: p.transfert,
    annees_restantes: calcAnneesRestantes(p.dateNaissance),
    enseignant: enseignant ?? null,
    etablissement: etablissement ?? null,
    created_at: p.createdAt.toISOString(),
  };
}

router.get("/participants", async (req, res): Promise<void> => {
  const {
    q, sexe, village, programme, tranche, electrophorese, groupe_sanguin, enseignant_id,
    page = "1", page_size = "50",
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSz = Math.min(200, parseInt(page_size, 10) || 50);

  const conditions = [];

  if (sexe) conditions.push(eq(participantsTable.sexe, sexe));
  if (village) conditions.push(eq(participantsTable.village, village));
  if (electrophorese) conditions.push(eq(participantsTable.electrophorese, electrophorese));
  if (groupe_sanguin) conditions.push(eq(participantsTable.groupeSanguin, groupe_sanguin));

  if (q) {
    conditions.push(
      or(
        ilike(participantsTable.nomPrenoms, `%${q}%`),
        ilike(participantsTable.village, `%${q}%`),
        ilike(participantsTable.contactParticipant, `%${q}%`),
        ilike(participantsTable.classe, `%${q}%`),
      )!,
    );
  }

  // Load all matching participants (we still need JS for computed age-based filters)
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  let all = await db
    .select()
    .from(participantsTable)
    .where(whereClause)
    .orderBy(asc(participantsTable.numeroOrdre));

  // Only JS-filter for age-computed fields that can't easily be expressed in SQL
  if (programme || tranche) {
    all = all.filter((p) => {
      if (programme && calcProgramme(p.dateNaissance) !== programme) return false;
      if (tranche && calcTranche(p.dateNaissance) !== tranche) return false;
      return true;
    });
  }

  // Load affectations for filtered result set
  const ids = all.map((p) => p.id);

  let ensMap = new Map<number, { id: number; nom: string; classe: string | null }>();
  let etsMap = new Map<number, { id: number; nom: string }>();

  if (ids.length > 0) {
    const affEns = await db
      .select({
        eleveId: eleveEnseignantTable.eleveId,
        enseignantId: eleveEnseignantTable.enseignantId,
        nom: enseignantsTable.nom,
        classe: enseignantsTable.classe,
      })
      .from(eleveEnseignantTable)
      .leftJoin(enseignantsTable, eq(eleveEnseignantTable.enseignantId, enseignantsTable.id));

    const affEts = await db
      .select({
        eleveId: eleveEtablissementTable.eleveId,
        etablissementId: eleveEtablissementTable.etablissementId,
        nom: etablissementsTable.nom,
      })
      .from(eleveEtablissementTable)
      .leftJoin(etablissementsTable, eq(eleveEtablissementTable.etablissementId, etablissementsTable.id));

    ensMap = new Map(affEns.map((a) => [a.eleveId, { id: a.enseignantId, nom: a.nom!, classe: a.classe ?? null }]));
    etsMap = new Map(affEts.map((a) => [a.eleveId, { id: a.etablissementId, nom: a.nom! }]));
  }

  let filtered = all;
  if (enseignant_id) {
    const eid = parseInt(enseignant_id, 10);
    filtered = filtered.filter((p) => ensMap.get(p.id)?.id === eid);
  }

  const total = filtered.length;
  const items = filtered.slice((pageNum - 1) * pageSz, pageNum * pageSz);

  res.json({
    items: items.map((p) => formatParticipant(p, ensMap.get(p.id), etsMap.get(p.id))),
    total,
    page: pageNum,
    page_size: pageSz,
  });
});

router.post("/participants", requireNotViewer, async (req, res): Promise<void> => {
  const body = req.body;
  if (!body.nom_prenoms || !body.sexe) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "nom_prenoms et sexe requis" } });
    return;
  }
  if (!["M", "F"].includes(body.sexe)) {
    res.status(422).json({ error: { code: "VALIDATION_ERROR", message: "sexe doit être M ou F" } });
    return;
  }

  const [maxRow] = await db
    .select({ max: sql<number>`COALESCE(MAX(numero_ordre), 0)` })
    .from(participantsTable);
  const nextOrdre = (maxRow.max || 0) + 1;

  const [p] = await db
    .insert(participantsTable)
    .values({
      numeroOrdre: nextOrdre,
      nomPrenoms: body.nom_prenoms,
      sexe: body.sexe,
      dateNaissance: body.date_naissance || null,
      electrophorese: body.electrophorese || null,
      groupeSanguin: body.groupe_sanguin || null,
      village: body.village || null,
      quartier: body.quartier || null,
      contactParticipant: body.contact_participant || null,
      egliseParticipant: body.eglise_participant || null,
      dateBapteme: body.date_bapteme || null,
      classe: body.classe || null,
      vitChez: body.vit_chez || null,
      contactTuteur: body.contact_tuteur || null,
      religionTuteur: body.religion_tuteur || null,
      situationFamiliale: body.situation_familiale || null,
      pereVivant: body.pere_vivant ?? null,
      mereVivante: body.mere_vivante ?? null,
      dateDepartEffective: body.date_depart_effective || null,
      transfert: body.transfert || null,
    })
    .returning();

  await logAudit(req, {
    action: "create_participant",
    entityType: "participant",
    entityId: String(p.id),
    newValue: { nom_prenoms: p.nomPrenoms, sexe: p.sexe },
  });

  res.status(201).json(formatParticipant(p));
});

router.get("/participants/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [p] = await db.select().from(participantsTable).where(eq(participantsTable.id, id));
  if (!p) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Participant non trouvé" } });
    return;
  }

  const [affEn] = await db
    .select({ id: enseignantsTable.id, nom: enseignantsTable.nom, classe: enseignantsTable.classe })
    .from(eleveEnseignantTable)
    .leftJoin(enseignantsTable, eq(eleveEnseignantTable.enseignantId, enseignantsTable.id))
    .where(eq(eleveEnseignantTable.eleveId, id));

  const [affEt] = await db
    .select({ id: etablissementsTable.id, nom: etablissementsTable.nom })
    .from(eleveEtablissementTable)
    .leftJoin(etablissementsTable, eq(eleveEtablissementTable.etablissementId, etablissementsTable.id))
    .where(eq(eleveEtablissementTable.eleveId, id));

  const imcRecents = await db
    .select()
    .from(imcMeasuresTable)
    .where(eq(imcMeasuresTable.participantId, id))
    .orderBy(desc(imcMeasuresTable.dateMesure))
    .limit(5);

  const presencesRecentes = await db
    .select({
      dateSession: presenceSessionsTable.dateSession,
      statut: presencesTable.statut,
      enseignantId: presenceSessionsTable.enseignantId,
      enseignantNom: enseignantsTable.nom,
    })
    .from(presencesTable)
    .leftJoin(presenceSessionsTable, eq(presencesTable.sessionId, presenceSessionsTable.id))
    .leftJoin(enseignantsTable, eq(presenceSessionsTable.enseignantId, enseignantsTable.id))
    .where(eq(presencesTable.eleveId, id))
    .orderBy(desc(presenceSessionsTable.dateSession))
    .limit(20);

  const base = formatParticipant(
    p,
    affEn ? { id: affEn.id!, nom: affEn.nom!, classe: affEn.classe } : null,
    affEt ? { id: affEt.id!, nom: affEt.nom! } : null,
  );

  res.json({
    ...base,
    imc_recents: imcRecents.map((m) => ({
      id: m.id,
      participant_id: m.participantId,
      date_mesure: m.dateMesure,
      poids_kg: parseFloat(m.poidsKg as string),
      taille_cm: parseFloat(m.tailleCm as string),
      imc: m.imc ? parseFloat(m.imc as string) : 0,
      classification: m.classification || "",
      action_recommandee: m.actionRecommandee,
      note: m.note,
      created_at: m.createdAt.toISOString(),
    })),
    presences_recentes: presencesRecentes.map((pr) => ({
      date_session: pr.dateSession,
      statut: pr.statut,
      enseignant_nom: pr.enseignantNom,
    })),
  });
});

router.put("/participants/:id", requireNotViewer, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const body = req.body;
  const [existing] = await db.select().from(participantsTable).where(eq(participantsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Participant non trouvé" } });
    return;
  }

  const [updated] = await db
    .update(participantsTable)
    .set({
      nomPrenoms: body.nom_prenoms ?? existing.nomPrenoms,
      sexe: body.sexe ?? existing.sexe,
      dateNaissance: body.date_naissance !== undefined ? body.date_naissance : existing.dateNaissance,
      electrophorese: body.electrophorese !== undefined ? body.electrophorese : existing.electrophorese,
      groupeSanguin: body.groupe_sanguin !== undefined ? body.groupe_sanguin : existing.groupeSanguin,
      village: body.village !== undefined ? body.village : existing.village,
      quartier: body.quartier !== undefined ? body.quartier : existing.quartier,
      contactParticipant: body.contact_participant !== undefined ? body.contact_participant : existing.contactParticipant,
      egliseParticipant: body.eglise_participant !== undefined ? body.eglise_participant : existing.egliseParticipant,
      dateBapteme: body.date_bapteme !== undefined ? body.date_bapteme : existing.dateBapteme,
      classe: body.classe !== undefined ? body.classe : existing.classe,
      vitChez: body.vit_chez !== undefined ? body.vit_chez : existing.vitChez,
      contactTuteur: body.contact_tuteur !== undefined ? body.contact_tuteur : existing.contactTuteur,
      religionTuteur: body.religion_tuteur !== undefined ? body.religion_tuteur : existing.religionTuteur,
      situationFamiliale: body.situation_familiale !== undefined ? body.situation_familiale : existing.situationFamiliale,
      pereVivant: body.pere_vivant !== undefined ? body.pere_vivant : existing.pereVivant,
      mereVivante: body.mere_vivante !== undefined ? body.mere_vivante : existing.mereVivante,
      dateDepartEffective: body.date_depart_effective !== undefined ? body.date_depart_effective : existing.dateDepartEffective,
      transfert: body.transfert !== undefined ? body.transfert : existing.transfert,
      updatedAt: new Date(),
    })
    .where(eq(participantsTable.id, id))
    .returning();

  await logAudit(req, {
    action: "update_participant",
    entityType: "participant",
    entityId: String(id),
    oldValue: { nom_prenoms: existing.nomPrenoms },
    newValue: { nom_prenoms: updated.nomPrenoms },
  });

  res.json(formatParticipant(updated));
});

router.delete("/participants/:id", requireNotViewer, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [existing] = await db.select().from(participantsTable).where(eq(participantsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Participant non trouvé" } });
    return;
  }
  await db.delete(participantsTable).where(eq(participantsTable.id, id));
  await logAudit(req, {
    action: "delete_participant",
    entityType: "participant",
    entityId: String(id),
    oldValue: { nom_prenoms: existing.nomPrenoms },
  });
  res.sendStatus(204);
});

export default router;
