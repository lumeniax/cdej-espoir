import { Router } from "express";
import { db, participantsTable, alertesAbsencesTable, enseignantsTable, transactionsTable, vaccinationsTable } from "@workspace/db";
import { eq, and, sql, desc, lt, gte, lte, isNull, not, inArray } from "drizzle-orm";

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

export default router;
