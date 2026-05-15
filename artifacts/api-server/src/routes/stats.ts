import { Router } from "express";
import { db, participantsTable, alertesAbsencesTable, enseignantsTable, transactionsTable, vaccinationsTable, presenceSessionsTable, presencesTable, santeMesuresTable, bulletinsTable } from "@workspace/db";
import { eq, and, sql, desc, lt, gte, lte, isNull, not, inArray, between, count, avg } from "drizzle-orm";

const router = Router();

function calcAge(dateNaissance: string | null) {
  if (!dateNaissance) return null;
  const diffMs = new Date().getTime() - new Date(dateNaissance).getTime();
  return Math.round(diffMs / (365.2425 * 24 * 60 * 60 * 1000) * 100) / 100;
}

function calcTranche(dateNaissance: string | null): string | null {
  const age = calcAge(dateNaissance);
  if (age === null) return null;
  if (age < 3) return "0-2 ans";
  if (age < 6) return "3-5 ans";
  if (age < 9) return "6-8 ans";
  if (age < 12) return "9-11 ans";
  if (age < 15) return "12-14 ans";
  if (age < 19) return "15-18 ans";
  if (age < 23) return "19-22 ans";
  return "23 ans et plus";
}

router.get("/stats/dashboard", async (_req, res): Promise<void> => {
  const [all, alertes, vaccins, depensesMois] = await Promise.all([
    db.select().from(participantsTable),
    db.select({
      alerte: alertesAbsencesTable,
      eleveNom: participantsTable.nomPrenoms,
      enseignantNom: enseignantsTable.nom,
    }).from(alertesAbsencesTable)
      .leftJoin(participantsTable, eq(alertesAbsencesTable.eleveId, participantsTable.id))
      .leftJoin(enseignantsTable, eq(alertesAbsencesTable.enseignantId, enseignantsTable.id))
      .where(eq(alertesAbsencesTable.resolue, false)),
    db.select().from(vaccinationsTable).where(
      and(
        not(isNull(vaccinationsTable.dateProchainesDose)),
        lte(vaccinationsTable.dateProchainesDose, new Date().toISOString().split("T")[0])
      )
    ).limit(20),
    db.select({ total: sql<number>`cast(sum(montant) as numeric(12,2))` })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.type, "depense"),
          gte(transactionsTable.date, new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0])
        )
      ),
  ]);

  const actifs = all.filter(p => (p.statut || "actif") === "actif");
  const tranches: Record<string, number> = {};
  const sexe: Record<string, number> = {};
  const programme: Record<string, number> = {};
  const parStatut: Record<string, number> = {};
  const parVillage: Record<string, number> = {};
  const electrophorese: Record<string, number> = {};
  const groupage: Record<string, number> = {};

  const today = new Date();
  const anniversairesProchains: { nom: string; date: string; jours: number }[] = [];
  const departsProchains: { nom: string; id_fmt: string; date: string; jours: number }[] = [];

  let ageMax: { valeur: number; participant: string } | null = null;
  let ageMin: { valeur: number; participant: string } | null = null;

  for (const p of all) {
    const age = calcAge(p.dateNaissance);
    const tranche = calcTranche(p.dateNaissance);
    const statut = p.statut || "actif";

    if (tranche) tranches[tranche] = (tranches[tranche] || 0) + 1;
    if (p.sexe) sexe[p.sexe] = (sexe[p.sexe] || 0) + 1;
    parStatut[statut] = (parStatut[statut] || 0) + 1;
    if (p.village) parVillage[p.village] = (parVillage[p.village] || 0) + 1;

    if (age !== null) {
      const prog = age > 4 ? "CDSP" : "Survie";
      programme[prog] = (programme[prog] || 0) + 1;
      if (!ageMax || age > ageMax.valeur) ageMax = { valeur: age, participant: p.nomPrenoms };
      if (!ageMin || age < ageMin.valeur) ageMin = { valeur: age, participant: p.nomPrenoms };
    }

    if (p.electrophorese) electrophorese[p.electrophorese] = (electrophorese[p.electrophorese] || 0) + 1;
    if (p.groupeSanguin) groupage[p.groupeSanguin] = (groupage[p.groupeSanguin] || 0) + 1;

    if (p.dateNaissance) {
      const naissance = new Date(p.dateNaissance);
      const anniversaireCetteAnnee = new Date(today.getFullYear(), naissance.getMonth(), naissance.getDate());
      const diff = Math.ceil((anniversaireCetteAnnee.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff <= 14) {
        anniversairesProchains.push({ nom: p.nomPrenoms, date: p.dateNaissance, jours: diff });
      }

      const departDate = new Date(naissance);
      departDate.setFullYear(departDate.getFullYear() + 22);
      const daysUntilDepart = Math.ceil((departDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilDepart >= 0 && daysUntilDepart <= 90) {
        departsProchains.push({
          nom: p.nomPrenoms,
          id_fmt: `TG015400${String(p.numeroOrdre).padStart(3, "0")}`,
          date: departDate.toISOString().split("T")[0],
          jours: daysUntilDepart,
        });
      }
    }
  }

  const trancheOrder = ["0-2 ans", "3-5 ans", "6-8 ans", "9-11 ans", "12-14 ans", "15-18 ans", "19-22 ans", "23 ans et plus"];
  const tranches_age = trancheOrder.map(t => ({ tranche: t, nb: tranches[t] || 0 }));

  const parVillageArr = Object.entries(parVillage)
    .map(([village, nb]) => ({ village, nb }))
    .sort((a, b) => b.nb - a.nb)
    .slice(0, 10);

  const alertesSS = all.filter(p => ["SS", "SC"].includes(p.electrophorese || "")).map(p => ({
    nom: p.nomPrenoms,
    electrophorese: p.electrophorese,
  }));

  res.json({
    total_participants: all.length,
    participants_actifs: actifs.length,
    tranches_age,
    sexe,
    programme,
    par_statut: parStatut,
    par_village: parVillageArr,
    electrophorese,
    groupage,
    age_max: ageMax,
    age_min: ageMin,
    alertes_absences: alertes.map(a => ({
      eleve: a.eleveNom || "",
      enseignant: a.enseignantNom || "",
      nb_absences: a.alerte.nbAbsences,
    })),
    nb_alertes_non_resolues: alertes.length,
    vaccins_en_retard: vaccins.length,
    anniversaires_prochains: anniversairesProchains.slice(0, 10),
    departs_prochains: departsProchains.slice(0, 10),
    alertes_sante_electro: alertesSS,
    depenses_mois: depensesMois[0]?.total ? parseFloat(String(depensesMois[0].total)) : 0,
  });
});

router.get("/stats/depart-imminent", async (_req, res): Promise<void> => {
  const all = await db.select().from(participantsTable);
  const imminents = all.filter(p => {
    if (!p.dateNaissance) return false;
    const depart = new Date(p.dateNaissance);
    depart.setFullYear(depart.getFullYear() + 22);
    const yearsLeft = Math.round((depart.getTime() - new Date().getTime()) / (365.2425 * 24 * 60 * 60 * 1000));
    return yearsLeft <= 2 && yearsLeft >= 0;
  });

  res.json(imminents.map(p => {
    const age = calcAge(p.dateNaissance);
    const depart = p.dateNaissance ? new Date(p.dateNaissance) : null;
    if (depart) depart.setFullYear(depart.getFullYear() + 22);
    return {
      id: p.id,
      id_participant: `TG015400${String(p.numeroOrdre).padStart(3, "0")}`,
      numero_ordre: p.numeroOrdre,
      nom_prenoms: p.nomPrenoms,
      sexe: p.sexe,
      date_naissance: p.dateNaissance,
      age_decimal: age,
      age_annees: age ? Math.floor(age) : null,
      programme: age && age > 4 ? "CDSP" : "Survie",
      tranche_age: calcTranche(p.dateNaissance),
      electrophorese: p.electrophorese,
      groupe_sanguin: p.groupeSanguin,
      village: p.village,
      quartier: p.quartier,
      date_depart_prevue: depart?.toISOString().split("T")[0] ?? null,
      statut: p.statut,
      created_at: p.createdAt.toISOString(),
    };
  }));
});

const MOIS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

router.get("/stats/rapport-mensuel", async (req, res): Promise<void> => {
  const now = new Date();
  const year = parseInt(String(req.query.year)) || now.getFullYear();
  const month = parseInt(String(req.query.month)) || (now.getMonth() + 1);

  const firstDay = `${year}-${String(month).padStart(2,"0")}-01`;
  const lastDayDate = new Date(year, month, 0);
  const lastDay = `${year}-${String(month).padStart(2,"0")}-${String(lastDayDate.getDate()).padStart(2,"0")}`;

  const [sessions, nouveaux, transactions, alertesNonResolues, vaccins] = await Promise.all([
    db.select({
      id: presenceSessionsTable.id,
      dateSession: presenceSessionsTable.dateSession,
    }).from(presenceSessionsTable)
      .where(between(presenceSessionsTable.dateSession, firstDay, lastDay)),

    db.select({ id: participantsTable.id, nomPrenoms: participantsTable.nomPrenoms })
      .from(participantsTable)
      .where(between(
        sql`date(${participantsTable.createdAt})`,
        sql`${firstDay}::date`,
        sql`${lastDay}::date`
      )),

    db.select({
      type: transactionsTable.type,
      total: sql<string>`cast(sum(${transactionsTable.montant}) as numeric(14,2))`,
      nb: count(),
    }).from(transactionsTable)
      .where(between(transactionsTable.date, firstDay, lastDay))
      .groupBy(transactionsTable.type),

    db.select({ nb: count() }).from(alertesAbsencesTable)
      .where(eq(alertesAbsencesTable.resolue, false)),

    db.select({ nb: count() }).from(vaccinationsTable)
      .where(
        and(
          not(isNull(vaccinationsTable.dateProchainesDose)),
          lte(vaccinationsTable.dateProchainesDose, lastDay)
        )
      ),
  ]);

  const sessionIds = sessions.map(s => s.id);
  let presenceStats: { total_presents: number; total_absents: number; taux_moyen: number } = {
    total_presents: 0,
    total_absents: 0,
    taux_moyen: 0,
  };

  if (sessionIds.length > 0) {
    const rows = await db.select({
      statut: presencesTable.statut,
      nb: count(),
    }).from(presencesTable)
      .where(inArray(presencesTable.sessionId, sessionIds))
      .groupBy(presencesTable.statut);

    let presents = 0, absents = 0;
    for (const r of rows) {
      if (r.statut === "P") presents += Number(r.nb);
      else absents += Number(r.nb);
    }
    const total = presents + absents;
    presenceStats = {
      total_presents: presents,
      total_absents: absents,
      taux_moyen: total > 0 ? Math.round((presents / total) * 100) : 0,
    };
  }

  const recettes = transactions.find(t => t.type === "recette");
  const depenses = transactions.find(t => t.type === "depense");
  const recettesMontant = recettes ? parseFloat(recettes.total ?? "0") : 0;
  const depensesMontant = depenses ? parseFloat(depenses.total ?? "0") : 0;

  const [allParticipants] = await Promise.all([
    db.select({ id: participantsTable.id, statut: participantsTable.statut }).from(participantsTable),
  ]);
  const actifs = allParticipants.filter(p => (p.statut || "actif") === "actif").length;

  res.json({
    periode: {
      year,
      month,
      label: `${MOIS_FR[month - 1]} ${year}`,
      firstDay,
      lastDay,
    },
    presences: {
      nb_sessions: sessions.length,
      total_presents: presenceStats.total_presents,
      total_absents: presenceStats.total_absents,
      taux_moyen: presenceStats.taux_moyen,
    },
    participants: {
      total: allParticipants.length,
      actifs,
      nouveaux: nouveaux.length,
      nouveaux_liste: nouveaux.map(p => p.nomPrenoms),
    },
    finances: {
      recettes: recettesMontant,
      depenses: depensesMontant,
      solde: recettesMontant - depensesMontant,
      nb_transactions: (recettes ? Number(recettes.nb) : 0) + (depenses ? Number(depenses.nb) : 0),
    },
    alertes: {
      absences_non_resolues: Number(alertesNonResolues[0]?.nb ?? 0),
      vaccins_en_retard: Number(vaccins[0]?.nb ?? 0),
    },
  });
});

// ---------------------------------------------------------------------------
// Rapport individuel participant
// ---------------------------------------------------------------------------
const MOIS_FR_SHORT = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const MOIS_FR_LONG  = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

function anneeScolaire(year: number, month: number): string {
  return month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

router.get("/stats/rapport-participant", async (req, res): Promise<void> => {
  const participantId = req.query.participant_id ? parseInt(req.query.participant_id as string, 10) : null;
  const year  = req.query.year  ? parseInt(req.query.year  as string, 10) : new Date().getFullYear();
  const month = req.query.month ? parseInt(req.query.month as string, 10) : new Date().getMonth() + 1;

  if (!participantId || isNaN(participantId)) {
    res.status(400).json({ error: "participant_id requis" });
    return;
  }

  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDayDate = new Date(year, month, 0);
  const lastDay = `${year}-${String(month).padStart(2, "0")}-${String(lastDayDate.getDate()).padStart(2, "0")}`;

  const [participant, sessions, mesures, vaccins, bulletins] = await Promise.all([
    db.select().from(participantsTable).where(eq(participantsTable.id, participantId)).limit(1),

    // Sessions dans le mois avec statut du participant
    db.select({
      sessionId: presenceSessionsTable.id,
      dateSession: presenceSessionsTable.dateSession,
      enseignantId: enseignantsTable.id,
      enseignantNom: enseignantsTable.nom,
      statut: presencesTable.statut,
      motif: presencesTable.motif,
    }).from(presenceSessionsTable)
      .leftJoin(enseignantsTable, eq(presenceSessionsTable.enseignantId, enseignantsTable.id))
      .leftJoin(presencesTable, and(
        eq(presencesTable.sessionId, presenceSessionsTable.id),
        eq(presencesTable.eleveId, participantId),
      ))
      .where(and(
        gte(presenceSessionsTable.dateSession, firstDay),
        lte(presenceSessionsTable.dateSession, lastDay),
      ))
      .orderBy(presenceSessionsTable.dateSession),

    // Toutes les mesures de santé pour le participant, récentes en premier
    db.select().from(santeMesuresTable)
      .where(eq(santeMesuresTable.participantId, participantId))
      .orderBy(desc(santeMesuresTable.dateMesure))
      .limit(10),

    // Vaccinations
    db.select().from(vaccinationsTable)
      .where(eq(vaccinationsTable.participantId, participantId))
      .orderBy(vaccinationsTable.vaccin),

    // Bulletins pour l'année scolaire correspondant au mois
    db.select().from(bulletinsTable)
      .where(and(
        eq(bulletinsTable.participantId, participantId),
        eq(bulletinsTable.anneeScolaire, anneeScolaire(year, month)),
      ))
      .orderBy(bulletinsTable.trimestre),
  ]);

  if (!participant[0]) {
    res.status(404).json({ error: "Participant non trouvé" });
    return;
  }

  const p = participant[0];
  const age = calcAge(p.dateNaissance);

  // Présences du mois
  type SessionRow = typeof sessions[number];
  const nbPresent = sessions.filter((s: SessionRow) => s.statut === "P").length;
  const nbAbsent  = sessions.filter((s: SessionRow) => s.statut === "A").length;
  const nbRetard  = sessions.filter((s: SessionRow) => s.statut === "R").length;
  const nbTotal   = sessions.length;
  const taux = nbTotal > 0 ? Math.round((nbPresent / nbTotal) * 100) : null;

  // Santé : dernière mesure (peut être hors du mois)
  const derniereMesure = mesures[0] ?? null;
  const today = new Date().toISOString().slice(0, 10);
  type VaccinRow = typeof vaccins[number];
  const vaccinsFormates = vaccins.map((v: VaccinRow) => ({
    vaccin: v.vaccin,
    date_administration: v.dateAdministration,
    date_prochaine_dose: v.dateProchainesDose,
    en_retard: v.dateProchainesDose ? v.dateProchainesDose < today : false,
  }));

  const annee = anneeScolaire(year, month);
  type BulletinRow = typeof bulletins[number];
  const bulletinsFormates = bulletins.map((b: BulletinRow) => ({
    trimestre: b.trimestre,
    ecole: b.ecole,
    classe: b.classe,
    moyenne: b.moyenne ? parseFloat(String(b.moyenne)) : null,
    rang: b.rang,
    total_eleves: b.totalEleves,
    appreciation: b.appreciation,
    observation: b.observation,
  }));

  const moyenneAnnuelle = bulletinsFormates.filter(b => b.moyenne !== null).length > 0
    ? Math.round(bulletinsFormates.reduce((acc, b) => acc + (b.moyenne ?? 0), 0) / bulletinsFormates.filter(b => b.moyenne !== null).length * 100) / 100
    : null;

  res.json({
    participant: {
      id: p.id,
      numero: `TG015400${String(p.numeroOrdre).padStart(3, "0")}`,
      nom_prenoms: p.nomPrenoms,
      date_naissance: p.dateNaissance,
      age: age !== null ? Math.floor(age) : null,
      niveau_scolaire: p.niveauScolaire,
      classe: p.classe,
      ecole: p.ecole,
      statut: p.statut,
      electrophorese: p.electrophorese,
    },
    periode: {
      year,
      month,
      label: `${MOIS_FR_LONG[month - 1]} ${year}`,
      abbr: `${MOIS_FR_SHORT[month - 1]} ${year}`,
      firstDay,
      lastDay,
    },
    presences: {
      sessions: sessions.map((s: SessionRow) => ({
        date: s.dateSession,
        enseignant: s.enseignantNom,
        statut: s.statut ?? "—",
        motif: s.motif,
      })),
      nb_present: nbPresent,
      nb_absent: nbAbsent,
      nb_retard: nbRetard,
      nb_total: nbTotal,
      taux,
    },
    sante: {
      derniere_mesure: derniereMesure ? {
        date: derniereMesure.dateMesure,
        poids_kg: derniereMesure.poidsKg ? parseFloat(String(derniereMesure.poidsKg)) : null,
        taille_cm: derniereMesure.tailleCm ? parseFloat(String(derniereMesure.tailleCm)) : null,
        imc: derniereMesure.imc ? parseFloat(String(derniereMesure.imc)) : null,
        classification: derniereMesure.imcClassification,
        etat_nutritionnel: derniereMesure.etatNutritioNnel,
      } : null,
      vaccinations: vaccinsFormates,
    },
    scolarite: {
      annee_scolaire: annee,
      bulletins: bulletinsFormates,
      moyenne_annuelle: moyenneAnnuelle,
    },
  });
});

export default router;
